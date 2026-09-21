const { pool } = require("../config/db");

/* ============================================================
   HELPERS
============================================================ */

function getUserId(req) {
  return Number(
    req.user?.userId ||
    req.user?.id
  );
}

function getUserRole(req) {
  return String(
    req.user?.role ||
    req.user?.role_name ||
    ""
  )
    .toLowerCase()
    .trim();
}

/* ============================================================
   GET LECTURER SECTIONS
   GET /api/lecturer/enrollment/sections
============================================================ */

async function getLecturerSections(req, res) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const role = getUserRole(req);

    if (
      role !== "lecturer" &&
      role !== "instructor" &&
      role !== "ta"
    ) {
      return res.status(403).json({
        success: false,
        message: "Only lecturers can manage course students",
      });
    }

    const [rows] = await pool.query(
      `
        SELECT
          s.id AS section_id,
          s.course_id,
          s.section_name,
          s.academic_year,
          s.semester,
          s.capacity,

          c.course_code,
          c.course_name,
          c.description,
          c.credit_hours,

          COUNT(
            CASE
              WHEN e.status = 'active'
              THEN e.id
            END
          ) AS enrolled_students

        FROM sections s

        INNER JOIN courses c
          ON c.id = s.course_id

        LEFT JOIN enrollments e
          ON e.section_id = s.id

        WHERE s.lecturer_id = ?

        GROUP BY
          s.id,
          s.course_id,
          s.section_name,
          s.academic_year,
          s.semester,
          s.capacity,
          c.course_code,
          c.course_name,
          c.description,
          c.credit_hours

        ORDER BY
          c.course_name ASC,
          s.section_name ASC
      `,
      [userId]
    );

    return res.json({
      success: true,
      count: rows.length,
      sections: rows,
    });
  } catch (error) {
    console.error(
      "Get lecturer sections error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load lecturer sections",
    });
  }
}

/* ============================================================
   GET STUDENTS IN SECTION
   GET /api/lecturer/enrollment/sections/:sectionId/students
============================================================ */

async function getSectionStudents(req, res) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const sectionId = Number(
      req.params.sectionId
    );

    if (
      !Number.isInteger(sectionId) ||
      sectionId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid section ID",
      });
    }

    /* --------------------------------------------------------
       Verify that section belongs to lecturer
    -------------------------------------------------------- */

    const [sectionRows] = await pool.query(
      `
        SELECT
          s.id,
          s.course_id,
          s.section_name,
          s.capacity,

          c.course_code,
          c.course_name

        FROM sections s

        INNER JOIN courses c
          ON c.id = s.course_id

        WHERE s.id = ?
          AND s.lecturer_id = ?

        LIMIT 1
      `,
      [
        sectionId,
        userId,
      ]
    );

    if (!sectionRows.length) {
      return res.status(404).json({
        success: false,
        message:
          "Section not found or not assigned to you",
      });
    }

    const section = sectionRows[0];

    /* --------------------------------------------------------
       Get enrolled students
    -------------------------------------------------------- */

    const [students] = await pool.query(
      `
        SELECT
          e.id AS enrollment_id,
          e.status AS enrollment_status,
          e.enrolled_at,

          sp.id AS student_id,
          sp.student_code,
          sp.university_id,
          sp.department,
          sp.level,
          sp.academic_year,

          u.id AS user_id,
          u.first_name,
          u.last_name,
          CONCAT(
            u.first_name,
            ' ',
            u.last_name
          ) AS student_name,
          u.email,
          u.phone,
          u.status AS user_status

        FROM enrollments e

        INNER JOIN student_profiles sp
          ON sp.id = e.student_id

        INNER JOIN users u
          ON u.id = sp.user_id

        WHERE e.section_id = ?

        ORDER BY
          u.first_name ASC,
          u.last_name ASC
      `,
      [sectionId]
    );

    return res.json({
      success: true,

      section: {
        id: section.id,
        course_id: section.course_id,
        section_name: section.section_name,
        course_code: section.course_code,
        course_name: section.course_name,
        capacity: section.capacity,
      },

      count: students.length,

      students,
    });
  } catch (error) {
    console.error(
      "Get section students error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load section students",
    });
  }
}

/* ============================================================
   ADD STUDENT BY EMAIL
   POST /api/lecturer/enrollment/sections/:sectionId/students
============================================================ */

async function addStudentToSection(req, res) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const sectionId = Number(
      req.params.sectionId
    );

    const email = String(
      req.body?.email || ""
    )
      .trim()
      .toLowerCase();

    if (
      !Number.isInteger(sectionId) ||
      sectionId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid section ID",
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Student email is required",
      });
    }

    /* --------------------------------------------------------
       Validate email
    -------------------------------------------------------- */

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    /* --------------------------------------------------------
       Verify lecturer owns section
    -------------------------------------------------------- */

    const [sectionRows] = await pool.query(
      `
        SELECT
          s.id,
          s.course_id,
          s.section_name,
          s.capacity,

          c.course_code,
          c.course_name

        FROM sections s

        INNER JOIN courses c
          ON c.id = s.course_id

        WHERE s.id = ?
          AND s.lecturer_id = ?

        LIMIT 1
      `,
      [
        sectionId,
        userId,
      ]
    );

    if (!sectionRows.length) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to manage this section",
      });
    }

    const section = sectionRows[0];

    /* --------------------------------------------------------
       Find student by email
    -------------------------------------------------------- */

    const [studentRows] = await pool.query(
      `
        SELECT
          sp.id AS student_id,
          sp.student_code,
          sp.university_id,

          u.id AS user_id,
          u.first_name,
          u.last_name,
          u.email,
          u.status AS user_status

        FROM users u

        INNER JOIN student_profiles sp
          ON sp.user_id = u.id

        WHERE LOWER(u.email) = ?

        LIMIT 1
      `,
      [email]
    );

    if (!studentRows.length) {
      return res.status(404).json({
        success: false,
        message:
          "No student account was found with this email",
      });
    }

    const student = studentRows[0];

    /* --------------------------------------------------------
       Student account must be active
    -------------------------------------------------------- */

    if (student.user_status !== "active") {
      return res.status(400).json({
        success: false,
        message:
          "This student account is not active",
      });
    }

    /* --------------------------------------------------------
       Check existing enrollment
    -------------------------------------------------------- */

    const [existingRows] = await pool.query(
      `
        SELECT
          id,
          status
        FROM enrollments
        WHERE student_id = ?
          AND section_id = ?
        LIMIT 1
      `,
      [
        student.student_id,
        sectionId,
      ]
    );

    if (existingRows.length) {
      const existing =
        existingRows[0];

      /* ------------------------------------------------------
         Already active
      ------------------------------------------------------ */

      if (existing.status === "active") {
        return res.status(409).json({
          success: false,
          message:
            "This student is already enrolled in this section",
          enrollmentId: existing.id,
        });
      }

      /* ------------------------------------------------------
         Reactivate dropped/completed enrollment
      ------------------------------------------------------ */

      if (
        existing.status === "dropped" ||
        existing.status === "completed"
      ) {
        const [capacityRows] =
          await pool.query(
            `
              SELECT
                capacity,

                (
                  SELECT COUNT(*)
                  FROM enrollments
                  WHERE section_id = ?
                    AND status = 'active'
                ) AS active_students

              FROM sections

              WHERE id = ?

              LIMIT 1
            `,
            [
              sectionId,
              sectionId,
            ]
          );

        if (capacityRows.length) {
          const capacity =
            capacityRows[0].capacity;

          const activeStudents =
            Number(
              capacityRows[0]
                .active_students || 0
            );

          if (
            capacity !== null &&
            capacity !== undefined &&
            activeStudents >=
              Number(capacity)
          ) {
            return res.status(409).json({
              success: false,
              message:
                "This section has reached its maximum capacity",
            });
          }
        }

        await pool.query(
          `
            UPDATE enrollments

            SET
              status = 'active',
              enrolled_at = CURRENT_TIMESTAMP

            WHERE id = ?
          `,
          [existing.id]
        );

        return res.status(200).json({
          success: true,
          message:
            "Student enrollment has been reactivated",
          enrollmentId: existing.id,

          student: {
            id: student.student_id,
            name:
              `${student.first_name} ${student.last_name}`.trim(),
            email: student.email,
            studentCode:
              student.student_code,
          },

          section: {
            id: section.id,
            courseCode:
              section.course_code,
            courseName:
              section.course_name,
            sectionName:
              section.section_name,
          },
        });
      }
    }

    /* --------------------------------------------------------
       Check section capacity
    -------------------------------------------------------- */

    const [capacityRows] =
      await pool.query(
        `
          SELECT
            capacity,

            (
              SELECT COUNT(*)
              FROM enrollments
              WHERE section_id = ?
                AND status = 'active'
            ) AS active_students

          FROM sections

          WHERE id = ?

          LIMIT 1
        `,
        [
          sectionId,
          sectionId,
        ]
      );

    if (capacityRows.length) {
      const capacity =
        capacityRows[0].capacity;

      const activeStudents =
        Number(
          capacityRows[0]
            .active_students || 0
        );

      if (
        capacity !== null &&
        capacity !== undefined &&
        activeStudents >=
          Number(capacity)
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This section has reached its maximum capacity",
        });
      }
    }

    /* --------------------------------------------------------
       Create enrollment
    -------------------------------------------------------- */

    const [result] = await pool.query(
      `
        INSERT INTO enrollments
        (
          student_id,
          section_id,
          status,
          enrolled_at
        )

        VALUES
        (
          ?,
          ?,
          'active',
          CURRENT_TIMESTAMP
        )
      `,
      [
        student.student_id,
        sectionId,
      ]
    );

    return res.status(201).json({
      success: true,

      message:
        "Student added to the section successfully",

      enrollmentId:
        result.insertId,

      student: {
        id: student.student_id,

        name:
          `${student.first_name} ${student.last_name}`.trim(),

        email: student.email,

        studentCode:
          student.student_code,

        universityId:
          student.university_id,
      },

      section: {
        id: section.id,

        courseCode:
          section.course_code,

        courseName:
          section.course_name,

        sectionName:
          section.section_name,
      },
    });
  } catch (error) {
    console.error(
      "Add student to section error:",
      error
    );

    /* --------------------------------------------------------
       Duplicate protection
    -------------------------------------------------------- */

    if (
      error.code ===
      "ER_DUP_ENTRY"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This student is already enrolled in this section",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to add student to section",
    });
  }
}

/* ============================================================
   REMOVE STUDENT FROM SECTION
   DELETE /api/lecturer/enrollment/:enrollmentId
============================================================ */

async function removeStudentFromSection(
  req,
  res
) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const enrollmentId = Number(
      req.params.enrollmentId
    );

    if (
      !Number.isInteger(
        enrollmentId
      ) ||
      enrollmentId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid enrollment ID",
      });
    }

    /* --------------------------------------------------------
       Find enrollment and verify ownership
    -------------------------------------------------------- */

    const [rows] = await pool.query(
      `
        SELECT
          e.id AS enrollment_id,
          e.status AS enrollment_status,

          sp.id AS student_id,

          u.first_name,
          u.last_name,
          u.email,

          s.id AS section_id,
          s.section_name,
          s.lecturer_id,

          c.course_code,
          c.course_name

        FROM enrollments e

        INNER JOIN student_profiles sp
          ON sp.id = e.student_id

        INNER JOIN users u
          ON u.id = sp.user_id

        INNER JOIN sections s
          ON s.id = e.section_id

        INNER JOIN courses c
          ON c.id = s.course_id

        WHERE e.id = ?

        LIMIT 1
      `,
      [enrollmentId]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message:
          "Enrollment not found",
      });
    }

    const enrollment =
      rows[0];

    /* --------------------------------------------------------
       Lecturer ownership
    -------------------------------------------------------- */

    if (
      Number(
        enrollment.lecturer_id
      ) !== Number(userId)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to remove this student",
      });
    }

    /* --------------------------------------------------------
       Don't physically delete.
       Change status to dropped.
       This keeps attendance/history safe.
    -------------------------------------------------------- */

    if (
      enrollment.enrollment_status ===
      "dropped"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This student is already removed from the section",
      });
    }

    await pool.query(
      `
        UPDATE enrollments

        SET status = 'dropped'

        WHERE id = ?
      `,
      [enrollmentId]
    );

    return res.json({
      success: true,

      message:
        "Student removed from the section successfully",

      enrollmentId,

      student: {
        id:
          enrollment.student_id,

        name:
          `${enrollment.first_name} ${enrollment.last_name}`.trim(),

        email:
          enrollment.email,
      },

      section: {
        id:
          enrollment.section_id,

        courseCode:
          enrollment.course_code,

        courseName:
          enrollment.course_name,

        sectionName:
          enrollment.section_name,
      },
    });
  } catch (error) {
    console.error(
      "Remove student from section error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to remove student from section",
    });
  }
}

/* ============================================================
   EXPORTS
============================================================ */

module.exports = {
  getLecturerSections,
  getSectionStudents,
  addStudentToSection,
  removeStudentFromSection,
};