const express = require("express");

const router = express.Router();

// ============================================================
// Middleware
// ============================================================

const {
  authenticate
} = require("../../middleware/auth");

const {
  requirePermission
} = require("../../middleware/permission.middleware");

// ============================================================
// Controller
// ============================================================

const {
  list
} = require("../controllers/audit.controller");

// ============================================================
// GET AUDIT LOGS
// GET /api/audit
// ============================================================

router.get(
  "/",
  authenticate,
  requirePermission("audit.view"),
  list
);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
