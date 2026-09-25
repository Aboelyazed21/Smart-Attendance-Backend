// ============================================================
// MAINTENANCE MODE ENFORCEMENT
// Blocks non-admin API usage with HTTP 503 while global
// maintenance mode is ON. Admin users always pass.
// Login / register / password recovery / public settings /
// admin APIs are never blocked here (admin login flow and
// admin recovery must keep working). Requests without a
// usable token pass through so `authenticate` can return
// the normal 401. Fail-open on infrastructure errors:
// a settings lookup failure must never take the API down.
// ============================================================

const jwt = require("jsonwebtoken");
const {
  getMaintenanceState,
} = require("../utils/platformSettings");

const EXEMPT_PATHS = new Set([
  "/health",
  "/api/settings/public",
  "/api/login",
  "/api/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
]);

function isExempt(path) {
  if (EXEMPT_PATHS.has(path)) {
    return true;
  }

  // Admin APIs enforce their own authorization and must
  // stay reachable so admins can disable maintenance.
  if (path === "/api/admin" || path.startsWith("/api/admin/")) {
    return true;
  }

  return false;
}

function tokenRole(req) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  try {
    const decoded = jwt.verify(
      header.substring(7),
      process.env.JWT_SECRET
    );

    return String(decoded.role || "")
      .toLowerCase()
      .trim();
  } catch {
    return null;
  }
}

async function maintenanceGuard(req, res, next) {
  try {
    if (req.method === "OPTIONS") {
      return next();
    }

    const path = req.path;

    if (!path.startsWith("/api/") && path !== "/health") {
      return next();
    }

    if (isExempt(path)) {
      return next();
    }

    const state = await getMaintenanceState();

    if (!state.maintenanceMode) {
      return next();
    }

    const role = tokenRole(req);

    // No (or invalid) token: let `authenticate`
    // return the standard 401.
    if (!role) {
      return next();
    }

    if (role === "admin") {
      return next();
    }

    return res.status(503).json({
      maintenance: true,
      message: state.maintenanceMessage,
      maintenanceUntil: state.maintenanceUntil,
    });
  } catch (error) {
    console.error("Maintenance guard error:", error.message);

    return next();
  }
}

module.exports = {
  maintenanceGuard,
  isExempt,
};
