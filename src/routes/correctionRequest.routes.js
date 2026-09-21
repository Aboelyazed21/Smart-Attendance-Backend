const express = require("express");

const { authenticate } = require("../middleware/auth");

const {
  create,
} = require("../controllers/corrections.controller");

const router = express.Router();

// ==========================================
// Create Student Correction Request
// POST /api/correction-request/
// ==========================================

router.post(
  "/",
  authenticate,
  create
);

module.exports = router;