const bcrypt = require("bcryptjs");
const db = require("../config/db");

// ============================================================
// USERS
// ============================================================

const getUsers = (req, res) => {
    const sql = `
        SELECT
            u.id,
            u.first_name,
            u.last_name,
            u.email,
            u.phone,
            u.status,
            u.last_login_at,
            u.created_at,
            u.updated_at,
            r.id AS role_id,
            r.name AS role_name
        FROM users u
        INNER JOIN roles r
            ON r.id = u.role_id
        ORDER BY u.id DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Get users error:", err);

            return res.status(500).json({
                success: false,
                message: "Could not load users"
            });
        }

        return res.json({
            success: true,
            count: results.length,
            users: results
        });
    });
};

const createUser = async (req, res) => {
    const {
        roleId,
        firstName,
        lastName,
        email,
        password,
        phone,
        status = "active"
    } = req.body;

    if (
        !roleId ||
        !firstName ||
        !lastName ||
        !email ||
        !password
    ) {
        return res.status(400).json({
            success: false,
            message:
                "roleId, firstName, lastName, email and password are required"
        });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 10);

        const sql = `
            INSERT INTO users
            (
                role_id,
                first_name,
                last_name,
                email,
                password_hash,
                phone,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(
            sql,
            [
                roleId,
                firstName,
                lastName,
                email,
                passwordHash,
                phone || null,
                status
            ],
            (err, result) => {
                if (err) {
                    console.error("Create user error:", err);

                    if (err.code === "ER_DUP_ENTRY") {
                        return res.status(409).json({
                            success: false,
                            message: "Email already exists"
                        });
                    }

                    return res.status(500).json({
                        success: false,
                        message: "Could not create user"
                    });
                }

                return res.status(201).json({
                    success: true,
                    message: "User created successfully",
                    userId: result.insertId
                });
            }
        );
    } catch (error) {
        console.error("Password hashing error:", error);

        return res.status(500).json({
            success: false,
            message: "Could not create user"
        });
    }
};

const updateUser = async (req, res) => {
    const userId = Number(req.params.id);

    if (!userId) {
        return res.status(400).json({
            success: false,
            message: "Invalid user ID"
        });
    }

    const {
        roleId,
        firstName,
        lastName,
        email,
        password,
        phone,
        status
    } = req.body;

    const fields = [];
    const values = [];

    if (roleId !== undefined) {
        fields.push("role_id = ?");
        values.push(roleId);
    }

    if (firstName !== undefined) {
        fields.push("first_name = ?");
        values.push(firstName);
    }

    if (lastName !== undefined) {
        fields.push("last_name = ?");
        values.push(lastName);
    }

    if (email !== undefined) {
        fields.push("email = ?");
        values.push(email);
    }

    if (phone !== undefined) {
        fields.push("phone = ?");
        values.push(phone);
    }

    if (status !== undefined) {
        const validStatuses = [
            "active",
            "inactive",
            "suspended"
        ];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status"
            });
        }

        fields.push("status = ?");
        values.push(status);
    }

    if (password) {
        try {
            const passwordHash = await bcrypt.hash(
                password,
                10
            );

            fields.push("password_hash = ?");
            values.push(passwordHash);
        } catch (error) {
            console.error(
                "Password hashing error:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Could not update password"
            });
        }
    }

    if (fields.length === 0) {
        return res.status(400).json({
            success: false,
            message: "No fields to update"
        });
    }

    fields.push("updated_at = NOW()");
    values.push(userId);

    const sql = `
        UPDATE users
        SET ${fields.join(", ")}
        WHERE id = ?
    `;

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Update user error:", err);

            if (err.code === "ER_DUP_ENTRY") {
                return res.status(409).json({
                    success: false,
                    message: "Email already exists"
                });
            }

            return res.status(500).json({
                success: false,
                message: "Could not update user"
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.json({
            success: true,
            message: "User updated successfully"
        });
    });
};

const deleteUser = (req, res) => {
    const userId = Number(req.params.id);

    if (!userId) {
        return res.status(400).json({
            success: false,
            message: "Invalid user ID"
        });
    }

    const sql = `
        UPDATE users
        SET
            status = 'inactive',
            updated_at = NOW()
        WHERE id = ?
    `;

    db.query(sql, [userId], (err, result) => {
        if (err) {
            console.error("Delete user error:", err);

            return res.status(500).json({
                success: false,
                message: "Could not deactivate user"
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.json({
            success: true,
            message: "User deactivated successfully"
        });
    });
};

// ============================================================
// STUDENTS
// ============================================================

const getStudents = (req, res) => {
    const sql = `
        SELECT
            sp.id AS student_id,
            sp.user_id,
            sp.student_code,
            sp.university_id,
            sp.department,
            sp.level,
            sp.academic_year,

            u.first_name,
            u.last_name,
            u.email,
            u.phone,
            u.status,
            u.last_login_at,
            u.created_at,
            u.updated_at

        FROM student_profiles sp

        INNER JOIN users u
            ON u.id = sp.user_id

        INNER JOIN roles r
            ON r.id = u.role_id

        WHERE r.name = 'student'

        ORDER BY sp.id DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Get students error:", err);

            return res.status(500).json({
                success: false,
                message: "Could not load students"
            });
        }

        return res.json({
            success: true,
            count: results.length,
            students: results
        });
    });
};

const getStudentById = (req, res) => {
    const studentId = Number(req.params.id);

    if (!studentId) {
        return res.status(400).json({
            success: false,
            message: "Invalid student ID"
        });
    }

    const sql = `
        SELECT
            sp.id AS student_id,
            sp.user_id,
            sp.student_code,
            sp.university_id,
            sp.department,
            sp.level,
            sp.academic_year,

            u.first_name,
            u.last_name,
            u.email,
            u.phone,
            u.status,
            u.last_login_at,
            u.created_at,
            u.updated_at

        FROM student_profiles sp

        INNER JOIN users u
            ON u.id = sp.user_id

        INNER JOIN roles r
            ON r.id = u.role_id

        WHERE
            sp.id = ?
            AND r.name = 'student'

        LIMIT 1
    `;

    db.query(sql, [studentId], (err, results) => {
        if (err) {
            console.error("Get student error:", err);

            return res.status(500).json({
                success: false,
                message: "Could not load student"
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });
        }

        return res.json({
            success: true,
            student: results[0]
        });
    });
};

const createStudent = async (req, res) => {
    const {
        firstName,
        lastName,
        email,
        password,
        phone,
        status = "active",
        studentCode,
        universityId,
        department,
        level,
        academicYear
    } = req.body;

    if (
        !firstName ||
        !lastName ||
        !email ||
        !password ||
        !studentCode
    ) {
        return res.status(400).json({
            success: false,
            message:
                "firstName, lastName, email, password and studentCode are required"
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            success: false,
            message:
                "Password must be at least 6 characters"
        });
    }

    const validStatuses = [
        "active",
        "inactive",
        "suspended"
    ];

    if (!validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: "Invalid student status"
        });
    }

    try {
        const [roles] = await db.promise().query(
            `
                SELECT id
                FROM roles
                WHERE name = 'student'
                LIMIT 1
            `
        );

        if (roles.length === 0) {
            return res.status(500).json({
                success: false,
                message: "Student role does not exist"
            });
        }

        const roleId = roles[0].id;
        const passwordHash = await bcrypt.hash(
            password,
            10
        );

        const connection =
            await db.promise().getConnection();

        try {
            await connection.beginTransaction();

            const [userResult] =
                await connection.query(
                    `
                        INSERT INTO users
                        (
                            role_id,
                            first_name,
                            last_name,
                            email,
                            password_hash,
                            phone,
                            status
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `,
                    [
                        roleId,
                        firstName,
                        lastName,
                        email,
                        passwordHash,
                        phone || null,
                        status
                    ]
                );

            const userId = userResult.insertId;

            const [studentResult] =
                await connection.query(
                    `
                        INSERT INTO student_profiles
                        (
                            user_id,
                            student_code,
                            university_id,
                            department,
                            level,
                            academic_year
                        )
                        VALUES (?, ?, ?, ?, ?, ?)
                    `,
                    [
                        userId,
                        studentCode,
                        universityId || null,
                        department || null,
                        level !== undefined
                            ? Number(level)
                            : null,
                        academicYear || null
                    ]
                );

            await connection.commit();

            return res.status(201).json({
                success: true,
                message:
                    "Student created successfully",
                studentId:
                    studentResult.insertId,
                userId
            });
        } catch (error) {
            await connection.rollback();

            console.error(
                "Create student transaction error:",
                error
            );

            if (error.code === "ER_DUP_ENTRY") {
                return res.status(409).json({
                    success: false,
                    message:
                        "Email or student code already exists"
                });
            }

            return res.status(500).json({
                success: false,
                message:
                    "Could not create student"
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error(
            "Create student error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Could not create student"
        });
    }
};

const updateStudent = async (req, res) => {
    const studentId = Number(req.params.id);

    if (!studentId) {
        return res.status(400).json({
            success: false,
            message: "Invalid student ID"
        });
    }

    const {
        firstName,
        lastName,
        email,
        password,
        phone,
        status,
        studentCode,
        universityId,
        department,
        level,
        academicYear
    } = req.body;

    const validStatuses = [
        "active",
        "inactive",
        "suspended"
    ];

    if (
        status !== undefined &&
        !validStatuses.includes(status)
    ) {
        return res.status(400).json({
            success: false,
            message: "Invalid student status"
        });
    }

    try {
        const [students] = await db.promise().query(
            `
                SELECT
                    sp.user_id
                FROM student_profiles sp
                INNER JOIN users u
                    ON u.id = sp.user_id
                INNER JOIN roles r
                    ON r.id = u.role_id
                WHERE
                    sp.id = ?
                    AND r.name = 'student'
                LIMIT 1
            `,
            [studentId]
        );

        if (students.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });
        }

        const userId = students[0].user_id;

        const connection =
            await db.promise().getConnection();

        try {
            await connection.beginTransaction();

            const userFields = [];
            const userValues = [];

            if (firstName !== undefined) {
                userFields.push("first_name = ?");
                userValues.push(firstName);
            }

            if (lastName !== undefined) {
                userFields.push("last_name = ?");
                userValues.push(lastName);
            }

            if (email !== undefined) {
                userFields.push("email = ?");
                userValues.push(email);
            }

            if (phone !== undefined) {
                userFields.push("phone = ?");
                userValues.push(phone);
            }

            if (status !== undefined) {
                userFields.push("status = ?");
                userValues.push(status);
            }

            if (password) {
                const passwordHash =
                    await bcrypt.hash(password, 10);

                userFields.push(
                    "password_hash = ?"
                );

                userValues.push(passwordHash);
            }

            if (userFields.length > 0) {
                userFields.push("updated_at = NOW()");
                userValues.push(userId);

                await connection.query(
                    `
                        UPDATE users
                        SET ${userFields.join(", ")}
                        WHERE id = ?
                    `,
                    userValues
                );
            }

            const profileFields = [];
            const profileValues = [];

            if (studentCode !== undefined) {
                profileFields.push(
                    "student_code = ?"
                );
                profileValues.push(studentCode);
            }

            if (universityId !== undefined) {
                profileFields.push(
                    "university_id = ?"
                );
                profileValues.push(universityId);
            }

            if (department !== undefined) {
                profileFields.push(
                    "department = ?"
                );
                profileValues.push(department);
            }

            if (level !== undefined) {
                profileFields.push("level = ?");
                profileValues.push(
                    level === null
                        ? null
                        : Number(level)
                );
            }

            if (academicYear !== undefined) {
                profileFields.push(
                    "academic_year = ?"
                );
                profileValues.push(academicYear);
            }

            if (profileFields.length > 0) {
                profileValues.push(studentId);

                await connection.query(
                    `
                        UPDATE student_profiles
                        SET ${profileFields.join(", ")}
                        WHERE id = ?
                    `,
                    profileValues
                );
            }

            await connection.commit();

            return res.json({
                success: true,
                message:
                    "Student updated successfully"
            });
        } catch (error) {
            await connection.rollback();

            console.error(
                "Update student error:",
                error
            );

            if (error.code === "ER_DUP_ENTRY") {
                return res.status(409).json({
                    success: false,
                    message:
                        "Email or student code already exists"
                });
            }

            return res.status(500).json({
                success: false,
                message:
                    "Could not update student"
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error(
            "Update student error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Could not update student"
        });
    }
};

const deleteStudent = (req, res) => {
    const studentId = Number(req.params.id);

    if (!studentId) {
        return res.status(400).json({
            success: false,
            message: "Invalid student ID"
        });
    }

    const sql = `
        UPDATE users u
        INNER JOIN student_profiles sp
            ON sp.user_id = u.id
        INNER JOIN roles r
            ON r.id = u.role_id
        SET
            u.status = 'inactive',
            u.updated_at = NOW()
        WHERE
            sp.id = ?
            AND r.name = 'student'
    `;

    db.query(sql, [studentId], (err, result) => {
        if (err) {
            console.error(
                "Deactivate student error:",
                err
            );

            return res.status(500).json({
                success: false,
                message:
                    "Could not deactivate student"
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });
        }

        return res.json({
            success: true,
            message:
                "Student deactivated successfully"
        });
    });
};

// ============================================================
// ROLES
// ============================================================

const getRoles = (req, res) => {
    const sql = `
        SELECT
            id,
            name,
            description
        FROM roles
        ORDER BY id
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Get roles error:", err);

            return res.status(500).json({
                success: false,
                message: "Could not load roles"
            });
        }

        return res.json({
            success: true,
            roles: results
        });
    });
};

// ============================================================
// COURSES
// ============================================================

const getCourses = (req, res) => {
    const sql = `
        SELECT
            id,
            course_code,
            course_name,
            description,
            credit_hours,
            created_at
        FROM courses
        ORDER BY course_code
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error(
                "Get courses error:",
                err
            );

            return res.status(500).json({
                success: false,
                message:
                    "Could not load courses"
            });
        }

        return res.json({
            success: true,
            count: results.length,
            courses: results
        });
    });
};

const createCourse = (req, res) => {
    const {
        courseCode,
        courseName,
        description,
        creditHours
    } = req.body;

    if (!courseCode || !courseName) {
        return res.status(400).json({
            success: false,
            message:
                "courseCode and courseName are required"
        });
    }

    const sql = `
        INSERT INTO courses
        (
            course_code,
            course_name,
            description,
            credit_hours
        )
        VALUES (?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            courseCode,
            courseName,
            description || null,
            creditHours || null
        ],
        (err, result) => {
            if (err) {
                console.error(
                    "Create course error:",
                    err
                );

                if (err.code === "ER_DUP_ENTRY") {
                    return res.status(409).json({
                        success: false,
                        message:
                            "Course code already exists"
                    });
                }

                return res.status(500).json({
                    success: false,
                    message:
                        "Could not create course"
                });
            }

            return res.status(201).json({
                success: true,
                message:
                    "Course created successfully",
                courseId: result.insertId
            });
        }
    );
};

const updateCourse = (req, res) => {
    const courseId = Number(req.params.id);

    if (!courseId) {
        return res.status(400).json({
            success: false,
            message: "Invalid course ID"
        });
    }

    const {
        courseCode,
        courseName,
        description,
        creditHours
    } = req.body;

    const fields = [];
    const values = [];

    if (courseCode !== undefined) {
        fields.push("course_code = ?");
        values.push(courseCode);
    }

    if (courseName !== undefined) {
        fields.push("course_name = ?");
        values.push(courseName);
    }

    if (description !== undefined) {
        fields.push("description = ?");
        values.push(description);
    }

    if (creditHours !== undefined) {
        fields.push("credit_hours = ?");
        values.push(creditHours);
    }

    if (fields.length === 0) {
        return res.status(400).json({
            success: false,
            message: "No fields to update"
        });
    }

    values.push(courseId);

    const sql = `
        UPDATE courses
        SET ${fields.join(", ")}
        WHERE id = ?
    `;

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error(
                "Update course error:",
                err
            );

            if (err.code === "ER_DUP_ENTRY") {
                return res.status(409).json({
                    success: false,
                    message:
                        "Course code already exists"
                });
            }

            return res.status(500).json({
                success: false,
                message:
                    "Could not update course"
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });
        }

        return res.json({
            success: true,
            message:
                "Course updated successfully"
        });
    });
};

const deleteCourse = (req, res) => {
    const courseId = Number(req.params.id);

    if (!courseId) {
        return res.status(400).json({
            success: false,
            message: "Invalid course ID"
        });
    }

    db.query(
        `
            DELETE FROM courses
            WHERE id = ?
        `,
        [courseId],
        (err, result) => {
            if (err) {
                console.error(
                    "Delete course error:",
                    err
                );

                if (
                    err.code ===
                    "ER_ROW_IS_REFERENCED_2"
                ) {
                    return res.status(409).json({
                        success: false,
                        message:
                            "Course cannot be deleted because it is referenced by sections or other records"
                    });
                }

                return res.status(500).json({
                    success: false,
                    message:
                        "Could not delete course"
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Course not found"
                });
            }

            return res.json({
                success: true,
                message:
                    "Course deleted successfully"
            });
        }
    );
};

// ============================================================
// SECTIONS
// ============================================================

const getSections = (req, res) => {
    const sql = `
        SELECT
            s.id AS section_id,
            s.section_name,
            s.academic_year,
            s.semester,
            s.capacity,

            c.id AS course_id,
            c.course_code,
            c.course_name,

            s.lecturer_id,

            CONCAT(
                u.first_name,
                ' ',
                u.last_name
            ) AS lecturer_name,

            COUNT(
                DISTINCT CASE
                    WHEN e.status = 'active'
                    THEN e.id
                END
            ) AS enrolled_students

        FROM sections s

        INNER JOIN courses c
            ON c.id = s.course_id

        LEFT JOIN users u
            ON u.id = s.lecturer_id

        LEFT JOIN enrollments e
            ON e.section_id = s.id

        GROUP BY
            s.id,
            s.section_name,
            s.academic_year,
            s.semester,
            s.capacity,
            c.id,
            c.course_code,
            c.course_name,
            s.lecturer_id,
            u.first_name,
            u.last_name

        ORDER BY
            c.course_code,
            s.section_name
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error(
                "Get sections error:",
                err
            );

            return res.status(500).json({
                success: false,
                message:
                    "Could not load sections"
            });
        }

        return res.json({
            success: true,
            count: results.length,
            sections: results
        });
    });
};

// ============================================================
// ROOMS
// ============================================================

const getRooms = (req, res) => {
    const sql = `
        SELECT
            id,
            building,
            room_name,
            room_type,
            capacity,
            latitude,
            longitude
        FROM rooms
        ORDER BY building, room_name
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error(
                "Get rooms error:",
                err
            );

            return res.status(500).json({
                success: false,
                message:
                    "Could not load rooms"
            });
        }

        return res.json({
            success: true,
            count: results.length,
            rooms: results
        });
    });
};

// ============================================================
// ENROLLMENTS
// ============================================================

const getEnrollments = (req, res) => {
    const sql = `
        SELECT
            e.id AS enrollment_id,
            e.status,
            e.enrolled_at,

            sp.id AS student_id,
            sp.student_code,
            sp.university_id,

            CONCAT(
                u.first_name,
                ' ',
                u.last_name
            ) AS student_name,

            u.email AS student_email,

            s.id AS section_id,
            s.section_name,

            c.id AS course_id,
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

        ORDER BY
            e.id DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error(
                "Get enrollments error:",
                err
            );

            return res.status(500).json({
                success: false,
                message:
                    "Could not load enrollments"
            });
        }

        return res.json({
            success: true,
            count: results.length,
            enrollments: results
        });
    });
};

// ============================================================
// TIMETABLE
// ============================================================

const getTimetable = (req, res) => {
    const sql = `
        SELECT
            ts.id AS timetable_id,

            ts.section_id,
            s.section_name,

            c.id AS course_id,
            c.course_code,
            c.course_name,

            ts.room_id,
            r.building,
            r.room_name,

            ts.day_of_week,
            ts.start_time,
            ts.end_time,
            ts.start_date,
            ts.end_date

        FROM timetable_slots ts

        INNER JOIN sections s
            ON s.id = ts.section_id

        INNER JOIN courses c
            ON c.id = s.course_id

        LEFT JOIN rooms r
            ON r.id = ts.room_id

        ORDER BY
            FIELD(
                ts.day_of_week,
                'saturday',
                'sunday',
                'monday',
                'tuesday',
                'wednesday',
                'thursday',
                'friday'
            ),
            ts.start_time
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error(
                "Get timetable error:",
                err
            );

            return res.status(500).json({
                success: false,
                message:
                    "Could not load timetable"
            });
        }

        return res.json({
            success: true,
            count: results.length,
            timetable: results
        });
    });
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
    // USERS
    getUsers,
    createUser,
    updateUser,
    deleteUser,

    // STUDENTS
    getStudents,
    getStudentById,
    createStudent,
    updateStudent,
    deleteStudent,

    // ROLES
    getRoles,

    // COURSES
    getCourses,
    createCourse,
    updateCourse,
    deleteCourse,

    // SECTIONS
    getSections,

    // ROOMS
    getRooms,

    // ENROLLMENTS
    getEnrollments,

    // TIMETABLE
    getTimetable
};