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
  review,
} = require("../controllers/corrections.controller");

// ==========================================
// REJECT CORRECTION REQUEST
// PATCH /api/correction-review/:id/reject
// ==========================================

router.patch(
  "/:id/reject",
  authenticate,
  requirePermission("correction.review"),
  async (req, res, next) => {
    try {
      req.body = {
        ...(req.body || {}),
        status: "rejected",
      };

      return await review(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// ==========================================
// Export
// ==========================================

module.exports = router;