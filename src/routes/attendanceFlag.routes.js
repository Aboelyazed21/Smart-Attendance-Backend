const express = require("express");

const router = express.Router();

// ============================================================
// Middleware
// ============================================================

const {
  authenticate
} = require("../middleware/auth");

const {
  requirePermission,
  requireRole
} = require("../middleware/permission.middleware");

// ============================================================
// Controller
// ============================================================

const {
  getFlags,
  generateLowAttendanceFlags,
  resolveFlag
} = require("../controllers/attendanceFlag.controller");

// ============================================================
// GET FLAGS
// GET /api/attendance-flags
// ============================================================

router.get(
  "/attendance-flags",
  authenticate,
  requirePermission("report.view"),
  getFlags
);

// ============================================================
// GENERATE LOW ATTENDANCE FLAGS
// POST /api/attendance-flags/generate
// ============================================================

router.post(
  "/attendance-flags/generate",
  authenticate,
  requirePermission("report.view"),
  generateLowAttendanceFlags
);

// ============================================================
// RESOLVE FLAG
// PATCH /api/attendance-flags/:id/resolve
// ============================================================

router.patch(
  "/attendance-flags/:id/resolve",
  authenticate,
  requireRole(
    "admin",
    "lecturer",
    "ta"
  ),
  resolveFlag
);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;