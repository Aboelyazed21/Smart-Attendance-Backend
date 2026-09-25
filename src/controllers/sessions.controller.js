const { pool } = require("../config/db");
const { createQrToken } = require("../utils/qr");
const QRCode = require("qrcode");

// ============================================================
// QR EXPIRY
// ============================================================

function nextQrExpiry(seconds) {
  return new Date(Date.now() + seconds * 1000);
}

// ============================================================
// CURRENT USER
// ============================================================

function getUserId(req) {
  return req.user?.id || req.user?.userId || null;
}

// ============================================================
// ADMIN CHECK
// ============================================================

function isAdmin(req) {
  return req.user?.role === "admin";
}

// ============================================================
// CHECK SESSION OWNERSHIP
// ============================================================

async function getSessionForUser(sessionId, req) {
  const userId = getUserId(req);

  if (!userId) {
    return null;
  }

  let query = `
    SELECT
      s.*,
      sec.section_name,
      sec.lecturer_id,
      c.course_code,
      c.course_name
    FROM attendance_sessions s
    INNER JOIN sections sec
      ON sec.id = s.section_id
    INNER JOIN courses c
      ON c.id = sec.course_id
    WHERE s.id = ?
  `;

  const params = [sessionId];

  // Admin can access any session
  if (!isAdmin(req)) {
    query += `
      AND sec.lecturer_id = ?
    `;

    params.push(userId);
  }

  const [rows] = await pool.query(query, params);

  return rows.length ? rows[0] : null;
}

// ============================================================
// GET SESSION BY ID
// ============================================================

async function getById(req, res) {
  try {
    const sessionId = req.params.id;

    const session = await getSessionForUser(
      sessionId,
      req
    );

    if (!session) {
      return res.status(404).json({
        message: "Session not found",
      });
    }

    return res.json(session);
  } catch (error) {
    console.error("Get session error:", error);

    return res.status(500).json({
      message: "Failed to load attendance session",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
}

// ============================================================
// LIST SESSIONS
// ============================================================

async function list(req, res) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    let query = `
      SELECT
        s.*,
        c.course_code,
        c.course_name,
        sec.section_name,
        sec.lecturer_id,
        r.building,
        r.room_name
      FROM attendance_sessions s
      INNER JOIN sections sec
        ON sec.id = s.section_id
      INNER JOIN courses c
        ON c.id = sec.course_id
      LEFT JOIN rooms r
        ON r.id = s.room_id
    `;

    const params = [];

    // Lecturer sees only his sections
    if (!isAdmin(req)) {
      query += `
        WHERE sec.lecturer_id = ?
      `;

      params.push(userId);
    }

    query += `
      ORDER BY s.id DESC
    `;

    const [rows] = await pool.query(query, params);

    return res.json(rows);
  } catch (error) {
    console.error("List sessions error:", error);

    return res.status(500).json({
      message: "Failed to load attendance sessions",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
}

// ============================================================
// GET MY SESSIONS - STUDENT
// ============================================================

async function mySessions(req, res) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT
        s.*,

        c.course_code,
        c.course_name,

        sec.section_name,

        r.building,
        r.room_name,

        ae.id AS attendance_id,
        -- COALESCE(absent):
        -- enrolled لكن مفيش attendance_event + السيشن مقفولة => Absent
        -- السيشن scheduled/active ولسه مفيش سجل => NULL (Not recorded)
        -- عشان زرار Scan يفضل شغال
        CASE
          WHEN ae.status IS NOT NULL THEN ae.status
          WHEN s.status = 'closed' THEN 'absent'
          ELSE NULL
        END AS attendance_status,
        ae.scanned_at,
        ae.source

      FROM attendance_sessions s

      INNER JOIN sections sec
        ON sec.id = s.section_id

      INNER JOIN courses c
        ON c.id = sec.course_id

      LEFT JOIN rooms r
        ON r.id = s.room_id

      INNER JOIN enrollments e
        ON e.section_id = s.section_id
        AND e.status = 'active'

      INNER JOIN student_profiles sp
        ON sp.id = e.student_id
        AND sp.user_id = ?

      LEFT JOIN attendance_events ae
        ON ae.session_id = s.id
        AND ae.student_id = sp.id

      ORDER BY
        s.session_date DESC,
        s.scheduled_start DESC,
        s.id DESC
      `,
      [userId]
    );

    return res.json(rows);
  } catch (error) {
    console.error("Get my sessions error:", error);

    return res.status(500).json({
      message: "Failed to load your sessions",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
}

// ============================================================
// CREATE SESSION
// ============================================================

async function create(req, res) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const {
      sectionId,
      roomId,
      sessionDate,
      scheduledStart,
      scheduledEnd,
    } = req.body;

    if (!sectionId || !sessionDate) {
      return res.status(400).json({
        message:
          "sectionId and sessionDate are required",
      });
    }

    // ========================================================
    // Check section ownership
    // ========================================================

    const [sectionRows] = await pool.query(
      `
      SELECT
        s.id,
        s.lecturer_id
      FROM sections s
      WHERE s.id = ?
      LIMIT 1
      `,
      [sectionId]
    );

    if (!sectionRows.length) {
      return res.status(404).json({
        message: "Section not found",
      });
    }

    if (
      !isAdmin(req) &&
      Number(sectionRows[0].lecturer_id) !== Number(userId)
    ) {
      return res.status(403).json({
        message:
          "You are not allowed to create a session for this section",
      });
    }

    // ========================================================
    // Create session
    // ========================================================

    const [result] = await pool.query(
      `
      INSERT INTO attendance_sessions
      (
        section_id,
        room_id,
        opened_by,
        session_date,
        scheduled_start,
        scheduled_end,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, 'scheduled')
      `,
      [
        sectionId,
        roomId || null,
        userId,
        sessionDate,
        scheduledStart || null,
        scheduledEnd || null,
      ]
    );

    return res.status(201).json({
      id: result.insertId,
      message: "Attendance session created",
    });
  } catch (error) {
    console.error("Create session error:", error);

    return res.status(500).json({
      message: "Failed to create attendance session",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
}

// ============================================================
// OPEN SESSION + GENERATE QR
// ============================================================

async function open(req, res) {
  try {
    const sessionId = req.params.id;
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    // ========================================================
    // Check session ownership
    // ========================================================

    const session = await getSessionForUser(
      sessionId,
      req
    );

    if (!session) {
      return res.status(404).json({
        message: "Session not found",
      });
    }

    // ========================================================
    // QR configuration
    // ========================================================

    const rotationSeconds = Number(
      process.env.QR_ROTATION_SECONDS || 10
    );

    const expiry = nextQrExpiry(
      rotationSeconds
    );

    if (
      session.status === "closed" ||
      session.status === "cancelled"
    ) {
      return res.status(400).json({
        message: "Session cannot be opened",
      });
    }

    // ========================================================
    // QR version
    // ========================================================

    const version =
      Number(session.qr_version || 0) + 1;

    await pool.query(
      `
      UPDATE attendance_sessions
      SET
        status = 'active',
        actual_start = COALESCE(actual_start, NOW()),
        opened_by = ?,
        qr_version = ?,
        qr_expires_at = ?
      WHERE id = ?
      `,
      [
        userId,
        version,
        expiry,
        sessionId,
      ]
    );

    // ========================================================
    // Generate signed QR token
    // ========================================================

    const token = createQrToken(
      sessionId,
      version,
      expiry.toISOString()
    );

    const qrDataUrl =
      await QRCode.toDataURL(token);

    return res.json({
      message: "Session opened",

      sessionId: Number(sessionId),

      qr: {
        token,
        version,
        expiresAt: expiry,
        rotationSeconds,
        qrDataUrl,
      },
    });
  } catch (error) {
    console.error("Open session error:", error);

    return res.status(500).json({
      message: "Failed to open session",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
}

// ============================================================
// REFRESH QR
// ============================================================

async function refreshQr(req, res) {
  try {
    const sessionId = req.params.id;

    const session =
      await getSessionForUser(
        sessionId,
        req
      );

    if (!session) {
      return res.status(404).json({
        message: "Session not found",
      });
    }

    if (session.status !== "active") {
      return res.status(400).json({
        message: "Session is not active",
      });
    }

    const rotationSeconds = Number(
      process.env.QR_ROTATION_SECONDS || 10
    );

    const expiry = nextQrExpiry(
      rotationSeconds
    );

    const version =
      Number(session.qr_version || 0) + 1;

    await pool.query(
      `
      UPDATE attendance_sessions
      SET
        qr_version = ?,
        qr_expires_at = ?
      WHERE id = ?
      `,
      [
        version,
        expiry,
        sessionId,
      ]
    );

    const token = createQrToken(
      sessionId,
      version,
      expiry.toISOString()
    );

    const qrDataUrl =
      await QRCode.toDataURL(token);

    return res.json({
      token,
      version,
      expiresAt: expiry,
      rotationSeconds,
      qrDataUrl,
    });
  } catch (error) {
    console.error("Refresh QR error:", error);

    return res.status(500).json({
      message: "Failed to refresh QR",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
}

// ============================================================
// CLOSE SESSION
// ============================================================

async function close(req, res) {
  try {
    const sessionId = req.params.id;

    const session =
      await getSessionForUser(
        sessionId,
        req
      );

    if (!session) {
      return res.status(404).json({
        message: "Session not found",
      });
    }

    if (session.status !== "active") {
      return res.status(400).json({
        message: "Session is not active",
      });
    }

    const [result] = await pool.query(
      `
      UPDATE attendance_sessions
      SET
        status = 'closed',
        actual_end = NOW()
      WHERE id = ?
        AND status = 'active'
      `,
      [sessionId]
    );

    if (!result.affectedRows) {
      return res.status(400).json({
        message: "Active session not found",
      });
    }

    return res.json({
      message: "Session closed",
    });
  } catch (error) {
    console.error("Close session error:", error);

    return res.status(500).json({
      message: "Failed to close session",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
}

// ============================================================
// SESSION ROSTER
// ============================================================

async function roster(req, res) {
  try {
    const sessionId = req.params.id;

    const session =
      await getSessionForUser(
        sessionId,
        req
      );

    if (!session) {
      return res.status(404).json({
        message: "Session not found",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT
        sp.id AS student_id,

        sp.student_code,

        CONCAT(
          u.first_name,
          ' ',
          u.last_name
        ) AS student_name,

        ae.id AS attendance_id,

        COALESCE(
          ae.status,
          'absent'
        ) AS attendance_status,

        ae.scanned_at,
        ae.source

      FROM attendance_sessions ses

      INNER JOIN enrollments e
        ON e.section_id = ses.section_id

      INNER JOIN student_profiles sp
        ON sp.id = e.student_id

      INNER JOIN users u
        ON u.id = sp.user_id

      LEFT JOIN attendance_events ae
        ON ae.session_id = ses.id
        AND ae.student_id = sp.id

      WHERE ses.id = ?
        AND e.status = 'active'

      ORDER BY student_name
      `,
      [sessionId]
    );

    return res.json(rows);
  } catch (error) {
    console.error("Session roster error:", error);

    return res.status(500).json({
      message: "Failed to load session roster",
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
  list,
  mySessions,
  getById,
  create,
  open,
  refreshQr,
  close,
  roster,
};