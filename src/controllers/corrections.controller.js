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
        cr.*
      FROM correction_requests cr
      JOIN student_profiles sp
        ON sp.id = cr.student_id
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
            status = 'present',
            source = 'correction'
          WHERE id = ?
        `,
        [request.attendance_event_id]
      );

      // Apply the exact requested status
      await connection.query(
        `
          UPDATE attendance_events
          SET
            status = ?
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
    throw error;
  } finally {
    connection.release();
  }
}

// ============================================================
// MANUAL ATTENDANCE CORRECTION
// PATCH /api/corrections/:eventId
// ============================================================

async function updateAttendance(req, res) {
  const {
    status,
    notes
  } = req.body;

  const eventId = Number(req.params.eventId);

  if (!Number.isInteger(eventId) || eventId <= 0) {
    return res.status(400).json({
      message: "Invalid attendance event id"
    });
  }

  if (
    !["present", "absent", "late", "excused"].includes(status)
  ) {
    return res.status(400).json({
      message:
        "Status must be present, absent, late, or excused"
    });
  }

  const [existing] = await pool.query(
    `
      SELECT id
      FROM attendance_events
      WHERE id = ?
      LIMIT 1
    `,
    [eventId]
  );

  if (!existing.length) {
    return res.status(404).json({
      message: "Attendance event not found"
    });
  }

  const [result] = await pool.query(
    `
      UPDATE attendance_events
      SET
        status = ?,
        source = 'correction',
        notes = ?
      WHERE id = ?
    `,
    [
      status,
      notes || null,
      eventId
    ]
  );

  if (!result.affectedRows) {
    return res.status(404).json({
      message: "Attendance event not found"
    });
  }

  return res.json({
    message: "Attendance corrected successfully",
    attendanceEventId: eventId,
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