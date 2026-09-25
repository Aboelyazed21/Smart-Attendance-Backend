const { pool } = require("../config/db");

// ============================================================
// NOTIFICATION CENTER
//
// Unified in-app notifications for every role.
// A row is visible to a user when:
//   - notifications.user_id = user id (direct), OR
//   - notifications.user_id IS NULL
//     AND notifications.target_role = user role (broadcast)
// ============================================================

function getUserId(req) {
  return req.user?.id || req.user?.userId || null;
}

function getUserRole(req) {
  return String(
    req.user?.role || req.user?.role_name || ""
  )
    .toLowerCase()
    .trim();
}

// ============================================================
// INTERNAL HELPER (used by other controllers)
// Never throws — notifications must never break the main flow.
// ============================================================

async function notify({
  userId = null,
  targetRole = null,
  type = "general",
  title = "",
  message = null,
  link = null,
}) {
  try {
    if (!title) return null;

    const [result] = await pool.query(
      `
      INSERT INTO notifications
        (user_id, target_role, type, title, message, link)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        userId,
        targetRole,
        String(type).slice(0, 50),
        String(title).slice(0, 255),
        message,
        link,
      ]
    );

    return result.insertId;
  } catch (error) {
    console.error(
      "Create notification error:",
      error.message
    );

    return null;
  }
}

// ============================================================
// GET /api/notifications
// Role-scoped feed + unread counter for the bell badge.
// ============================================================

async function list(req, res) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const role = getUserRole(req);

    const limit = Math.min(
      Math.max(Number(req.query.limit) || 30, 1),
      100
    );

    const [rows] = await pool.query(
      `
      SELECT
        id,
        type,
        title,
        message,
        link,
        is_read,
        created_at
      FROM notifications
      WHERE user_id = ?
         OR (user_id IS NULL AND target_role = ?)
      ORDER BY id DESC
      LIMIT ?
      `,
      [userId, role, limit]
    );

    const [[counter]] = await pool.query(
      `
      SELECT COUNT(*) AS unread
      FROM notifications
      WHERE is_read = 0
        AND (
          user_id = ?
          OR (user_id IS NULL AND target_role = ?)
        )
      `,
      [userId, role]
    );

    return res.json({
      notifications: rows.map((row) => ({
        ...row,
        is_read: Number(row.is_read) === 1,
      })),
      unread: Number(counter.unread || 0),
    });
  } catch (error) {
    console.error(
      "List notifications error:",
      error
    );

    return res.status(500).json({
      message: "Failed to load notifications",
    });
  }
}

// ============================================================
// PATCH /api/notifications/:id/read
// Users can only mark their OWN visible rows as read.
// ============================================================

async function markRead(req, res) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const role = getUserRole(req);
    const notificationId = Number(req.params.id);

    if (
      !Number.isInteger(notificationId) ||
      notificationId <= 0
    ) {
      return res.status(400).json({
        message: "Invalid notification id",
      });
    }

    const [result] = await pool.query(
      `
      UPDATE notifications
      SET is_read = 1
      WHERE id = ?
        AND (
          user_id = ?
          OR (user_id IS NULL AND target_role = ?)
        )
      `,
      [notificationId, userId, role]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    return res.json({
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error(
      "Mark notification read error:",
      error
    );

    return res.status(500).json({
      message: "Failed to update notification",
    });
  }
}

// ============================================================
// PATCH /api/notifications/read-all
// ============================================================

async function markAllRead(req, res) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const role = getUserRole(req);

    await pool.query(
      `
      UPDATE notifications
      SET is_read = 1
      WHERE is_read = 0
        AND (
          user_id = ?
          OR (user_id IS NULL AND target_role = ?)
        )
      `,
      [userId, role]
    );

    return res.json({
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error(
      "Mark all notifications read error:",
      error
    );

    return res.status(500).json({
      message: "Failed to update notifications",
    });
  }
}

module.exports = {
  notify,
  list,
  markRead,
  markAllRead,
};
