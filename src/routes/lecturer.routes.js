const express = require("express");

const router = express.Router();

const { authenticate } = require("../middleware/auth");

const {
  requireRole,
} = require("../middleware/permission.middleware");

const {
  getDashboardStats,
} = require("../controllers/lecturerDashboard.controller");

const {
  getAssignedSections,
} = require("../controllers/lecturerSection.controller");

/* =========================================================
   LECTURER DASHBOARD
   GET /api/lecturer-dashboard/stats
========================================================= */

router.get(
  "/lecturer-dashboard/stats",
  authenticate,
  requireRole("lecturer", "instructor"),
  getDashboardStats
);

/* =========================================================
   LECTURER SECTIONS
   GET /api/lecturer/sections
========================================================= */

router.get(
  "/lecturer/sections",
  authenticate,
  requireRole("lecturer", "instructor"),
  getAssignedSections
);

module.exports = router;