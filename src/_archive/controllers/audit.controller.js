const { pool } = require("../../config/db");

async function list(req, res) {
  const [rows] = await pool.query(`
    SELECT
      a.*,
      CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,'')) AS actor_name
    FROM audit_events a
    LEFT JOIN users u ON u.id = a.actor_id
    ORDER BY a.id DESC
    LIMIT 500
  `);

  res.json(rows);
}

module.exports = { list };
