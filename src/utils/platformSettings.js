// ============================================================
// PLATFORM SETTINGS (single source of truth)
// Persisted in MySQL (platform_settings table). Only
// non-sensitive keys live here — NEVER secrets. Reads are
// cached in memory with a short TTL; writes invalidate
// the cache immediately. Backend restart-safe (MySQL).
// ============================================================

const { pool } = require("../config/db");

const CACHE_TTL_MS = 30 * 1000;

const DEFAULTS = {
  platformName: "Attendify",
  maintenanceMode: "false",
  maintenanceMessage:
    "The platform is currently under maintenance. " +
    "Please check back soon.",
  maintenanceUntil: "",
};

let cache = null;
let cacheAt = 0;

function isFresh() {
  return (
    cache && Date.now() - cacheAt < CACHE_TTL_MS
  );
}

function invalidateCache() {
  cache = null;
  cacheAt = 0;
}

async function readAllRaw() {
  const values = { ...DEFAULTS };

  try {
    const [rows] = await pool.query(
      "SELECT setting_key, setting_value FROM platform_settings"
    );

    for (const row of rows) {
      if (row.setting_key in values) {
        values[row.setting_key] =
          row.setting_value == null
            ? ""
            : String(row.setting_value);
      }
    }
  } catch (error) {
    // Table missing (migration not applied yet):
    // fall back to defaults.
    if (error.code !== "ER_NO_SUCH_TABLE") {
      throw error;
    }
  }

  return values;
}

async function getAllSettings() {
  if (isFresh()) {
    return cache;
  }

  const values = await readAllRaw();

  cache = values;
  cacheAt = Date.now();

  return values;
}

function toPublicShape(values) {
  const maintenanceUntil =
    values.maintenanceUntil &&
    values.maintenanceUntil.trim()
      ? values.maintenanceUntil.trim()
      : null;

  return {
    platformName:
      (values.platformName &&
        values.platformName.trim()) ||
      DEFAULTS.platformName,
    maintenanceMode:
      String(values.maintenanceMode).toLowerCase() ===
      "true",
    maintenanceMessage:
      (values.maintenanceMessage &&
        values.maintenanceMessage.trim()) ||
      DEFAULTS.maintenanceMessage,
    maintenanceUntil,
  };
}

async function getPublicSettings() {
  return toPublicShape(await getAllSettings());
}

async function getPlatformName() {
  const values = await getAllSettings();

  return (
    (values.platformName &&
      values.platformName.trim()) ||
    process.env.APP_NAME ||
    DEFAULTS.platformName
  );
}

async function getMaintenanceState() {
  const values = await getAllSettings();

  return {
    maintenanceMode:
      String(values.maintenanceMode).toLowerCase() ===
      "true",
    maintenanceMessage:
      (values.maintenanceMessage &&
        values.maintenanceMessage.trim()) ||
      DEFAULTS.maintenanceMessage,
    maintenanceUntil:
      values.maintenanceUntil &&
      values.maintenanceUntil.trim()
        ? values.maintenanceUntil.trim()
        : null,
  };
}

function validatePatch(patch) {
  if (!patch || typeof patch !== "object") {
    throw Object.assign(
      new Error("No settings provided"),
      { status: 400 }
    );
  }

  const out = {};

  if (patch.platformName !== undefined) {
    if (typeof patch.platformName !== "string") {
      throw Object.assign(
        new Error("platformName must be a string"),
        { status: 400 }
      );
    }

    const name = patch.platformName.trim();

    if (!name) {
      throw Object.assign(
        new Error("platformName must not be empty"),
        { status: 400 }
      );
    }

    if (name.length > 80) {
      throw Object.assign(
        new Error(
          "platformName must be 80 characters or fewer"
        ),
        { status: 400 }
      );
    }

    out.platformName = name;
  }

  if (patch.maintenanceMode !== undefined) {
    if (typeof patch.maintenanceMode === "boolean") {
      out.maintenanceMode = patch.maintenanceMode
        ? "true"
        : "false";
    } else if (
      patch.maintenanceMode === "true" ||
      patch.maintenanceMode === "false"
    ) {
      out.maintenanceMode = patch.maintenanceMode;
    } else {
      throw Object.assign(
        new Error("maintenanceMode must be a boolean"),
        { status: 400 }
      );
    }
  }

  if (patch.maintenanceMessage !== undefined) {
    if (typeof patch.maintenanceMessage !== "string") {
      throw Object.assign(
        new Error("maintenanceMessage must be a string"),
        { status: 400 }
      );
    }

    const message = patch.maintenanceMessage.trim();

    if (message.length > 500) {
      throw Object.assign(
        new Error(
          "maintenanceMessage must be 500 characters or fewer"
        ),
        { status: 400 }
      );
    }

    out.maintenanceMessage = message;
  }

  if (patch.maintenanceUntil !== undefined) {
    if (
      patch.maintenanceUntil === null ||
      patch.maintenanceUntil === ""
    ) {
      out.maintenanceUntil = "";
    } else if (
      typeof patch.maintenanceUntil === "string" &&
      patch.maintenanceUntil.trim().length <= 100 &&
      !Number.isNaN(
        Date.parse(patch.maintenanceUntil.trim())
      )
    ) {
      out.maintenanceUntil = patch.maintenanceUntil.trim();
    } else {
      throw Object.assign(
        new Error(
          "maintenanceUntil must be a valid date/time or empty"
        ),
        { status: 400 }
      );
    }
  }

  // Whitelist enforced: unknown keys are never written.
  if (!Object.keys(out).length) {
    throw Object.assign(
      new Error("No valid settings provided"),
      { status: 400 }
    );
  }

  return out;
}

async function updatePlatformSettings(patch, adminId) {
  const values = validatePatch(patch);

  for (const [key, value] of Object.entries(values)) {
    await pool.query(
      `
      INSERT INTO platform_settings
        (setting_key, setting_value, updated_by)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        setting_value = VALUES(setting_value),
        updated_by = VALUES(updated_by)
      `,
      [key, value, adminId || null]
    );
  }

  invalidateCache();

  return toPublicShape(await getAllSettings());
}

module.exports = {
  getAllSettings,
  getPublicSettings,
  getPlatformName,
  getMaintenanceState,
  updatePlatformSettings,
  validatePatch,
  invalidateCache,
};
