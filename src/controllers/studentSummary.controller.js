// ============================================================
// STUDENT ATTENDANCE SUMMARY
// GET /api/student/attendance/summary
// Student-only. Identity always comes from the JWT
// (student_profiles.user_id = authenticated user id).
// The frontend never supplies a student id.
// ============================================================

const { pool } = require("../config/db");
const {
  getStudentSummary,
} = require("../utils/attendanceSummary");

async function summary(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: "Authentication is required",
      });
    }

    const [studentRows] = await pool.query(
      `
      SELECT id
      FROM student_profiles
      WHERE user_id = ?
      LIMIT 1
      `,
      [req.user.id]
    );

    if (!studentRows.length) {
      return res.status(404).json({
        message: "Student profile not found",
      });
    }

    const data = await getStudentSummary(
      pool,
      studentRows[0].id
    );

    return res.json(data);
  } catch (error) {
    console.error(
      "Student attendance summary error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to load attendance summary",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
}

module.exports = {
  summary,
};
