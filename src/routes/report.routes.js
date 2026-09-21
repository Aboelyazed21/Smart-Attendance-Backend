const express = require("express");

const router = express.Router();

// ============================================================
// Middleware
// ============================================================

const { authenticate } = require("../middleware/auth");
const {
  requirePermission,
} = require("../middleware/permission.middleware");

// ============================================================
// Controller
// ============================================================

const {
  attendanceSummary,
  courseSummary,
  dashboard,
} = require("../controllers/reports.controller");

// ============================================================
// DASHBOARD REPORT
// GET /api/reports/dashboard
// ============================================================

router.get(
  "/reports/dashboard",
  authenticate,
  dashboard
);

// ============================================================
// ATTENDANCE REPORT
// GET /api/reports/attendance
// ============================================================

router.get(
  "/reports/attendance",
  authenticate,
  requirePermission("report.view"),
  attendanceSummary
);

// ============================================================
// STUDENT SUMMARY
// GET /api/reports/students
// ============================================================

router.get(
  "/reports/students",
  authenticate,
  requirePermission("report.view"),
  attendanceSummary
);

// ============================================================
// COURSE SUMMARY
// GET /api/reports/courses
// ============================================================

router.get(
  "/reports/courses",
  authenticate,
  requirePermission("report.view"),
  courseSummary
);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;