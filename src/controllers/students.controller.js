const { pool } = require("../config/db");
const bcrypt = require("bcryptjs");
const {
  PASSWORD_ERROR,
  PHONE_ERROR,
  FIRST_NAME_ERROR,
  LAST_NAME_ERROR,
  normalizeName,
  isValidName,
  normalizeEgyptianPhone,
  isValidEgyptianPhone,
  isValidPassword,
} = require("../utils/validation");

// ============================================================
// GET ALL STUDENTS
// GET /api/students
// ============================================================
async function list(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT
        sp.id AS student_id,
        sp.student_code,
        u.id AS user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.status,
        u.created_at
      FROM student_profiles sp
      JOIN users u ON u.id = sp.user_id
      ORDER BY u.first_name ASC, u.last_name ASC
    `);

    res.json(rows);
  } catch (error) {
    console.error("Get students error:", error);

    res.status(500).json({
      message: "Failed to load students",
      error: error.message,
    });
  }
}

// ============================================================
// GET STUDENT BY ID
// GET /api/students/:id
// ============================================================
async function getById(req, res) {
  try {
    const studentId = Number(req.params.id);

    if (!studentId) {
      return res.status(400).json({
        message: "Invalid student id",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT
        sp.id AS student_id,
        sp.student_code,
        u.id AS user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.status,
        u.created_at
      FROM student_profiles sp
      JOIN users u ON u.id = sp.user_id
      WHERE sp.id = ?
      LIMIT 1
      `,
      [studentId]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Get student error:", error);

    res.status(500).json({
      message: "Failed to load student",
      error: error.message,
    });
  }
}

// ============================================================
// CREATE STUDENT
// POST /api/students
// Body:
// {
//   firstName,
//   lastName,
//   email,
//   phone,
//   studentCode,
//   password
// }
// ============================================================
async function create(req, res) {
  const connection = await pool.getConnection();

  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      studentCode,
      password,
    } = req.body;

    if (
      !firstName ||
      !lastName ||
      !email ||
      !studentCode ||
      !password
    ) {
      return res.status(400).json({
        message:
          "firstName, lastName, email, studentCode and password are required",
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

    if (
      phone !== undefined &&
      phone !== null &&
      String(phone).trim() !== "" &&
      !isValidEgyptianPhone(
        normalizeEgyptianPhone(phone)
      )
    ) {
      return res.status(400).json({
        message: PHONE_ERROR,
      });
    }

    await connection.beginTransaction();

    const [existingUser] = await connection.query(
      `
      SELECT id
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [email.trim()]
    );

    if (existingUser.length) {
      await connection.rollback();

      return res.status(409).json({
        message: "Email is already registered",
      });
    }

    const [existingCode] = await connection.query(
      `
      SELECT id
      FROM student_profiles
      WHERE student_code = ?
      LIMIT 1
      `,
      [studentCode.trim()]
    );

    if (existingCode.length) {
      await connection.rollback();

      return res.status(409).json({
        message: "Student code already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    /*
      Student role
    */
    const [roles] = await connection.query(
      `
      SELECT id
      FROM roles
      WHERE name = 'student'
      LIMIT 1
      `
    );

    if (!roles.length) {
      await connection.rollback();

      return res.status(500).json({
        message: "Student role not found",
      });
    }

    const roleId = roles[0].id;

    const [userResult] = await connection.query(
      `
      INSERT INTO users
        (
          first_name,
          last_name,
          email,
          phone,
          password_hash,
          role_id,
          status
        )
      VALUES
        (?, ?, ?, ?, ?, ?, 'active')
      `,
      [
        normalizeName(firstName),
        normalizeName(lastName),
        email.trim(),
        phone === undefined ||
        phone === null ||
        String(phone).trim() === ""
          ? null
          : normalizeEgyptianPhone(phone),
        passwordHash,
        roleId,
      ]
    );

    const userId = userResult.insertId;

    const [studentResult] = await connection.query(
      `
      INSERT INTO student_profiles
        (
          user_id,
          student_code
        )
      VALUES
        (?, ?)
      `,
      [userId, studentCode.trim()]
    );

    await connection.commit();

    res.status(201).json({
      message: "Student created successfully",
      studentId: studentResult.insertId,
      userId,
    });
  } catch (error) {
    await connection.rollback();

    console.error("Create student error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Student data already exists",
      });
    }

    res.status(500).json({
      message: "Failed to create student",
      error: error.message,
    });
  } finally {
    connection.release();
  }
}

// ============================================================
// UPDATE STUDENT
// PUT /api/students/:id
// ============================================================
async function update(req, res) {
  const connection = await pool.getConnection();

  try {
    const studentId = Number(req.params.id);

    if (!studentId) {
      return res.status(400).json({
        message: "Invalid student id",
      });
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      studentCode,
      status,
      password,
    } = req.body;

    const [students] = await connection.query(
      `
      SELECT
        sp.id AS student_id,
        sp.user_id
      FROM student_profiles sp
      WHERE sp.id = ?
      LIMIT 1
      `,
      [studentId]
    );

    if (!students.length) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    const student = students[0];

    await connection.beginTransaction();

    if (studentCode !== undefined) {
      const [existingCode] = await connection.query(
        `
        SELECT id
        FROM student_profiles
        WHERE student_code = ?
          AND id <> ?
        LIMIT 1
        `,
        [studentCode.trim(), studentId]
      );

      if (existingCode.length) {
        await connection.rollback();

        return res.status(409).json({
          message: "Student code already exists",
        });
      }

      await connection.query(
        `
        UPDATE student_profiles
        SET student_code = ?
        WHERE id = ?
        `,
        [studentCode.trim(), studentId]
      );
    }

    if (email !== undefined) {
      const [existingEmail] = await connection.query(
        `
        SELECT id
        FROM users
        WHERE email = ?
          AND id <> ?
        LIMIT 1
        `,
        [email.trim(), student.user_id]
      );

      if (existingEmail.length) {
        await connection.rollback();

        return res.status(409).json({
          message: "Email is already registered",
        });
      }
    }

    const fields = [];
    const values = [];

    if (firstName !== undefined) {
      if (
        !isValidName(normalizeName(firstName))
      ) {
        await connection.rollback();

        return res.status(400).json({
          message: FIRST_NAME_ERROR,
        });
      }

      fields.push("first_name = ?");
      values.push(normalizeName(firstName));
    }

    if (lastName !== undefined) {
      if (
        !isValidName(normalizeName(lastName))
      ) {
        await connection.rollback();

        return res.status(400).json({
          message: LAST_NAME_ERROR,
        });
      }

      fields.push("last_name = ?");
      values.push(normalizeName(lastName));
    }

    if (email !== undefined) {
      fields.push("email = ?");
      values.push(email.trim());
    }

    if (phone !== undefined) {
      const normalizedPhone =
        phone === null ||
        String(phone).trim() === ""
          ? null
          : normalizeEgyptianPhone(phone);

      if (
        normalizedPhone !== null &&
        !isValidEgyptianPhone(normalizedPhone)
      ) {
        await connection.rollback();

        return res.status(400).json({
          message: PHONE_ERROR,
        });
      }

      fields.push("phone = ?");
      values.push(normalizedPhone);
    }

    if (status !== undefined) {
      fields.push("status = ?");
      values.push(status);
    }

    if (password) {
      if (!isValidPassword(password)) {
        await connection.rollback();

        return res.status(400).json({
          message: PASSWORD_ERROR,
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      fields.push("password_hash = ?");
      values.push(passwordHash);
    }

    if (fields.length) {
      values.push(student.user_id);

      await connection.query(
        `
        UPDATE users
        SET ${fields.join(", ")}
        WHERE id = ?
        `,
        values
      );
    }

    await connection.commit();

    res.json({
      message: "Student updated successfully",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Update student error:", error);

    res.status(500).json({
      message: "Failed to update student",
      error: error.message,
    });
  } finally {
    connection.release();
  }
}

// ============================================================
// DELETE STUDENT
// DELETE /api/students/:id
// ============================================================
async function remove(req, res) {
  const connection = await pool.getConnection();

  try {
    const studentId = Number(req.params.id);

    if (!studentId) {
      return res.status(400).json({
        message: "Invalid student id",
      });
    }

    const [students] = await connection.query(
      `
      SELECT user_id
      FROM student_profiles
      WHERE id = ?
      LIMIT 1
      `,
      [studentId]
    );

    if (!students.length) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    const userId = students[0].user_id;

    await connection.beginTransaction();

    /*
      Remove enrollments first.
    */
    await connection.query(
      `
      DELETE FROM enrollments
      WHERE student_id = ?
      `,
      [studentId]
    );

    /*
      Remove student profile.
    */
    await connection.query(
      `
      DELETE FROM student_profiles
      WHERE id = ?
      `,
      [studentId]
    );

    /*
      Remove user account.
    */
    await connection.query(
      `
      DELETE FROM users
      WHERE id = ?
      `,
      [userId]
    );

    await connection.commit();

    res.json({
      message: "Student deleted successfully",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Delete student error:", error);

    res.status(500).json({
      message: "Failed to delete student",
      error: error.message,
    });
  } finally {
    connection.release();
  }
}

// ============================================================
// GET STUDENT ENROLLMENTS
// GET /api/students/:id/enrollments
// ============================================================
async function getEnrollments(req, res) {
  try {
    const studentId = Number(req.params.id);

    if (!studentId) {
      return res.status(400).json({
        message: "Invalid student id",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT
        e.id AS enrollment_id,
        e.student_id,
        e.section_id,
        e.status AS enrollment_status,

        sec.section_name,
        sec.academic_year,
        sec.semester,

        c.id AS course_id,
        c.course_code,
        c.course_name,

        CONCAT(
          COALESCE(lecturer.first_name, ''),
          ' ',
          COALESCE(lecturer.last_name, '')
        ) AS lecturer_name

      FROM enrollments e

      JOIN sections sec
        ON sec.id = e.section_id

      JOIN courses c
        ON c.id = sec.course_id

      LEFT JOIN users lecturer
        ON lecturer.id = sec.lecturer_id

      WHERE e.student_id = ?

      ORDER BY
        c.course_code ASC,
        sec.section_name ASC
      `,
      [studentId]
    );

    res.json(rows);
  } catch (error) {
    console.error("Get student enrollments error:", error);

    res.status(500).json({
      message: "Failed to load student enrollments",
      error: error.message,
    });
  }
}

// ============================================================
// ENROLL STUDENT
// POST /api/students/:id/enrollments
// Body: { sectionId }
// ============================================================
async function enroll(req, res) {
  try {
    const studentId = Number(req.params.id);
    const { sectionId } = req.body;

    if (!studentId) {
      return res.status(400).json({
        message: "Invalid student id",
      });
    }

    if (!sectionId) {
      return res.status(400).json({
        message: "sectionId is required",
      });
    }

    const sectionIdNumber = Number(sectionId);

    if (!sectionIdNumber) {
      return res.status(400).json({
        message: "Invalid section id",
      });
    }

    const [students] = await pool.query(
      `
      SELECT id
      FROM student_profiles
      WHERE id = ?
      LIMIT 1
      `,
      [studentId]
    );

    if (!students.length) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    const [sections] = await pool.query(
      `
      SELECT
        id,
        course_id,
        section_name,
        capacity
      FROM sections
      WHERE id = ?
      LIMIT 1
      `,
      [sectionIdNumber]
    );

    if (!sections.length) {
      return res.status(404).json({
        message: "Section not found",
      });
    }

    const section = sections[0];

    const [existing] = await pool.query(
      `
      SELECT id, status
      FROM enrollments
      WHERE student_id = ?
        AND section_id = ?
      LIMIT 1
      `,
      [studentId, sectionIdNumber]
    );

    if (existing.length) {
      if (existing[0].status === "active") {
        return res.status(409).json({
          message: "Student is already enrolled in this section",
        });
      }

      await pool.query(
        `
        UPDATE enrollments
        SET status = 'active'
        WHERE id = ?
        `,
        [existing[0].id]
      );

      return res.json({
        message: "Student enrollment reactivated successfully",
        enrollmentId: existing[0].id,
        studentId,
        sectionId: sectionIdNumber,
      });
    }

    if (
      section.capacity !== null &&
      section.capacity !== undefined
    ) {
      const [countRows] = await pool.query(
        `
        SELECT COUNT(*) AS total
        FROM enrollments
        WHERE section_id = ?
          AND status = 'active'
        `,
        [sectionIdNumber]
      );

      const currentCount = Number(countRows[0].total);

      if (currentCount >= Number(section.capacity)) {
        return res.status(400).json({
          message: "Section is full",
        });
      }
    }

    const [result] = await pool.query(
      `
      INSERT INTO enrollments
        (student_id, section_id, status)
      VALUES
        (?, ?, 'active')
      `,
      [studentId, sectionIdNumber]
    );

    res.status(201).json({
      message: "Student enrolled successfully",
      enrollmentId: result.insertId,
      studentId,
      sectionId: sectionIdNumber,
    });
  } catch (error) {
    console.error("Enroll student error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Student is already enrolled in this section",
      });
    }

    res.status(500).json({
      message: "Failed to enroll student",
      error: error.message,
    });
  }
}

// ============================================================
// REMOVE ENROLLMENT
// DELETE /api/students/enrollments/:enrollmentId
// ============================================================
async function removeEnrollment(req, res) {
  try {
    const enrollmentId = Number(req.params.enrollmentId);

    if (!enrollmentId) {
      return res.status(400).json({
        message: "Invalid enrollment id",
      });
    }

    const [result] = await pool.query(
      `
      UPDATE enrollments
      SET status = 'dropped'
      WHERE id = ?
      `,
      [enrollmentId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "Enrollment not found",
      });
    }

    res.json({
      message: "Student removed from section successfully",
    });
  } catch (error) {
    console.error("Remove enrollment error:", error);

    res.status(500).json({
      message: "Failed to remove enrollment",
      error: error.message,
    });
  }
}

// ============================================================
// GET AVAILABLE SECTIONS
// GET /api/students/sections/available
// ============================================================
async function getAvailableSections(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT
        sec.id AS section_id,
        sec.section_name,
        sec.academic_year,
        sec.semester,
        sec.capacity,

        c.id AS course_id,
        c.course_code,
        c.course_name,

        CONCAT(
          COALESCE(u.first_name, ''),
          ' ',
          COALESCE(u.last_name, '')
        ) AS lecturer_name,

        (
          SELECT COUNT(*)
          FROM enrollments e
          WHERE e.section_id = sec.id
            AND e.status = 'active'
        ) AS enrolled_count

      FROM sections sec

      JOIN courses c
        ON c.id = sec.course_id

      LEFT JOIN users u
        ON u.id = sec.lecturer_id

      ORDER BY
        c.course_code ASC,
        sec.section_name ASC
    `);

    const formatted = rows.map((section) => {
      const enrolledCount = Number(
        section.enrolled_count || 0
      );

      const capacity =
        section.capacity === null ||
        section.capacity === undefined
          ? null
          : Number(section.capacity);

      return {
        ...section,
        enrolled_count: enrolledCount,
        available_seats:
          capacity !== null
            ? Math.max(capacity - enrolledCount, 0)
            : null,
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error("Get available sections error:", error);

    res.status(500).json({
      message: "Failed to load available sections",
      error: error.message,
    });
  }
}

// ============================================================
// CURRENT STUDENT PROFILE
// GET /api/students/me
// ============================================================
async function me(req, res) {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        sp.id AS student_id,
        sp.student_code,
        u.id AS user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.status

      FROM student_profiles sp

      JOIN users u
        ON u.id = sp.user_id

      WHERE sp.user_id = ?

      LIMIT 1
      `,
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "Student profile not found",
      });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Get current student error:", error);

    res.status(500).json({
      message: "Failed to load student profile",
      error: error.message,
    });
  }
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  getEnrollments,
  enroll,
  removeEnrollment,
  getAvailableSections,
  me,
};