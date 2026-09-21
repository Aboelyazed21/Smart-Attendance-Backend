const express = require("express");

const {
  authenticate
} = require("../middleware/auth");

const {
  chat
} = require("../controllers/chatbot.controller");

const router = express.Router();

// ==========================================
// Student Chatbot
// POST /api/chatbot
// ==========================================

router.post(
  "/",
  authenticate,
  chat
);

module.exports = router;