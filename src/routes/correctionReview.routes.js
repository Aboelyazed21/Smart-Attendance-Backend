const express = require("express");

const router = express.Router();

// ==========================================
// Middleware
// ==========================================

const { authenticate } = require("../middleware/auth");

const {
  requirePermission,
} = require("../middleware/permission.middleware");

// ==========================================
// Controller
// ==========================================

const {
  list,
} = require("../controllers/corrections.controller");

// ==========================================
// GET CORRECTION REQUESTS
// GET /api/correction-review/pending
// ==========================================

router.get(
  "/pending",
  authenticate,
  requirePermission("correction.review"),
  list
);

// ==========================================
// Export
// ==========================================

module.exports = router;