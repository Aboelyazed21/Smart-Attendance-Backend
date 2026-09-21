const { pool } = require("../config/db");

// ============================================================
// GET FLAGS
// ============================================================

async function getFlags(req, res) {
  const {
    studentId,
    sessionId,
    isResolved,
    severity,
    flagType
  } = req.query;

  const conditions = [];
  const params = [];

  if (studentId) {
    conditions.push("af.student_id = ?");
    params.push(studentId);
  }

  if (sessionId) {
    conditions.push("af.session_id = ?");
    params.push(sessionId);
  }

  if (isResolved !== undefined) {
    conditions.push("af.is_resolved = ?");
    params.push(Number(isResolved));
  }

  if (severity) {
    conditions.push("af.severity = ?");
    params.push(severity);
  }

  if (flagType) {
    conditions.push("af.flag_type = ?");
    params.push(flagType);
  }

  const where = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const [rows] = await pool.query(
    `
      SELECT
        af.id,
        af.student_id,
        af.session_id,
        af.flag_type,
        af.severity,
        af.reason,
        af.score,
        af.is_resolved,
        af.reviewed_by,
        af.reviewed_at,
        af.created_at,

        sp.student_code,

        CONCAT(
          u.first_name,
          ' ',
          u.last_name
        ) AS student_name,

        c.course_code,
        c.course_name,

        sec.section_name,

        ses.session_date,
        ses.status AS session_status

      FROM attendance_flags af

      LEFT JOIN student_profiles sp
        ON sp.id = af.student_id

      LEFT JOIN users u
        ON u.id = sp.user_id

      LEFT JOIN attendance_sessions ses
        ON ses.id = af.session_id

      LEFT JOIN sections sec
        ON sec.id = ses.section_id

      LEFT JOIN courses c
        ON c.id = sec.course_id

      ${where}

      ORDER BY af.created_at DESC, af.id DESC
    `,
    params
  );

  return res.json(rows);
}

// ============================================================
// GENERATE LOW ATTENDANCE FLAGS
// ============================================================
//
// Default threshold:
// 75%
//
// The function calculates attendance percentage for each
// enrolled student based on attendance sessions/events.
//
// Students below the threshold receive a low_attendance flag.
// Existing unresolved low_attendance flags are not duplicated.
// ============================================================

async function generateLowAttendanceFlags(req, res) {
  const threshold =
    req.body?.threshold !== undefined
      ? Number(req.body.threshold)
      : 75;

  if (
    !Number.isFinite(threshold) ||
    threshold < 0 ||
    threshold > 100
  ) {
    return res.status(400).json({
      message: "Threshold must be a number between 0 and 100"
    });
  }

  // Get students who have enrollments
  const [students] = await pool.query(`
    SELECT DISTINCT
      e.student_id,
      sp.student_code,
      sp.user_id,
      CONCAT(
        u.first_name,
        ' ',
        u.last_name
      ) AS student_name
    FROM enrollments e
    JOIN student_profiles sp
      ON sp.id = e.student_id
    JOIN users u
      ON u.id = sp.user_id
    WHERE e.status = 'active'
  `);

  let created = 0;
  let existing = 0;
  let checked = 0;

  const generatedFlags = [];

  for (const student of students) {
    checked++;

    // Get sessions belonging to the student's enrolled sections.
    // Only closed/active sessions are considered.
    const [stats] = await pool.query(
      `
        SELECT
          COUNT(DISTINCT ses.id) AS total_sessions,

          COUNT(
            DISTINCT CASE
              WHEN ae.status IN ('present', 'late', 'excused')
              THEN ses.id
            END
          ) AS attended_sessions

        FROM enrollments e

        JOIN attendance_sessions ses
          ON ses.section_id = e.section_id

        LEFT JOIN attendance_events ae
          ON ae.session_id = ses.id
          AND ae.student_id = e.student_id

        WHERE e.student_id = ?
          AND e.status = 'active'
          AND ses.status IN ('active', 'closed')
      `,
      [student.student_id]
    );

    const totalSessions = Number(
      stats[0]?.total_sessions || 0
    );

    const attendedSessions = Number(
      stats[0]?.attended_sessions || 0
    );

    // No sessions means nothing to flag
    if (totalSessions === 0) {
      continue;
    }

    const attendancePercentage =
      (attendedSessions / totalSessions) * 100;

    if (attendancePercentage >= threshold) {
      continue;
    }

    const score = Number(
      attendancePercentage.toFixed(2)
    );

    // Determine severity
    let severity = "low";

    if (attendancePercentage < 50) {
      severity = "high";
    } else if (attendancePercentage < 65) {
      severity = "medium";
    }

    const reason =
      `Attendance is ${score}% ` +
      `(${attendedSessions}/${totalSessions} sessions), ` +
      `below the ${threshold}% threshold`;

    // Prevent duplicate unresolved flags
    const [existingFlags] = await pool.query(
      `
        SELECT id
        FROM attendance_flags
        WHERE student_id = ?
          AND flag_type = 'low_attendance'
          AND is_resolved = 0
        LIMIT 1
      `,
      [student.student_id]
    );

    if (existingFlags.length) {
      existing++;
      continue;
    }

    // Find the latest session for reference
    const [latestSession] = await pool.query(
      `
        SELECT ses.id
        FROM enrollments e
        JOIN attendance_sessions ses
          ON ses.section_id = e.section_id
        WHERE e.student_id = ?
          AND e.status = 'active'
          AND ses.status IN ('active', 'closed')
        ORDER BY ses.session_date DESC, ses.id DESC
        LIMIT 1
      `,
      [student.student_id]
    );

    const sessionId =
      latestSession.length
        ? latestSession[0].id
        : null;

    const [result] = await pool.query(
      `
        INSERT INTO attendance_flags
        (
          student_id,
          session_id,
          flag_type,
          severity,
          reason,
          score,
          is_resolved
        )
        VALUES (?, ?, 'low_attendance', ?, ?, ?, 0)
      `,
      [
        student.student_id,
        sessionId,
        severity,
        reason,
        score
      ]
    );

    created++;

    generatedFlags.push({
      id: result.insertId,
      studentId: student.student_id,
      studentCode: student.student_code,
      studentName: student.student_name,
      attendancePercentage: score,
      totalSessions,
      attendedSessions,
      severity
    });
  }

  return res.status(201).json({
    message: "Low attendance flags generated",
    threshold,
    checkedStudents: checked,
    created,
    existing,
    flags: generatedFlags
  });
}

// ============================================================
// RESOLVE FLAG
// ============================================================

async function resolveFlag(req, res) {
  const flagId = Number(req.params.id);

  if (!Number.isInteger(flagId) || flagId <= 0) {
    return res.status(400).json({
      message: "Invalid flag id"
    });
  }

  const [flags] = await pool.query(
    `
      SELECT
        id,
        is_resolved
      FROM attendance_flags
      WHERE id = ?
      LIMIT 1
    `,
    [flagId]
  );

  if (!flags.length) {
    return res.status(404).json({
      message: "Attendance flag not found"
    });
  }

  if (Number(flags[0].is_resolved) === 1) {
    return res.status(200).json({
      message: "Attendance flag is already resolved"
    });
  }

  const reviewerId =
    req.user?.id ||
    req.user?.userId ||
    null;

  const [result] = await pool.query(
    `
      UPDATE attendance_flags
      SET
        is_resolved = 1,
        reviewed_by = ?,
        reviewed_at = NOW()
      WHERE id = ?
    `,
    [
      reviewerId,
      flagId
    ]
  );

  if (!result.affectedRows) {
    return res.status(404).json({
      message: "Attendance flag not found"
    });
  }

  return res.json({
    message: "Attendance flag resolved",
    flagId
  });
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  getFlags,
  generateLowAttendanceFlags,
  resolveFlag
};