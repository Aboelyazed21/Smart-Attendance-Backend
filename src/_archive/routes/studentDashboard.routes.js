const express = require("express");

const router = express.Router();

// ==========================================
// Middleware
// ==========================================

const { authenticate } = require("../../middleware/auth");

// ==========================================
// Controller
// ==========================================

const {
  studentDashboard,
} = require("../../controllers/reports.controller");

// ==========================================
// Student - Dashboard Statistics
// GET /api/student-dashboard/stats
// ==========================================

router.get(
  "/stats",
  authenticate,
  studentDashboard
);

// ==========================================
// Export
// ==========================================

module.exports = router;