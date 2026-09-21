const { pool } = require("../config/db");

async function list(req, res) {
  const [rows] = await pool.query(`
    SELECT
      e.id,
      e.student_id,
      sp.student_code,
      CONCAT(u.first_name, ' ', u.last_name) AS student_name,
      e.section_id,
      c.course_code,
      c.course_name,
      s.section_name,
      e.status,
      e.enrolled_at
    FROM enrollments e
    JOIN student_profiles sp ON sp.id = e.student_id
    JOIN users u ON u.id = sp.user_id
    JOIN sections s ON s.id = e.section_id
    JOIN courses c ON c.id = s.course_id
    ORDER BY e.id DESC
  `);
  res.json(rows);
}

async function create(req, res) {
  const { studentId, sectionId } = req.body;

  if (!studentId || !sectionId) {
    return res.status(400).json({ message: "studentId and sectionId are required" });
  }

  const [result] = await pool.query(`
    INSERT INTO enrollments
    (student_id, section_id)
    VALUES (?, ?)
  `, [studentId, sectionId]);

  res.status(201).json({ id: result.insertId, message: "Student enrolled" });
}

async function remove(req, res) {
  const [result] = await pool.query(
    "DELETE FROM enrollments WHERE id = ?",
    [req.params.id]
  );

  if (!result.affectedRows) return res.status(404).json({ message: "Enrollment not found" });

  res.json({ message: "Enrollment removed" });
}

module.exports = { list, create, remove };
