const express = require("express");

const router = express.Router();

// ==========================================
// Middleware
// ==========================================

const { authenticate } = require("../middleware/auth");

// ==========================================
// Controller
// ==========================================

const {
  dashboard,
} = require("../controllers/reports.controller");

// ==========================================
// Lecturer - Dashboard Statistics
// GET /api/lecturer-dashboard/stats
// ==========================================

router.get(
  "/stats",
  authenticate,
  dashboard
);

// ==========================================
// Export
// ==========================================

module.exports = router;