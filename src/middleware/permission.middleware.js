const { pool } = require("../config/db");

// ============================================================
// GET USER ROLE
// ============================================================

function getUserRole(user) {
  return String(
    user?.role ||
    user?.role_name ||
    ""
  )
    .toLowerCase()
    .trim();
}

// ============================================================
// GET USER PERMISSIONS FROM DATABASE
// ============================================================

async function getPermissionsByRole(role) {
  const [rows] = await pool.query(
    `
      SELECT p.name
      FROM permissions p
      INNER JOIN role_permissions rp
        ON rp.permission_id = p.id
      INNER JOIN roles r
        ON r.id = rp.role_id
      WHERE LOWER(r.name) = LOWER(?)
    `,
    [role]
  );

  return rows.map((row) => row.name);
}

// ============================================================
// REQUIRE PERMISSION
// ============================================================

function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: "Authentication required"
        });
      }

      const role = getUserRole(req.user);

      // ======================================================
      // ADMIN HAS FULL ACCESS
      // ======================================================

      if (role === "admin") {
        return next();
      }

      // ======================================================
      // LOAD PERMISSIONS DIRECTLY FROM DATABASE
      // ======================================================

      const permissions = await getPermissionsByRole(role);

      // ======================================================
      // CHECK PERMISSION
      // ======================================================

      if (!permissions.includes(permission)) {
        return res.status(403).json({
          message: "Permission denied",
          requiredPermission: permission,
          role,
          permissions
        });
      }

      next();

    } catch (error) {
      console.error(
        "Permission middleware error:",
        error
      );

      return res.status(500).json({
        message: "Failed to verify permissions",
        error: error.message
      });
    }
  };
}

// ============================================================
// REQUIRE ROLE
// ============================================================

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required"
      });
    }

    const currentRole = getUserRole(req.user);

    const normalizedRoles = allowedRoles.map((role) =>
      String(role)
        .toLowerCase()
        .trim()
    );

    if (!normalizedRoles.includes(currentRole)) {
      return res.status(403).json({
        message: "Access denied",
        allowedRoles,
        currentRole
      });
    }

    next();
  };
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  requirePermission,
  requireRole
};