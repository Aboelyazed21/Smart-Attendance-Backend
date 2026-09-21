const { pool } = require("../config/db");

async function list(req, res) {
  const [rows] = await pool.query(
    "SELECT * FROM courses ORDER BY id DESC"
  );
  res.json(rows);
}

async function create(req, res) {
  const { courseCode, courseName, description, creditHours = 3 } = req.body;

  if (!courseCode || !courseName) {
    return res.status(400).json({ message: "courseCode and courseName are required" });
  }

  const [result] = await pool.query(`
    INSERT INTO courses
    (course_code, course_name, description, credit_hours)
    VALUES (?, ?, ?, ?)
  `, [courseCode, courseName, description || null, creditHours]);

  res.status(201).json({ id: result.insertId, message: "Course created" });
}

async function update(req, res) {
  const { courseName, description, creditHours } = req.body;

  const [result] = await pool.query(`
    UPDATE courses
    SET course_name = COALESCE(?, course_name),
        description = COALESCE(?, description),
        credit_hours = COALESCE(?, credit_hours)
    WHERE id = ?
  `, [courseName ?? null, description ?? null, creditHours ?? null, req.params.id]);

  if (!result.affectedRows) return res.status(404).json({ message: "Course not found" });

  res.json({ message: "Course updated" });
}

async function remove(req, res) {
  const [result] = await pool.query(
    "DELETE FROM courses WHERE id = ?",
    [req.params.id]
  );

  if (!result.affectedRows) return res.status(404).json({ message: "Course not found" });

  res.json({ message: "Course deleted" });
}

module.exports = { list, create, update, remove };
