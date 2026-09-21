const { pool } = require("../config/db");

// ============================================================
// GET CURRENT USER ID
// ============================================================

function getUserId(req) {
  return req.user?.id || req.user?.userId || null;
}

// ============================================================
// GET USER ROLE
// ============================================================

function getUserRole(req) {
  return String(
    req.user?.role ||
    req.user?.role_name ||
    ""
  )
    .toLowerCase()
    .trim();
}

// ============================================================
// ATTENDANCE SUMMARY
//
// Lecturer => Only his sections
// Admin    => All attendance
//
// Supported filters:
// ?sectionId=1
// ?fromDate=2026-09-01
// ?toDate=2026-09-30
// ============================================================

async function attendanceSummary(req, res) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const role = getUserRole(req);
    const isAdmin = role === "admin";

    const {
      sectionId,
      fromDate,
      toDate,
    } = req.query;

    const conditions = [];
    const params = [];

    // ========================================================
    // LECTURER SECURITY
    // Lecturer can only see his own sections
    // ========================================================

    if (!isAdmin) {
      conditions.push("sec.lecturer_id = ?");
      params.push(userId);
    }

    // ========================================================
    // SECTION FILTER
    // ========================================================

    if (
      sectionId !== undefined &&
      sectionId !== null &&
      String(sectionId).trim() !== ""
    ) {
      conditions.push("sec.id = ?");
      params.push(Number(sectionId));
    }

    // ========================================================
    // DATE FILTER - FROM
    // ========================================================

    if (fromDate) {
      conditions.push("DATE(ses.session_date) >= ?");
      params.push(fromDate);
    }

    // ========================================================
    // DATE FILTER - TO
    // ========================================================

    if (toDate) {
      conditions.push("DATE(ses.session_date) <= ?");
      params.push(toDate);
    }

    // ========================================================
    // BUILD WHERE
    // ========================================================

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    // ========================================================
    // QUERY
    // ========================================================

    const [rows] = await pool.query(
      `
        SELECT
          ae.id AS attendance_id,

          sp.id AS student_id,
          sp.student_code,

          CONCAT(
            u.first_name,
            ' ',
            u.last_name
          ) AS student_name,

          c.id AS course_id,
          c.course_code,
          c.course_name,

          sec.id AS section_id,
          sec.section_name,

          ses.id AS session_id,
          ses.session_date,
          ses.scheduled_start,
          ses.scheduled_end,

          ae.status,
          ae.source,
          ae.scanned_at,
          ae.validation_status

        FROM attendance_events ae

        INNER JOIN attendance_sessions ses
          ON ses.id = ae.session_id

        INNER JOIN sections sec
          ON sec.id = ses.section_id

        INNER JOIN courses c
          ON c.id = sec.course_id

        INNER JOIN student_profiles sp
          ON sp.id = ae.student_id

        INNER JOIN users u
          ON u.id = sp.user_id

        ${whereClause}

        ORDER BY
          ses.session_date DESC,
          ses.id DESC,
          student_name ASC
      `,
      params
    );

    return res.json(rows);

  } catch (error) {
    console.error(
      "Attendance summary error:",
      error
    );

    return res.status(500).json({
      message: "Failed to load attendance report",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
}

// ============================================================
// COURSE SUMMARY
//
// Lecturer => Only his courses/sections
// Admin    => All courses
// ============================================================

async function courseSummary(req, res) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const role = getUserRole(req);
    const isAdmin = role === "admin";

    const conditions = [];
    const params = [];

    if (!isAdmin) {
      conditions.push("sec.lecturer_id = ?");
      params.push(userId);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const [rows] = await pool.query(
      `
        SELECT
          c.id AS course_id,
          c.course_code,
          c.course_name,

          sec.id AS section_id,
          sec.section_name,

          COUNT(
            DISTINCT CASE
              WHEN e.status = 'active'
              THEN e.student_id
            END
          ) AS enrolled_students,

          COUNT(
            DISTINCT CASE
              WHEN ae.validation_status = 'accepted'
              THEN ae.id
            END
          ) AS attendance_records,

          COUNT(
            DISTINCT CASE
              WHEN ae.validation_status = 'accepted'
              AND ae.status IN ('present', 'late')
              THEN ae.id
            END
          ) AS attended_records,

          COUNT(
            DISTINCT CASE
              WHEN ae.validation_status = 'accepted'
              AND ae.status = 'present'
              THEN ae.id
            END
          ) AS present_records,

          COUNT(
            DISTINCT CASE
              WHEN ae.validation_status = 'accepted'
              AND ae.status = 'late'
              THEN ae.id
            END
          ) AS late_records,

          COUNT(
            DISTINCT CASE
              WHEN ae.validation_status = 'accepted'
              AND ae.status = 'absent'
              THEN ae.id
            END
          ) AS absent_records

        FROM sections sec

        INNER JOIN courses c
          ON c.id = sec.course_id

        LEFT JOIN enrollments e
          ON e.section_id = sec.id

        LEFT JOIN attendance_sessions ses
          ON ses.section_id = sec.id

        LEFT JOIN attendance_events ae
          ON ae.session_id = ses.id
          AND ae.student_id = e.student_id

        ${whereClause}

        GROUP BY
          c.id,
          c.course_code,
          c.course_name,
          sec.id,
          sec.section_name

        ORDER BY
          c.course_code ASC,
          sec.section_name ASC
      `,
      params
    );

    // ========================================================
    // ADD ATTENDANCE RATE
    // ========================================================

    const result = rows.map((row) => {
      const attendanceRecords =
        Number(row.attendance_records || 0);

      const attendedRecords =
        Number(row.attended_records || 0);

      const attendanceRate =
        attendanceRecords > 0
          ? Number(
              (
                (attendedRecords /
                  attendanceRecords) *
                100
              ).toFixed(2)
            )
          : 0;

      return {
        ...row,

        enrolled_students:
          Number(row.enrolled_students || 0),

        attendance_records:
          attendanceRecords,

        attended_records:
          attendedRecords,

        present_records:
          Number(row.present_records || 0),

        late_records:
          Number(row.late_records || 0),

        absent_records:
          Number(row.absent_records || 0),

        attendance_rate:
          attendanceRate,
      };
    });

    return res.json(result);

  } catch (error) {
    console.error(
      "Course summary error:",
      error
    );

    return res.status(500).json({
      message: "Failed to load course report",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
}

// ============================================================
// GENERAL DASHBOARD
// Admin statistics
// ============================================================

async function dashboard(req, res) {
  try {
    const [[students]] = await pool.query(
      `
        SELECT COUNT(*) AS total
        FROM student_profiles
      `
    );

    const [[sessions]] = await pool.query(
      `
        SELECT COUNT(*) AS total
        FROM attendance_sessions
      `
    );

    const [[attendance]] = await pool.query(
      `
        SELECT COUNT(*) AS total
        FROM attendance_events
        WHERE validation_status = 'accepted'
      `
    );

    let pendingCorrections = 0;

    try {
      const [[pending]] = await pool.query(
        `
          SELECT COUNT(*) AS total
          FROM correction_requests
          WHERE status = 'pending'
        `
      );

      pendingCorrections =
        Number(pending.total || 0);

    } catch (error) {
      console.warn(
        "Correction requests table/query unavailable:",
        error.message
      );

      pendingCorrections = 0;
    }

    return res.json({
      students:
        Number(students.total || 0),

      sessions:
        Number(sessions.total || 0),

      attendanceRecords:
        Number(attendance.total || 0),

      pendingCorrections,
    });

  } catch (error) {
    console.error(
      "General dashboard error:",
      error
    );

    return res.status(500).json({
      message: "Failed to load dashboard",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
}

// ============================================================
// STUDENT DASHBOARD
// ============================================================

async function studentDashboard(req, res) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    // ========================================================
    // GET STUDENT PROFILE
    // ========================================================

    const [studentRows] = await pool.query(
      `
        SELECT id
        FROM student_profiles
        WHERE user_id = ?
        LIMIT 1
      `,
      [userId]
    );

    if (!studentRows.length) {
      return res.status(404).json({
        message: "Student profile not found",
      });
    }

    const studentId =
      studentRows[0].id;

    // ========================================================
    // ENROLLED SECTIONS
    // ========================================================

    const [[enrolled]] =
      await pool.query(
        `
          SELECT COUNT(*) AS total
          FROM enrollments
          WHERE student_id = ?
            AND status = 'active'
        `,
        [studentId]
      );

    // ========================================================
    // TOTAL SESSIONS
    // ========================================================

    const [[sessions]] =
      await pool.query(
        `
          SELECT COUNT(DISTINCT ses.id) AS total

          FROM attendance_sessions ses

          INNER JOIN enrollments e
            ON e.section_id = ses.section_id

          WHERE e.student_id = ?
            AND e.status = 'active'
        `,
        [studentId]
      );

    // ========================================================
    // ATTENDANCE RECORDS
    // ========================================================

    const [[attendance]] =
      await pool.query(
        `
          SELECT COUNT(*) AS total
          FROM attendance_events
          WHERE student_id = ?
            AND validation_status = 'accepted'
        `,
        [studentId]
      );

    // ========================================================
    // PRESENT / LATE
    // ========================================================

    const [[present]] =
      await pool.query(
        `
          SELECT COUNT(*) AS total
          FROM attendance_events
          WHERE student_id = ?
            AND validation_status = 'accepted'
            AND status IN ('present', 'late')
        `,
        [studentId]
      );

    // ========================================================
    // CALCULATE ATTENDANCE RATE
    // ========================================================

    const totalSessions =
      Number(sessions.total || 0);

    const attendedSessions =
      Number(present.total || 0);

    const attendanceRate =
      totalSessions > 0
        ? Number(
            (
              (attendedSessions /
                totalSessions) *
              100
            ).toFixed(2)
          )
        : 0;

    return res.json({
      studentId,

      enrolledSections:
        Number(enrolled.total || 0),

      totalSessions,

      attendanceRecords:
        Number(attendance.total || 0),

      attendedSessions,

      attendanceRate,
    });

  } catch (error) {
    console.error(
      "Student dashboard error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to load student dashboard",

      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  attendanceSummary,
  courseSummary,
  dashboard,
  studentDashboard,
};