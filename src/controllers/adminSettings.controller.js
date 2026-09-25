// ============================================================
// ADMIN PLATFORM SETTINGS
// Admin-only management of platformName + maintenance mode.
// GET  /api/admin/settings  (settings.view)
// PATCH /api/admin/settings (settings.manage)
// Only whitelisted keys are ever written (see
// utils/platformSettings.validatePatch).
// ============================================================

const {
  getPublicSettings,
  updatePlatformSettings,
} = require("../utils/platformSettings");

async function getSettings(req, res) {
  try {
    return res.json(await getPublicSettings());
  } catch (error) {
    console.error("Admin settings error:", error);

    return res.status(500).json({
      message: "Failed to load platform settings",
    });
  }
}

async function updateSettings(req, res) {
  try {
    const settings = await updatePlatformSettings(
      req.body || {},
      req.user?.id || req.user?.userId || null
    );

    return res.json(settings);
  } catch (error) {
    console.error("Admin settings update error:", error);

    return res.status(error.status || 500).json({
      message:
        error.message ||
        "Failed to update platform settings",
    });
  }
}

module.exports = {
  getSettings,
  updateSettings,
};
