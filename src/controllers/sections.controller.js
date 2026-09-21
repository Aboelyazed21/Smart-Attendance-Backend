const { pool } = require("../config/db");

/* =========================================================
   LIST ALL SECTIONS
========================================================= */

async function list(req, res) {
  const [rows] = await pool.query(`
    SELECT
      s.id,
      s.course_id,
      s.section_name,
      s.academic_year,
      s.semester,
      s.capacity,
      c.course_code,
      c.course_name,
      s.lecturer_id,
      CONCAT(
        COALESCE(u.first_name, ''),
        ' ',
        COALESCE(u.last_name, '')
      ) AS lecturer_name
    FROM sections s
    JOIN courses c
      ON c.id = s.course_id
    LEFT JOIN users u
      ON u.id = s.lecturer_id
    ORDER BY s.id DESC
  `);

  res.json(rows);
}

/* =========================================================
   LIST LECTURER ASSIGNED SECTIONS
========================================================= */

async function getAssignedSections(req, res) {
  const lecturerId = req.user?.id;

  if (!lecturerId) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  const [rows] = await pool.query(
    `
      SELECT
        s.id,
        s.course_id,
        s.section_name,
        s.academic_year,
        s.semester,
        s.capacity,
        c.course_code,
        c.course_name,
        s.lecturer_id,
        CONCAT(
          COALESCE(u.first_name, ''),
          ' ',
          COALESCE(u.last_name, '')
        ) AS lecturer_name
      FROM sections s
      JOIN courses c
        ON c.id = s.course_id
      LEFT JOIN users u
        ON u.id = s.lecturer_id
      WHERE s.lecturer_id = ?
      ORDER BY s.id DESC
    `,
    [lecturerId]
  );

  res.json(rows);
}

/* =========================================================
   CREATE SECTION
========================================================= */

async function create(req, res) {
  const {
    courseId,
    sectionName,
    academicYear,
    semester,
    lecturerId,
    capacity = 100,
  } = req.body;

  if (
    !courseId ||
    !sectionName ||
    !academicYear ||
    !semester
  ) {
    return res.status(400).json({
      message: "Missing required fields",
    });
  }

  const [result] = await pool.query(
    `
      INSERT INTO sections
      (
        course_id,
        section_name,
        academic_year,
        semester,
        lecturer_id,
        capacity
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      courseId,
      sectionName,
      academicYear,
      semester,
      lecturerId || null,
      capacity,
    ]
  );

  res.status(201).json({
    id: result.insertId,
    message: "Section created",
  });
}

/* =========================================================
   UPDATE SECTION
========================================================= */

async function update(req, res) {
  const {
    courseId,
    sectionName,
    academicYear,
    semester,
    lecturerId,
    capacity,
  } = req.body;

  const [result] = await pool.query(
    `
      UPDATE sections
      SET
        course_id = COALESCE(?, course_id),
        section_name = COALESCE(?, section_name),
        academic_year = COALESCE(?, academic_year),
        semester = COALESCE(?, semester),
        lecturer_id = ?,
        capacity = COALESCE(?, capacity)
      WHERE id = ?
    `,
    [
      courseId ?? null,
      sectionName ?? null,
      academicYear ?? null,
      semester ?? null,
      lecturerId || null,
      capacity ?? null,
      req.params.id,
    ]
  );

  if (!result.affectedRows) {
    return res.status(404).json({
      message: "Section not found",
    });
  }

  res.json({
    message: "Section updated",
  });
}

/* =========================================================
   DELETE SECTION
========================================================= */

async function remove(req, res) {
  const [result] = await pool.query(
    `
      DELETE FROM sections
      WHERE id = ?
    `,
    [req.params.id]
  );

  if (!result.affectedRows) {
    return res.status(404).json({
      message: "Section not found",
    });
  }

  res.json({
    message: "Section deleted",
  });
}

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  list,
  getAssignedSections,
  create,
  update,
  remove,
};