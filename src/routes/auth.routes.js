const express = require("express");

const {
  login,
  me,
  updateMe,
  changeMyPassword,
  register
} = require("../controllers/auth.controller");

const {
  authenticate
} = require("../middleware/auth");

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

module.exports = router;