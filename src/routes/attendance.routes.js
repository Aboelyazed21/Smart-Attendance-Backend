const express = require("express");

const router = express.Router();

// ==========================================
// Middleware
// ==========================================

const {
  authenticate,
} = require("../middleware/auth");

const {
  requireStudentForScan,
} = require("../middleware/attendanceScan.middleware");

const {
  qrScanRateLimit,
} = require("../middleware/qrRateLimit.middleware");

// ==========================================
// Controller
// ==========================================

const attendanceController =
  require("../controllers/attendance.controller");

// ==========================================
// STUDENT QR SCAN
// POST /api/attendance/scan
// ==========================================

router.post(
  "/attendance/scan",
  authenticate,
  requireStudentForScan,
  qrScanRateLimit,
  attendanceController.scan
);

// ==========================================
// ATTENDANCE LIST
// GET /api/attendance
// ==========================================

router.get(
  "/attendance",
  authenticate,
  attendanceController.list
);

// ==========================================
// MY ATTENDANCE
// GET /api/attendance/my
// ==========================================

router.get(
  "/attendance/my",
  authenticate,
  attendanceController.myAttendance
);

// ==========================================
// MANUAL UPDATE
// PUT /api/attendance/:id
//
// Used by lecturer to update an existing
// attendance record.
// ==========================================

router.put(
  "/attendance/:id",
  authenticate,
  attendanceController.manualUpdate
);

// ==========================================
// Export
// ==========================================

module.exports = router;