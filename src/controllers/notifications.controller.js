const { pool } = require("../config/db");

async function mine(req, res) {
  const [rows] = await pool.query(`
    SELECT *
    FROM notifications
    WHERE user_id = ?
    ORDER BY id DESC
  `, [req.user.id]);

  res.json(rows);
}

async function markRead(req, res) {
  const [result] = await pool.query(`
    UPDATE notifications
    SET is_read = TRUE
    WHERE id = ? AND user_id = ?
  `, [req.params.id, req.user.id]);

  if (!result.affectedRows) {
    return res.status(404).json({ message: "Notification not found" });
  }

  res.json({ message: "Notification marked as read" });
}

module.exports = { mine, markRead };
