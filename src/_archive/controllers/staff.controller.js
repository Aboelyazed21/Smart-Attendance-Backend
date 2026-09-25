const { pool } = require("../../config/db");

async function list(req, res) {
  const [rows] = await pool.query(`
    SELECT
      sp.id, sp.staff_code, sp.department, sp.job_title,
      u.id AS user_id, u.first_name, u.last_name,
      u.email, u.phone, r.name AS role
    FROM staff_profiles sp
    JOIN users u ON u.id = sp.user_id
    JOIN roles r ON r.id = u.role_id
    ORDER BY sp.id DESC
  `);
  res.json(rows);
}

module.exports = { list };
