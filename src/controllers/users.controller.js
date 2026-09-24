const bcrypt = require("bcryptjs");
const { pool } = require("../config/db");
const {
  PASSWORD_ERROR,
  FIRST_NAME_ERROR,
  LAST_NAME_ERROR,
  normalizeName,
  isValidName,
  isValidPassword,
} = require("../utils/validation");

/* =========================================================
   GET ALL USERS
========================================================= */

async function list(req, res) {
  const [rows] = await pool.query(`
    SELECT
      u.id,
      u.first_name,
      u.last_name,
      u.email,
      u.phone,
      u.status,
      r.name AS role,
      u.created_at
    FROM users u
    JOIN roles r ON r.id = u.role_id
    ORDER BY u.id DESC
  `);

  res.json(rows);
}

/* =========================================================
   CREATE USER
========================================================= */

async function create(req, res) {
  const {
    firstName,
    lastName,
    email,
    password,
    role,
    phone,
  } = req.body;

  if (
    !firstName ||
    !lastName ||
    !email ||
    !password ||
    !role
  ) {
    return res.status(400).json({
      message: "Missing required fields",
    });
  }

  if (!isValidName(normalizeName(firstName))) {
    return res.status(400).json({
      message: FIRST_NAME_ERROR,
    });
  }

  if (!isValidName(normalizeName(lastName))) {
    return res.status(400).json({
      message: LAST_NAME_ERROR,
    });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({
      message: PASSWORD_ERROR,
    });
  }

  const [roles] = await pool.query(
    "SELECT id FROM roles WHERE name = ? LIMIT 1",
    [role]
  );

  if (!roles.length) {
    return res.status(400).json({
      message: "Invalid role",
    });
  }

  const hash = await bcrypt.hash(password, 10);

  try {
    const [result] = await pool.query(
      `
      INSERT INTO users
      (
        role_id,
        first_name,
        last_name,
        email,
        password_hash,
        phone
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        roles[0].id,
        firstName,
        lastName,
        email,
        hash,
        phone || null,
      ]
    );

    res.status(201).json({
      id: result.insertId,
      message: "User created successfully",
    });

  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Email already exists",
      });
    }

    throw error;
  }
}

/* =========================================================
   UPDATE USER
========================================================= */

async function update(req, res) {
  const userId = req.params.id;

  const {
    firstName,
    lastName,
    email,
    password,
    role,
    phone,
    status,
  } = req.body;

  if (
    !firstName ||
    !lastName ||
    !email ||
    !role ||
    !status
  ) {
    return res.status(400).json({
      message: "Missing required fields",
    });
  }

  if (!isValidName(normalizeName(firstName))) {
    return res.status(400).json({
      message: FIRST_NAME_ERROR,
    });
  }

  if (!isValidName(normalizeName(lastName))) {
    return res.status(400).json({
      message: LAST_NAME_ERROR,
    });
  }

  if (
    password &&
    password.trim() &&
    !isValidPassword(password)
  ) {
    return res.status(400).json({
      message: PASSWORD_ERROR,
    });
  }

  const [roles] = await pool.query(
    "SELECT id FROM roles WHERE name = ? LIMIT 1",
    [role]
  );

  if (!roles.length) {
    return res.status(400).json({
      message: "Invalid role",
    });
  }

  try {
    let result;

    /* ================= WITH PASSWORD ================= */

    if (password && password.trim()) {
      const hash = await bcrypt.hash(password, 10);

      [result] = await pool.query(
        `
        UPDATE users
        SET
          role_id = ?,
          first_name = ?,
          last_name = ?,
          email = ?,
          phone = ?,
          status = ?,
          password_hash = ?
        WHERE id = ?
        `,
        [
          roles[0].id,
          firstName,
          lastName,
          email,
          phone || null,
          status,
          hash,
          userId,
        ]
      );

    }

    /* ================= WITHOUT PASSWORD ================= */

    else {
      [result] = await pool.query(
        `
        UPDATE users
        SET
          role_id = ?,
          first_name = ?,
          last_name = ?,
          email = ?,
          phone = ?,
          status = ?
        WHERE id = ?
        `,
        [
          roles[0].id,
          firstName,
          lastName,
          email,
          phone || null,
          status,
          userId,
        ]
      );
    }

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      message: "User updated successfully",
    });

  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Email already exists",
      });
    }

    throw error;
  }
}

/* =========================================================
   DELETE USER
========================================================= */

async function remove(req, res) {
  const [result] = await pool.query(
    "DELETE FROM users WHERE id = ?",
    [req.params.id]
  );

  if (!result.affectedRows) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  res.json({
    message: "User deleted successfully",
  });
}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  list,
  create,
  update,
  remove,
};