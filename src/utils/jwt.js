const jwt = require("jsonwebtoken");

// ============================================================
// CREATE JWT TOKEN
// ============================================================

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role_name || user.role,

      // Important:
      // Store user permissions inside JWT
      // so requirePermission() can read them.
      permissions: Array.isArray(user.permissions)
        ? user.permissions
        : [],
    },
    process.env.JWT_SECRET,
    {
      expiresIn:
        process.env.JWT_EXPIRES_IN || "1d",
    }
  );
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  signToken,
};