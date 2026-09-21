const { pool } = require("../config/db");

/*
|--------------------------------------------------------------------------
| Lecturer Dashboard
|--------------------------------------------------------------------------
| يرجع الإحصائيات الخاصة بالدكتور المسجل دخوله فقط.
|--------------------------------------------------------------------------
*/

async function getDashboardStats(req, res) {
  try {
    const lecturerId =
      req.user?.id || req.user?.userId;

    if (!lecturerId) {
      return res.status(401).json({
        message: "Lecturer authentication data not found",
      });
    }

    // ============================================================
    // Get lecturer information
    // ============================================================

    const [lecturerRows] = await pool.query(
      `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email
      FROM users u
      WHERE u.id = ?
      LIMIT 1
      `,
      [lecturerId]
    );

    if (!lecturerRows.length) {
      return res.status(404).json({
        message: "Lecturer not found",
      });
    }

    const lecturer = lecturerRows[0];

    // ============================================================
    // Total Sections
    // ============================================================

    const [[sections]] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM sections
      WHERE lecturer_id = ?
      `,
      [lecturerId]
    );

    // ============================================================
    // Total Courses
    // ============================================================

    const [[courses]] = await pool.query(
      `
      SELECT COUNT(DISTINCT course_id) AS total
      FROM sections
      WHERE lecturer_id = ?
      `,
      [lecturerId]
    );

    // ============================================================
    // Total Students
    // ============================================================

    const [[students]] = await pool.query(
      `
      SELECT COUNT(DISTINCT e.student_id) AS total
      FROM enrollments e
      INNER JOIN sections s
        ON s.id = e.section_id
      WHERE s.lecturer_id = ?
        AND e.status = 'active'
      `,
      [lecturerId]
    );

    // ============================================================
    // Total Sessions
    // ============================================================

    const [[sessions]] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM attendance_sessions
      WHERE opened_by = ?
      `,
      [lecturerId]
    );

    // ============================================================
    // Active Sessions
    // ============================================================

    const [[activeSessions]] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM attendance_sessions
      WHERE opened_by = ?
        AND status = 'active'
      `,
      [lecturerId]
    );

    // ============================================================
    // Closed Sessions
    // ============================================================

    const [[closedSessions]] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM attendance_sessions
      WHERE opened_by = ?
        AND status = 'closed'
      `,
      [lecturerId]
    );

    // ============================================================
    // Attendance Events
    // ============================================================

    const [[attendanceEvents]] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM attendance_events ae
      INNER JOIN attendance_sessions s
        ON s.id = ae.session_id
      WHERE s.opened_by = ?
        AND ae.validation_status = 'accepted'
      `,
      [lecturerId]
    );

    // ============================================================
    // Present
    // ============================================================

    const [[present]] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM attendance_events ae
      INNER JOIN attendance_sessions s
        ON s.id = ae.session_id
      WHERE s.opened_by = ?
        AND ae.validation_status = 'accepted'
        AND ae.status = 'present'
      `,
      [lecturerId]
    );

    // ============================================================
    // Late
    // ============================================================

    const [[late]] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM attendance_events ae
      INNER JOIN attendance_sessions s
        ON s.id = ae.session_id
      WHERE s.opened_by = ?
        AND ae.validation_status = 'accepted'
        AND ae.status = 'late'
      `,
      [lecturerId]
    );

    // ============================================================
    // Absent
    // ============================================================

    const [[absent]] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM attendance_events ae
      INNER JOIN attendance_sessions s
        ON s.id = ae.session_id
      WHERE s.opened_by = ?
        AND ae.status = 'absent'
      `,
      [lecturerId]
    );

    // ============================================================
    // Excused
    // ============================================================

    const [[excused]] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM attendance_events ae
      INNER JOIN attendance_sessions s
        ON s.id = ae.session_id
      WHERE s.opened_by = ?
        AND ae.status = 'excused'
      `,
      [lecturerId]
    );

    // ============================================================
    // Correction Requests
    // ============================================================

    let correctionRequests = 0;

    try {
      const [[corrections]] = await pool.query(
        `
        SELECT COUNT(*) AS total
        FROM correction_requests cr
        INNER JOIN attendance_events ae
          ON ae.id = cr.attendance_event_id
        INNER JOIN attendance_sessions s
          ON s.id = ae.session_id
        WHERE s.opened_by = ?
          AND cr.status = 'pending'
        `,
        [lecturerId]
      );

      correctionRequests = corrections.total || 0;
    } catch (error) {
      // لو جدول correction_requests مختلف أو غير موجود
      // لا نوقف الـ Dashboard كله.
      correctionRequests = 0;
    }

    // ============================================================
    // Attendance Percentage
    // ============================================================

    const totalPresent =
      Number(present.total || 0) +
      Number(late.total || 0);

    const totalAttendance =
      totalPresent +
      Number(absent.total || 0) +
      Number(excused.total || 0);

    const attendancePercentage =
      totalAttendance > 0
        ? Number(
            (
              (totalPresent /
                totalAttendance) *
              100
            ).toFixed(2)
          )
        : 0;

    // ============================================================
    // Response
    // ============================================================

    return res.json({
      success: true,

      lecturer: {
        id: lecturer.id,
        firstName: lecturer.first_name,
        lastName: lecturer.last_name,
        email: lecturer.email,
        name: `${lecturer.first_name || ""} ${
          lecturer.last_name || ""
        }`.trim(),
      },

      stats: {
        totalSections:
          Number(sections.total) || 0,

        totalCourses:
          Number(courses.total) || 0,

        totalStudents:
          Number(students.total) || 0,

        totalSessions:
          Number(sessions.total) || 0,

        activeSessions:
          Number(activeSessions.total) || 0,

        closedSessions:
          Number(closedSessions.total) || 0,

        attendanceEvents:
          Number(attendanceEvents.total) || 0,

        present:
          Number(present.total) || 0,

        late:
          Number(late.total) || 0,

        absent:
          Number(absent.total) || 0,

        excused:
          Number(excused.total) || 0,

        attendancePercentage,

        correctionRequests,
      },
    });
  } catch (error) {
    console.error(
      "Lecturer dashboard error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to load lecturer dashboard",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
}

module.exports = {
  getDashboardStats,
};