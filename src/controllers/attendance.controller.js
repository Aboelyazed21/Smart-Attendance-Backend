const { pool } = require("../config/db");
const { verifyQrToken } = require("../utils/qr");

// ============================================================
// STUDENT QR SCAN
// ============================================================

async function scan(req, res) {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      message: "QR token is required"
    });
  }

  const qr = verifyQrToken(token);

  if (!qr) {
    return res.status(400).json({
      message: "QR is invalid or expired"
    });
  }

  const [sessions] = await pool.query(
    `
      SELECT *
      FROM attendance_sessions
      WHERE id = ?
        AND status = 'active'
    `,
    [qr.sessionId]
  );

  if (!sessions.length) {
    return res.status(400).json({
      message: "Attendance session is not active"
    });
  }

  const session = sessions[0];

  // Validate QR version
  if (Number(session.qr_version) !== Number(qr.version)) {
    return res.status(400).json({
      message: "QR version is no longer valid"
    });
  }

  // Find student profile
  const [students] = await pool.query(
    `
      SELECT id
      FROM student_profiles
      WHERE user_id = ?
    `,
    [req.user.id]
  );

  if (!students.length) {
    return res.status(403).json({
      message: "Student profile not found"
    });
  }

  const studentId = students[0].id;

  // Check enrollment
  const [enrolled] = await pool.query(
    `
      SELECT id
      FROM enrollments
      WHERE student_id = ?
        AND section_id = ?
        AND status = 'active'
      LIMIT 1
    `,
    [studentId, session.section_id]
  );

  if (!enrolled.length) {
    return res.status(403).json({
      message: "You are not enrolled in this section"
    });
  }

  // Prevent duplicate attendance
  const [existing] = await pool.query(
    `
      SELECT id, status, scanned_at
      FROM attendance_events
      WHERE student_id = ?
        AND session_id = ?
      LIMIT 1
    `,
    [studentId, session.id]
  );

  if (existing.length) {
    return res.status(200).json({
      message: "Attendance already recorded",
      duplicate: true,
      attendance: existing[0]
    });
  }

  // Determine attendance status
  let status = "present";

  if (session.scheduled_start) {
    const [timeRows] = await pool.query(
      "SELECT TIME(NOW()) AS current_time"
    );

    const current = timeRows[0].current_time;

    const currentMinutes = toMinutes(current);
    const startMinutes = toMinutes(session.scheduled_start);

    if (
      currentMinutes >
      startMinutes + Number(session.allow_late_minutes || 15)
    ) {
      status = "late";
    }
  }

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
        VALUES (?, ?, ?, 'qr', 'accepted', NOW(), ?, ?, ?)
      `,
      [
        studentId,
        session.id,
        status,
        req.ip,
        req.headers["user-agent"] || null,
        qr.version
      ]
    );

    return res.status(201).json({
      message: "Attendance recorded",
      attendanceId: result.insertId,
      status
    });
  } catch (error) {
    // Handle duplicate attendance safely
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(200).json({
        message: "Attendance already recorded",
        duplicate: true
      });
    }

    throw error;
  }
}

// ============================================================
// TIME HELPER
// ============================================================

function toMinutes(value) {
  const parts = String(value).split(":").map(Number);

  return parts[0] * 60 + parts[1];
}

// ============================================================
// LIST ATTENDANCE
// ============================================================

async function list(req, res) {
  const {
    sessionId,
    studentId,
    status
  } = req.query;

  const conditions = [];
  const params = [];

  if (sessionId) {
    conditions.push("ae.session_id = ?");
    params.push(sessionId);
  }

  if (studentId) {
    conditions.push("ae.student_id = ?");
    params.push(studentId);
  }

  if (status) {
    conditions.push("ae.status = ?");
    params.push(status);
  }

  const where = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const [rows] = await pool.query(
    `
      SELECT
        ae.*,
        sp.student_code,
        CONCAT(u.first_name, ' ', u.last_name) AS student_name,
        c.course_code,
        c.course_name,
        ses.session_date
      FROM attendance_events ae
      JOIN student_profiles sp
        ON sp.id = ae.student_id
      JOIN users u
        ON u.id = sp.user_id
      JOIN attendance_sessions ses
        ON ses.id = ae.session_id
      JOIN sections sec
        ON sec.id = ses.section_id
      JOIN courses c
        ON c.id = sec.course_id
      ${where}
      ORDER BY ae.id DESC
    `,
    params
  );

  return res.json(rows);
}

// ============================================================
// MY ATTENDANCE
// ============================================================

async function myAttendance(req, res) {
  const [studentRows] = await pool.query(
    `
      SELECT id
      FROM student_profiles
      WHERE user_id = ?
    `,
    [req.user.id]
  );

  if (!studentRows.length) {
    return res.status(404).json({
      message: "Student profile not found"
    });
  }

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
      JOIN attendance_sessions ses
        ON ses.id = ae.session_id
      JOIN sections sec
        ON sec.id = ses.section_id
      JOIN courses c
        ON c.id = sec.course_id
      WHERE ae.student_id = ?
      ORDER BY ses.session_date DESC, ae.id DESC
    `,
    [studentRows[0].id]
  );

  return res.json(rows);
}

// ============================================================
// MANUAL UPDATE
// ============================================================

async function manualUpdate(req, res) {
  const {
    status,
    notes
  } = req.body;

  if (!["present", "absent", "late", "excused"].includes(status)) {
    return res.status(400).json({
      message: "Invalid attendance status"
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
      req.params.id
    ]
  );

  if (!result.affectedRows) {
    return res.status(404).json({
      message: "Attendance record not found"
    });
  }

  return res.json({
    message: "Attendance updated"
  });
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  scan,
  list,
  myAttendance,
  manualUpdate
};