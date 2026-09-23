const express = require("express");

const {
  login,
  me,
  updateMe,
  changeMyPassword,
  register,
  forgotPassword,
  resetPassword,
} = require("../controllers/auth.controller");

const {
  authenticate
} = require("../middleware/auth");

const {
  authLimiter
} = require("../middleware/rateLimit");

const router = express.Router();

// ============================================================
// LOGIN
// POST /api/login
// ============================================================

router.post(
  "/login",
  login
);

// ============================================================
// REGISTER
// POST /api/register
// ============================================================

router.post(
  "/register",
  register
);

// ============================================================
// CURRENT USER
// GET /api/auth/me
// ============================================================

router.get(
  "/auth/me",
  authenticate,
  me
);

// ============================================================
// UPDATE CURRENT USER PROFILE
// PUT /api/auth/me
// ============================================================

router.put(
  "/auth/me",
  authenticate,
  updateMe
);

// ============================================================
// CHANGE CURRENT USER PASSWORD
// PUT /api/auth/me/password
// ============================================================

router.put(
  "/auth/me/password",
  authenticate,
  changeMyPassword
);

// ============================================================
// FORGOT PASSWORD
// POST /api/auth/forgot-password
// ============================================================

router.post(
  "/auth/forgot-password",
  authLimiter,
  forgotPassword
);

// ============================================================
// RESET PASSWORD
// POST /api/auth/reset-password
// ============================================================

router.post(
  "/auth/reset-password",
  authLimiter,
  resetPassword
);

module.exports = router;