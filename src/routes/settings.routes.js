const express = require("express");

const {
  getPublicSettings,
} = require("../utils/platformSettings");

const router = express.Router();

// ============================================================
// PUBLIC PLATFORM SETTINGS (no authentication)
// GET /api/settings/public
// Returns ONLY safe non-sensitive values. Never secrets.
// ============================================================

router.get("/public", async (req, res) => {
  try {
    return res.json(await getPublicSettings());
  } catch (error) {
    console.error("Public settings error:", error.message);

    return res.status(500).json({
      message: "Failed to load platform settings",
    });
  }
});

module.exports = router;
