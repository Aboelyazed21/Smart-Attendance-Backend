const { pool } = require("../config/db");

/*
|--------------------------------------------------------------------------
| Lecturer Sections
|--------------------------------------------------------------------------
| يرجع الـ Sections المسندة للدكتور المسجل دخوله فقط.
|--------------------------------------------------------------------------
*/

async function getAssignedSections(req, res) {
  try {
    const lecturerId =
      req.user?.id || req.user?.userId;

    if (!lecturerId) {
      return res.status(401).json({
        message: "Lecturer authentication data not found",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT
        s.id AS section_id,
        s.section_name,
        s.academic_year,
        s.semester,

        c.id AS course_id,
        c.course_code,
        c.course_name,

        COUNT(DISTINCT e.student_id) AS enrolled_students

      FROM sections s

      INNER JOIN courses c
        ON c.id = s.course_id

      LEFT JOIN enrollments e
        ON e.section_id = s.id
        AND e.status = 'active'

      WHERE s.lecturer_id = ?

      GROUP BY
        s.id,
        s.section_name,
        s.academic_year,
        s.semester,
        c.id,
        c.course_code,
        c.course_name

      ORDER BY
        c.course_code ASC,
        s.section_name ASC
      `,
      [lecturerId]
    );

    return res.json({
      success: true,
      count: rows.length,
      sections: rows,
    });
  } catch (error) {
    console.error(
      "Get lecturer sections error:",
      error
    );

    return res.status(500).json({
      message: "Could not load lecturer sections",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
}

module.exports = {
  getAssignedSections,
};