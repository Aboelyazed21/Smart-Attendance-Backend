const express = require("express");

const router = express.Router();

// ==========================================
// Middleware
// ==========================================

const {
  authenticate,
} = require("../middleware/auth");

const {
  requirePermission,
} = require("../middleware/permission.middleware");

// ==========================================
// Controller
// ==========================================

const {
  create,
  myRequests,
  updateAttendance,
} = require("../controllers/corrections.controller");

// ==========================================
// STUDENT CORRECTION REQUESTS
// ==========================================

// GET /api/corrections/me
// Get current student's correction requests
router.get(
  "/corrections/me",
  authenticate,
  myRequests
);

// POST /api/corrections
// Create a new correction request
router.post(
  "/corrections",
  authenticate,
  create
);

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