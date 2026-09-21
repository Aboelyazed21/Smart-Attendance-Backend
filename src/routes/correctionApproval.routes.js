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
// APPROVE / REJECT CORRECTION REQUEST
// PATCH /api/correction-review/:id/approve
// ==========================================

router.patch(
  "/:id/approve",
  authenticate,
  requirePermission("correction.review"),
  async (req, res, next) => {
    try {
      req.body = {
        ...(req.body || {}),
        status: "approved",
      };

      req.params.id = req.params.id;

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