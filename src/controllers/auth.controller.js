const bcrypt = require("bcryptjs");
const { pool } = require("../config/db");
const { signToken } = require("../utils/jwt");
const {
  generateResetToken,
  hashResetToken,
  sendPasswordResetEmail,
} = require("../utils/mailer");

// ============================================================
// GET USER PERMISSIONS
// ============================================================

async function getUserPermissions(userId) {
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
    [userId]
  );

  return rows.map((row) => row.name);
}

// ============================================================
// LOGIN
// ============================================================

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.password_hash,
        u.status,
        u.phone,
        u.last_login_at,
        r.name AS role_name
      FROM users u

      INNER JOIN roles r
        ON r.id = u.role_id

      WHERE u.email = ?

      LIMIT 1
      `,
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const user = rows[0];

    if (user.status !== "active") {
      return res.status(403).json({
        message: "User account is not active",
      });
    }

    const valid = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!valid) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // ========================================================
    // Get permissions
    // ========================================================

    const permissions =
      await getUserPermissions(user.id);

    // ========================================================
    // Update last login
    // ========================================================

    await pool.query(
      `
      UPDATE users
      SET last_login_at = NOW()
      WHERE id = ?
      `,
      [user.id]
    );

    // ========================================================
    // Add permissions before creating JWT
    // ========================================================

    user.permissions = permissions;

    // ========================================================
    // Create JWT
    // ========================================================

    const token = signToken(user);

    // Never return password hash
    delete user.password_hash;

    return res.json({
      message: "Login successful",
      token,
      user,
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Login failed",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
}

// ============================================================
// CURRENT USER
// GET /api/auth/me
// ============================================================

async function me(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.status,
        u.last_login_at,
        r.name AS role
      FROM users u

      INNER JOIN roles r
        ON r.id = u.role_id

      WHERE u.id = ?

      LIMIT 1
      `,
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const permissions =
      await getUserPermissions(userId);

    return res.json({
      user: {
        ...rows[0],
        permissions,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      message: "Failed to get current user",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
}

// ============================================================
// UPDATE CURRENT USER PROFILE
// PUT /api/auth/me
// ============================================================

async function updateMe(req, res) {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
    } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        message:
          "First name, last name and email are required",
      });
    }

    const normalizedFirstName =
      firstName.trim();

    const normalizedLastName =
      lastName.trim();

    const normalizedEmail =
      email.trim().toLowerCase();

    const normalizedPhone =
      phone === undefined ||
      phone === null ||
      phone === ""
        ? null
        : String(phone).trim();

    if (
      !normalizedFirstName ||
      !normalizedLastName ||
      !normalizedEmail
    ) {
      return res.status(400).json({
        message:
          "First name, last name and email are required",
      });
    }

    const [existing] = await pool.query(
      `
      SELECT id
      FROM users
      WHERE email = ?
        AND id <> ?
      LIMIT 1
      `,
      [
        normalizedEmail,
        req.user.id,
      ]
    );

    if (existing.length) {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }

    await pool.query(
      `
      UPDATE users
      SET
        first_name = ?,
        last_name = ?,
        email = ?,
        phone = ?
      WHERE id = ?
      `,
      [
        normalizedFirstName,
        normalizedLastName,
        normalizedEmail,
        normalizedPhone,
        req.user.id,
      ]
    );

    const [rows] = await pool.query(
      `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.status,
        u.last_login_at,
        r.name AS role
      FROM users u

      INNER JOIN roles r
        ON r.id = u.role_id

      WHERE u.id = ?

      LIMIT 1
      `,
      [req.user.id]
    );

    const permissions =
      await getUserPermissions(req.user.id);

    return res.json({
      message:
        "Profile updated successfully",

      user: {
        ...rows[0],
        permissions,
      },
    });
  } catch (error) {
    console.error(
      "Update current user error:",
      error
    );

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message:
          "Email is already registered",
      });
    }

    return res.status(500).json({
      message:
        "Failed to update profile",

      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
}

// ============================================================
// CHANGE CURRENT USER PASSWORD
// PUT /api/auth/me/password
// ============================================================

async function changeMyPassword(req, res) {
  try {
    const {
      currentPassword,
      newPassword,
    } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message:
          "Current password and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message:
          "New password must be at least 8 characters",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        message:
          "New password must be different from the current password",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT password_hash
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const valid = await bcrypt.compare(
      currentPassword,
      rows[0].password_hash
    );

    if (!valid) {
      return res.status(401).json({
        message:
          "Current password is incorrect",
      });
    }

    const passwordHash =
      await bcrypt.hash(
        newPassword,
        10
      );

    await pool.query(
      `
      UPDATE users
      SET password_hash = ?
      WHERE id = ?
      `,
      [
        passwordHash,
        req.user.id,
      ]
    );

    return res.json({
      message:
        "Password changed successfully",
    });
  } catch (error) {
    console.error(
      "Change password error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to change password",

      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
}

// ============================================================
// REGISTER
// ============================================================

async function register(req, res) {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      role = "student",
      studentCode,
    } = req.body;

    if (
      !firstName ||
      !lastName ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        message:
          "Missing required fields",
      });
    }

    // Public registration is only for students
    if (role !== "student") {
      return res.status(403).json({
        message:
          "Public registration is only for students",
      });
    }

    const [roleRows] =
      await pool.query(
        `
        SELECT id
        FROM roles
        WHERE name = 'student'
        LIMIT 1
        `
      );

    if (!roleRows.length) {
      return res.status(500).json({
        message:
          "Student role is not configured",
      });
    }

    const passwordHash =
      await bcrypt.hash(
        password,
        10
      );

    const connection =
      await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [result] =
        await connection.query(
          `
          INSERT INTO users
          (
            role_id,
            first_name,
            last_name,
            email,
            password_hash
          )
          VALUES (?, ?, ?, ?, ?)
          `,
          [
            roleRows[0].id,
            firstName,
            lastName,
            email,
            passwordHash,
          ]
        );

      if (studentCode) {
        await connection.query(
          `
          INSERT INTO student_profiles
          (
            user_id,
            student_code
          )
          VALUES (?, ?)
          `,
          [
            result.insertId,
            studentCode,
          ]
        );
      }

      await connection.commit();

      return res.status(201).json({
        message:
          "Student registered successfully",

        userId:
          result.insertId,
      });
    } catch (error) {
      await connection.rollback();

      if (
        error.code ===
        "ER_DUP_ENTRY"
      ) {
        return res.status(409).json({
          message:
            "Email or student code already exists",
        });
      }

      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(
      "Register error:",
      error
    );

    return res.status(500).json({
      message:
        "Registration failed",

      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
}

// ============================================================
// FORGOT PASSWORD
// POST /api/auth/forgot-password
//
// Always returns the same message so account existence
// cannot be probed through response differences.
// ============================================================

async function forgotPassword(req, res) {
  try {
    const { email, identifier } = req.body || {};

    const rawIdentifier = String(
      email || identifier || ""
    ).trim();

    if (!rawIdentifier) {
      return res.status(400).json({
        message:
          "Email or university ID is required",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT
        u.id,
        u.first_name,
        u.email,
        u.status
      FROM users u
      LEFT JOIN student_profiles sp
        ON sp.user_id = u.id
      WHERE u.email = ?
        OR sp.student_code = ?
      LIMIT 1
      `,
      [rawIdentifier, rawIdentifier]
    );

    // Uniform response regardless of outcome.
    const done = () =>
      res.json({
        message:
          "If the account exists, a password reset link has been sent.",
      });

    if (!rows.length) {
      return done();
    }

    const account = rows[0];

    if (
      account.status !== "active" ||
      !account.email
    ) {
      return done();
    }

    const expiresMinutes = Number(
      process.env.RESET_TOKEN_EXPIRES_MINUTES || 60
    );

    const token = generateResetToken();

    await pool.query(
      `
      UPDATE users
      SET
        password_reset_token_hash = ?,
        password_reset_expires_at = DATE_ADD(NOW(), INTERVAL ? MINUTE)
      WHERE id = ?
      `,
      [
        hashResetToken(token),
        expiresMinutes,
        account.id,
      ]
    );

    try {
      await sendPasswordResetEmail({
        to: account.email,
        firstName: account.first_name,
        token,
        expiresMinutes,
      });
    } catch (mailError) {
      console.error(
        "Password reset email error:",
        mailError
      );
    }

    return done();
  } catch (error) {
    console.error(
      "Forgot password error:",
      error
    );

    return res.status(500).json({
      message:
        "Could not process the password reset request",
    });
  }
}

// ============================================================
// RESET PASSWORD
// POST /api/auth/reset-password
// ============================================================

async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body || {};

    if (!token || !newPassword) {
      return res.status(400).json({
        message:
          "Reset token and new password are required",
      });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({
        message:
          "New password must be at least 8 characters",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT id
      FROM users
      WHERE password_reset_token_hash = ?
        AND password_reset_expires_at IS NOT NULL
        AND password_reset_expires_at > NOW()
      LIMIT 1
      `,
      [hashResetToken(String(token))]
    );

    if (!rows.length) {
      return res.status(400).json({
        message:
          "This password reset link is invalid or has expired.",
      });
    }

    const passwordHash = await bcrypt.hash(
      String(newPassword),
      10
    );

    // Single-use: clear the token in the same update.
    const [result] = await pool.query(
      `
      UPDATE users
      SET
        password_hash = ?,
        password_reset_token_hash = NULL,
        password_reset_expires_at = NULL
      WHERE id = ?
        AND password_reset_token_hash IS NOT NULL
      `,
      [passwordHash, rows[0].id]
    );

    if (!result.affectedRows) {
      return res.status(400).json({
        message:
          "This password reset link is invalid or has expired.",
      });
    }

    return res.json({
      message:
        "Your password has been updated successfully.",
    });
  } catch (error) {
    console.error(
      "Reset password error:",
      error
    );

    return res.status(500).json({
      message: "Could not reset the password",
    });
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  login,
  me,
  updateMe,
  changeMyPassword,
  register,
  forgotPassword,
  resetPassword,
};