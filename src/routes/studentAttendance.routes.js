const express = require("express");

const router = express.Router();

const { authenticate } = require("../middleware/auth");

const {
  requireRole,
} = require("../middleware/permission.middleware");

const studentSummaryController = require("../controllers/studentSummary.controller");

// ============================================================
// STUDENT ATTENDANCE SUMMARY
// GET /api/student/attendance/summary
// ============================================================

router.get(
  "/summary",
  authenticate,
  requireRole("student"),
  studentSummaryController.summary
);

module.exports = router;
