const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");

// ============================================================
// AUTHENTICATE
// ============================================================

async function authenticate(req, res, next) {
  const header =
    req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  const token = header.substring(7);

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // ========================================================
    // Load fresh permissions from database
    // ========================================================

    const [rows] = await pool.query(
      `
        SELECT DISTINCT
          p.name
        FROM users u

        INNER JOIN role_permissions rp
          ON rp.role_id = u.role_id

        INNER JOIN permissions p
          ON p.id = rp.permission_id

        WHERE u.id = ?

        ORDER BY p.name
      `,
      [decoded.id]
    );

    const permissions = rows.map(
      (row) => row.name
    );

    // ========================================================
    // Attach authenticated user
    // ========================================================

    req.user = {
      ...decoded,

      // Keep compatibility with controllers
      // that use req.user.userId
      userId: decoded.id,

      permissions,
    };

    next();

  } catch (error) {
    console.error(
      "Authentication error:",
      error
    );

    return res.status(401).json({
      message:
        "Invalid or expired token",
    });
  }
}

// ============================================================
// AUTHORIZE ROLE
// ============================================================

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message:
          "Authentication required",
      });
    }

    const currentRole = String(
      req.user.role || ""
    )
      .toLowerCase()
      .trim();

    const allowedRoles =
      roles.map((role) =>
        String(role)
          .toLowerCase()
          .trim()
      );

    if (
      !allowedRoles.includes(
        currentRole
      )
    ) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    next();
  };
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  authenticate,
  authorize,
};