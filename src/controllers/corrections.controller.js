const { pool } = require("../config/db");

// ============================================================
// CREATE CORRECTION REQUEST
// ============================================================

async function create(req, res) {
  const {
    attendanceEventId,
    requestedStatus,
    reason,
    evidenceUrl
  } = req.body;

  if (!requestedStatus || !reason) {
    return res.status(400).json({
      message: "requestedStatus and reason are required"
    });
  }

  const [studentRows] = await pool.query(
    `
      SELECT id
      FROM student_profiles
      WHERE user_id = ?
    `,
    [req.user.id]
  );

  if (!studentRows.length) {
    return res.status(403).json({
      message: "Student profile not found"
    });
  }

  const [result] = await pool.query(
    `
      INSERT INTO correction_requests
      (
        attendance_event_id,
        student_id,
        requested_status,
        reason,
        evidence_url
      )
      VALUES (?, ?, ?, ?, ?)
    `,
    [
      attendanceEventId || null,
      studentRows[0].id,
      requestedStatus,
      reason,
      evidenceUrl || null
    ]
  );

  return res.status(201).json({
    id: result.insertId,
    message: "Correction request submitted"
  });
}

// ============================================================
// LIST CORRECTION REQUESTS
// ============================================================

async function list(req, res) {
  const [rows] = await pool.query(`
    SELECT
      cr.*,
      sp.student_code,
      CONCAT(
        u.first_name,
        ' ',
        u.last_name
      ) AS student_name
    FROM correction_requests cr
    JOIN student_profiles sp
      ON sp.id = cr.student_id
    JOIN users u
      ON u.id = sp.user_id
    ORDER BY cr.id DESC
  `);

  return res.json(rows);
}

// ============================================================
// MY CORRECTION REQUESTS
// ============================================================

async function myRequests(req, res) {
  const [rows] = await pool.query(
    `
      SELECT
        cr.*,
        COALESCE(ae.status, 'absent') AS attendance_status,
        c.course_code,
        c.course_name,
        sec.section_name,
        ses.session_date
      FROM correction_requests cr
      JOIN student_profiles sp
        ON sp.id = cr.student_id
      LEFT JOIN attendance_events ae
        ON ae.id = cr.attendance_event_id
      LEFT JOIN attendance_sessions ses
        ON ses.id = ae.session_id
      LEFT JOIN sections sec
        ON sec.id = ses.section_id
      LEFT JOIN courses c
        ON c.id = sec.course_id
      WHERE sp.user_id = ?
      ORDER BY cr.id DESC
    `,
    [req.user.id]
  );

  return res.json(rows);
}

// ============================================================
// REVIEW CORRECTION REQUEST
// ============================================================

async function review(req, res) {
  const {
    status,
    reviewerComment
  } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({
      message: "Status must be approved or rejected"
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `
        SELECT *
        FROM correction_requests
        WHERE id = ?
        FOR UPDATE
      `,
      [req.params.id]
    );

    if (!rows.length) {
      await connection.rollback();

      return res.status(404).json({
        message: "Correction request not found"
      });
    }

    const request = rows[0];

    await connection.query(
      `
        UPDATE correction_requests
        SET
          status = ?,
          reviewed_by = ?,
          reviewed_at = NOW(),
          reviewer_comment = ?
        WHERE id = ?
      `,
      [
        status,
        req.user.id,
        reviewerComment || null,
        req.params.id
      ]
    );

    if (
      status === "approved" &&
      request.attendance_event_id
    ) {
      await connection.query(
        `
          UPDATE attendance_events
          SET
            status = ?,
            source = 'correction'
          WHERE id = ?
        `,
        [
          request.requested_status,
          request.attendance_event_id
        ]
      );
    }

    await connection.commit();

    return res.json({
      message: `Correction ${status}`
    });
  } catch (error) {
    await connection.rollback();

    console.error(
      "Review correction error:",
      error
    );

    return res.status(500).json({
      message: "Failed to review correction"
    });
  } finally {
    connection.release();
  }
}

// ============================================================
// MANUAL ATTENDANCE CORRECTION
// PATCH /api/corrections/:eventId
//
// IMPORTANT:
// eventId may be 0 when the student currently has no
// attendance_events record (for example, Absent).
//
// In that case we use:
// sessionId + studentId
//
// Existing event  -> UPDATE
// No existing event -> INSERT
// ============================================================

async function updateAttendance(req, res) {
  const {
    sessionId,
    studentId,
    status,
    reason,
    notes
  } = req.body;

  // ----------------------------------------------------------
  // Accept either reason or notes from the frontend
  // ----------------------------------------------------------

  const correctionReason = reason || notes || null;

  // ----------------------------------------------------------
  // Validate basic input
  // ----------------------------------------------------------

  if (!sessionId || !studentId || !status || !correctionReason) {
    return res.status(400).json({
      message:
        "sessionId, studentId, status and reason are required"
    });
  }

  const allowedStatuses = [
    "present",
    "absent",
    "late",
    "excused"
  ];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      message:
        "Status must be present, absent, late, or excused"
    });
  }

  const numericSessionId = Number(sessionId);

  if (
    !Number.isInteger(numericSessionId) ||
    numericSessionId <= 0
  ) {
    return res.status(400).json({
      message: "Invalid session id"
    });
  }

  // ----------------------------------------------------------
  // Normalize student ID
  //
  // studentId may be:
  // - student_profiles.id
  // - student_code
  // ----------------------------------------------------------

  const normalizedStudentId = String(studentId).trim();

  if (!normalizedStudentId) {
    return res.status(400).json({
      message: "Invalid student id"
    });
  }

  // ----------------------------------------------------------
  // Check session
  // ----------------------------------------------------------

  const [sessionRows] = await pool.query(
    `
      SELECT
        id,
        section_id,
        opened_by,
        status
      FROM attendance_sessions
      WHERE id = ?
      LIMIT 1
    `,
    [numericSessionId]
  );

  if (!sessionRows.length) {
    return res.status(404).json({
      message: "Attendance session not found"
    });
  }

  const session = sessionRows[0];

  // ----------------------------------------------------------
  // Authorization
  //
  // Admin / Administrator:
  //   Can modify attendance for any session.
  //
  // Lecturer:
  //   Can modify only sessions opened by that lecturer.
  //
  // Support both common auth shapes:
  // req.user.id
  // req.user.userId
  // ----------------------------------------------------------

  const currentUserId =
    req.user?.id ??
    req.user?.userId;

  const currentUserRole = String(
    req.user?.role ??
    req.user?.role_name ??
    ""
  ).toLowerCase().trim();

  const isAdmin =
    currentUserRole === "admin" ||
    currentUserRole === "administrator";

  if (
    currentUserId === undefined ||
    currentUserId === null
  ) {
    return res.status(401).json({
      message: "User authentication information is missing"
    });
  }

  if (
    !isAdmin &&
    Number(session.opened_by) !==
      Number(currentUserId)
  ) {
    return res.status(403).json({
      message:
        "You are not authorized to modify this session"
    });
  }

  // ----------------------------------------------------------
  // Find student
  // ----------------------------------------------------------

  const [studentRows] = await pool.query(
    `
      SELECT
        sp.id,
        sp.student_code,
        sp.user_id
      FROM student_profiles sp
      WHERE
        sp.id = ?
        OR sp.student_code = ?
      LIMIT 1
    `,
    [
      normalizedStudentId,
      normalizedStudentId
    ]
  );

  if (!studentRows.length) {
    return res.status(404).json({
      message: "Student not found"
    });
  }

  const student = studentRows[0];

  // ----------------------------------------------------------
  // Check that the student belongs to this section
  // ----------------------------------------------------------

  const [enrollmentRows] = await pool.query(
    `
      SELECT
        id,
        status
      FROM enrollments
      WHERE
        student_id = ?
        AND section_id = ?
      LIMIT 1
    `,
    [
      student.id,
      session.section_id
    ]
  );

  if (!enrollmentRows.length) {
    return res.status(403).json({
      message:
        "Student is not enrolled in this session section"
    });
  }

  // ----------------------------------------------------------
  // Find existing attendance event
  //
  // This is the important part.
  //
  // We DON'T require eventId.
  //
  // We search by:
  // session + student
  // ----------------------------------------------------------

  const [existingRows] = await pool.query(
    `
      SELECT
        id,
        student_id,
        session_id,
        status,
        source,
        notes
      FROM attendance_events
      WHERE
        session_id = ?
        AND student_id = ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [
      numericSessionId,
      student.id
    ]
  );

  // ==========================================================
  // CASE 1: Existing attendance event
  // ==========================================================

  if (existingRows.length) {
    const existing = existingRows[0];

    const [result] = await pool.query(
      `
        UPDATE attendance_events
        SET
          status = ?,
          source = 'correction',
          notes = ?,
          validation_status = 'accepted'
        WHERE id = ?
      `,
      [
        status,
        correctionReason,
        existing.id
      ]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "Attendance event not found"
      });
    }

    return res.json({
      message:
        "Attendance corrected successfully",
      action: "updated",
      attendanceEventId: existing.id,
      studentId: student.id,
      sessionId: numericSessionId,
      status
    });
  }

  // ==========================================================
  // CASE 2: No attendance event
  //
  // This is the Absent case.
  //
  // Create a new attendance event.
  // ==========================================================

  const [insertResult] = await pool.query(
    `
      INSERT INTO attendance_events
      (
        student_id,
        session_id,
        status,
        source,
        validation_status,
        scanned_at,
        notes
      )
      VALUES (?, ?, ?, 'correction', 'accepted', NOW(), ?)
    `,
    [
      student.id,
      numericSessionId,
      status,
      correctionReason
    ]
  );

  return res.status(201).json({
    message:
      "Attendance created and corrected successfully",
    action: "created",
    attendanceEventId: insertResult.insertId,
    studentId: student.id,
    sessionId: numericSessionId,
    status
  });
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  create,
  list,
  myRequests,
  review,
  updateAttendance
};