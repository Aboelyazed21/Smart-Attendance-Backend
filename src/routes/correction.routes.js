const express = require("express");

const router = express.Router();

// ==========================================
// Middleware
// ==========================================

const {
  authenticate
} = require("../middleware/auth");

const {
  requirePermission
} = require("../middleware/permission.middleware");

// ==========================================
// Controller
// ==========================================

const {
  updateAttendance
} = require("../controllers/corrections.controller");

// ==========================================
// MANUAL ATTENDANCE CORRECTION
// PATCH /api/corrections/:eventId
// ==========================================

router.patch(
  "/corrections/:eventId",
  authenticate,
  requirePermission("attendance.update"),
  updateAttendance
);

// ==========================================
// Export
// ==========================================

module.exports = router;