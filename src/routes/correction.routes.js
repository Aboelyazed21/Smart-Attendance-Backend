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
  list,
  myRequests,
  review,
  updateAttendance,
} = require("../controllers/corrections.controller");

// ==========================================
// STAFF CORRECTION INBOX (LECTURER / ADMIN)
// ==========================================

// GET /api/corrections?status=&sectionId=
// Lecturer sees only own sections, admin sees all.
router.get(
  "/corrections",
  authenticate,
  requirePermission("correction.review"),
  list
);

// ==========================================
// REVIEW CORRECTION REQUEST
// PATCH /api/corrections/:id/review
// Body: { status: approved|rejected, reviewerComment?, finalStatus? }
// ==========================================

router.patch(
  "/corrections/:id/review",
  authenticate,
  requirePermission("correction.review"),
  review
);

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