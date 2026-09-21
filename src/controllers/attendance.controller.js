const { pool } = require("../config/db");
const { verifyQrToken } = require("../utils/qr");

// ============================================================
// STUDENT QR SCAN
// ============================================================

async function scan(req, res) {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        message: "QR token is required",
      });
    }

    // ----------------------------------------------------------
    // 1. Verify QR token
    // ----------------------------------------------------------

    const qr = verifyQrToken(token);

    if (!qr) {
      return res.status(400).json({
        message: "QR is invalid or expired",
      });
    }

    // ----------------------------------------------------------
    // 2. Check active attendance session
    // ----------------------------------------------------------

    const [sessions] = await pool.query(
      `
        SELECT
          id,
          section_id,
          status,
          qr_version,
          scheduled_start,
          scheduled_end,
          allow_late_minutes
        FROM attendance_sessions
        WHERE id = ?
          AND status = 'active'
        LIMIT 1
      `,
      [qr.sessionId]
    );

    if (!sessions.length) {
      return res.status(400).json({
        message: "Attendance session is not active",
      });
    }

    const session = sessions[0];

    // ----------------------------------------------------------
    // 3. Validate QR version
    // ----------------------------------------------------------

    if (Number(session.qr_version) !== Number(qr.version)) {
      return res.status(400).json({
        message: "QR version is no longer valid",
      });
    }

    // ----------------------------------------------------------
    // 4. Validate logged-in student
    // ----------------------------------------------------------

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: "Authentication is required",
      });
    }

    const userId = Number(req.user.id);

    // ----------------------------------------------------------
    // 5. Find student profile
    // ----------------------------------------------------------

    const [students] = await pool.query(
      `
        SELECT
          sp.id AS student_id,
          u.email,
          u.status AS user_status
        FROM student_profiles sp
        INNER JOIN users u
          ON u.id = sp.user_id
        WHERE sp.user_id = ?
        LIMIT 1
      `,
      [userId]
    );

    if (!students.length) {
      return res.status(403).json({
        message: "Student profile not found",
      });
    }

    const student = students[0];
    const studentId = Number(student.student_id);

    // ----------------------------------------------------------
    // 6. Student account must be active
    // ----------------------------------------------------------

    if (student.user_status !== "active") {
      return res.status(403).json({
        message: "Your student account is not active",
      });
    }

    // ----------------------------------------------------------
    // 7. IMPORTANT:
    //    Student MUST be enrolled in this section
    // ----------------------------------------------------------

    const [enrolled] = await pool.query(
      `
        SELECT
          e.id,
          e.status,
          e.section_id
        FROM enrollments e
        WHERE e.student_id = ?
          AND e.section_id = ?
          AND e.status = 'active'
        LIMIT 1
      `,
      [
        studentId,
        Number(session.section_id),
      ]
    );

    if (!enrolled.length) {
      return res.status(403).json({
        message:
          "You are not enrolled in this course and cannot record attendance",
      });
    }

    // ----------------------------------------------------------
    // 8. Prevent duplicate attendance
    // ----------------------------------------------------------

    const [existing] = await pool.query(
      `
        SELECT
          id,
          status,
          scanned_at
        FROM attendance_events
        WHERE student_id = ?
          AND session_id = ?
        LIMIT 1
      `,
      [
        studentId,
        Number(session.id),
      ]
    );

    if (existing.length) {
      return res.status(200).json({
        message: "Attendance already recorded",
        duplicate: true,
        attendance: existing[0],
      });
    }

    // ----------------------------------------------------------
    // 9. Determine attendance status
    // ----------------------------------------------------------

    let attendanceStatus = "present";

    if (session.scheduled_start) {
      const [timeRows] = await pool.query(
        `
          SELECT TIME(NOW()) AS current_time
        `
      );

      const currentTime =
        timeRows[0].current_time;

      const currentMinutes =
        toMinutes(currentTime);

      const startMinutes =
        toMinutes(session.scheduled_start);

      const allowedLateMinutes =
        Number(
          session.allow_late_minutes || 15
        );

      if (
        currentMinutes >
        startMinutes + allowedLateMinutes
      ) {
        attendanceStatus = "late";
      }
    }

    // ----------------------------------------------------------
    // 10. Record attendance
    // ----------------------------------------------------------

    try {
      const [result] = await pool.query(
        `
          INSERT INTO attendance_events
          (
            student_id,
            session_id,
            status,
            source,
            validation_status,
            scanned_at,
            ip_address,
            device_info,
            qr_version
          )
          VALUES
          (
            ?,
            ?,
            ?,
            'qr',
            'accepted',
            NOW(),
            ?,
            ?,
            ?
          )
        `,
        [
          studentId,
          Number(session.id),
          attendanceStatus,
          req.ip,
          req.headers["user-agent"] || null,
          Number(qr.version),
        ]
      );

      return res.status(201).json({
        message: "Attendance recorded successfully",
        attendanceId: result.insertId,
        status: attendanceStatus,
        studentEmail: student.email,
      });
    } catch (error) {
      // --------------------------------------------------------
      // Duplicate protection at database level
      // --------------------------------------------------------

      if (error.code === "ER_DUP_ENTRY") {
        return res.status(200).json({
          message: "Attendance already recorded",
          duplicate: true,
        });
      }

      throw error;
    }
  } catch (error) {
    console.error(
      "QR attendance scan error:",
      error
    );

    return res.status(500).json({
      message: "Failed to record attendance",
    });
  }
}

// ============================================================
// TIME HELPER
// ============================================================

function toMinutes(value) {
  const parts = String(value)
    .split(":")
    .map(Number);

  return (
    parts[0] * 60 +
    parts[1]
  );
}

// ============================================================
// LIST ATTENDANCE
// ============================================================

async function list(req, res) {
  try {
    const {
      sessionId,
      studentId,
      status,
    } = req.query;

    const conditions = [];
    const params = [];

    if (sessionId) {
      conditions.push(
        "ae.session_id = ?"
      );

      params.push(sessionId);
    }

    if (studentId) {
      conditions.push(
        "ae.student_id = ?"
      );

      params.push(studentId);
    }

    if (status) {
      conditions.push(
        "ae.status = ?"
      );

      params.push(status);
    }

    const where =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const [rows] = await pool.query(
      `
        SELECT
          ae.*,
          sp.student_code,
          CONCAT(
            u.first_name,
            ' ',
            u.last_name
          ) AS student_name,
          u.email,
          c.course_code,
          c.course_name,
          sec.section_name,
          ses.session_date
        FROM attendance_events ae

        INNER JOIN student_profiles sp
          ON sp.id = ae.student_id

        INNER JOIN users u
          ON u.id = sp.user_id

        INNER JOIN attendance_sessions ses
          ON ses.id = ae.session_id

        INNER JOIN sections sec
          ON sec.id = ses.section_id

        INNER JOIN courses c
          ON c.id = sec.course_id

        ${where}

        ORDER BY ae.id DESC
      `,
      params
    );

    return res.json(rows);
  } catch (error) {
    console.error(
      "List attendance error:",
      error
    );

    return res.status(500).json({
      message: "Failed to load attendance",
    });
  }
}

// ============================================================
// MY ATTENDANCE
// ============================================================

async function myAttendance(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: "Authentication is required",
      });
    }

    const [studentRows] = await pool.query(
      `
        SELECT id
        FROM student_profiles
        WHERE user_id = ?
        LIMIT 1
      `,
      [req.user.id]
    );

    if (!studentRows.length) {
      return res.status(404).json({
        message: "Student profile not found",
      });
    }

    const studentId =
      studentRows[0].id;

    const [rows] = await pool.query(
      `
        SELECT
          ae.id,
          ae.status,
          ae.source,
          ae.scanned_at,
          c.course_code,
          c.course_name,
          sec.section_name,
          ses.session_date
        FROM attendance_events ae

        INNER JOIN attendance_sessions ses
          ON ses.id = ae.session_id

        INNER JOIN sections sec
          ON sec.id = ses.section_id

        INNER JOIN courses c
          ON c.id = sec.course_id

        WHERE ae.student_id = ?

        ORDER BY
          ses.session_date DESC,
          ae.id DESC
      `,
      [studentId]
    );

    return res.json(rows);
  } catch (error) {
    console.error(
      "My attendance error:",
      error
    );

    return res.status(500).json({
      message: "Failed to load attendance",
    });
  }
}

// ============================================================
// MANUAL UPDATE
// ============================================================

async function manualUpdate(req, res) {
  try {
    const {
      status,
      notes,
    } = req.body;

    if (
      ![
        "present",
        "absent",
        "late",
        "excused",
      ].includes(status)
    ) {
      return res.status(400).json({
        message:
          "Invalid attendance status",
      });
    }

    const [result] = await pool.query(
      `
        UPDATE attendance_events
        SET
          status = ?,
          source = 'manual',
          notes = ?
        WHERE id = ?
      `,
      [
        status,
        notes || null,
        req.params.id,
      ]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message:
          "Attendance record not found",
      });
    }

    return res.json({
      message: "Attendance updated",
    });
  } catch (error) {
    console.error(
      "Manual attendance update error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to update attendance",
    });
  }
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  scan,
  list,
  myAttendance,
  manualUpdate,
};