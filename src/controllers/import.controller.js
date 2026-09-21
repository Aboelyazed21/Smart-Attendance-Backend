const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const db = require("../config/db");

// ============================================================
// HELPERS
// ============================================================

function normalizeHeader(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");
}

function normalizeRow(row) {
    const normalized = {};

    Object.keys(row).forEach((key) => {
        normalized[normalizeHeader(key)] =
            typeof row[key] === "string"
                ? row[key].trim()
                : row[key];
    });

    return normalized;
}

/*
 * Simple CSV parser.
 * Supports:
 * - comma separated values
 * - quoted values
 * - commas inside quotes
 * - escaped quotes
 */
function parseCSV(content) {
    const rows = [];
    let row = [];
    let value = "";
    let insideQuotes = false;

    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const next = content[i + 1];

        if (char === '"' && insideQuotes && next === '"') {
            value += '"';
            i++;
            continue;
        }

        if (char === '"') {
            insideQuotes = !insideQuotes;
            continue;
        }

        if (char === "," && !insideQuotes) {
            row.push(value);
            value = "";
            continue;
        }

        if ((char === "\n" || char === "\r") && !insideQuotes) {
            if (char === "\r" && next === "\n") {
                i++;
            }

            row.push(value);
            value = "";

            if (
                row.some(
                    (item) =>
                        String(item).trim() !== ""
                )
            ) {
                rows.push(row);
            }

            row = [];
            continue;
        }

        value += char;
    }

    if (value !== "" || row.length > 0) {
        row.push(value);

        if (
            row.some(
                (item) =>
                    String(item).trim() !== ""
            )
        ) {
            rows.push(row);
        }
    }

    if (rows.length === 0) {
        return [];
    }

    const headers = rows[0].map(normalizeHeader);

    return rows.slice(1).map((values) => {
        const object = {};

        headers.forEach((header, index) => {
            object[header] =
                values[index] !== undefined
                    ? String(values[index]).trim()
                    : "";
        });

        return normalizeRow(object);
    });
}

function readUploadedCSV(file) {
    if (!file || !file.path) {
        throw new Error("CSV file is required");
    }

    const filePath = path.resolve(file.path);

    if (!fs.existsSync(filePath)) {
        throw new Error("Uploaded CSV file was not found");
    }

    const content = fs.readFileSync(
        filePath,
        "utf8"
    );

    return parseCSV(content);
}

function cleanupUploadedFile(file) {
    try {
        if (file && file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
    } catch (error) {
        console.error(
            "Could not remove uploaded file:",
            error.message
        );
    }
}

function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(
            sql,
            params,
            (error, results) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(results);
            }
        );
    });
}

function firstValue(row, keys) {
    for (const key of keys) {
        const value = row[key];

        if (
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ""
        ) {
            return String(value).trim();
        }
    }

    return null;
}

function toNumber(value, fallback = null) {
    if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
    ) {
        return fallback;
    }

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
}

function toNullable(value) {
    if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
    ) {
        return null;
    }

    return String(value).trim();
}

function successResponse(
    res,
    message,
    imported,
    skipped = 0,
    errors = []
) {
    return res.json({
        success: true,
        message,
        imported,
        skipped,
        errors,
    });
}

function errorResponse(res, error) {
    console.error(
        "Import controller error:",
        error
    );

    return res.status(500).json({
        success: false,
        message:
            error.message ||
            "Import failed",
    });
}

// ============================================================
// IMPORT COURSES
// ============================================================

async function importCourses(req, res) {
    let imported = 0;
    let skipped = 0;
    const errors = [];

    try {
        const rows = readUploadedCSV(req.file);

        if (rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "CSV file is empty",
            });
        }

        for (let index = 0; index < rows.length; index++) {
            const row = rows[index];
            const line = index + 2;

            const courseCode = firstValue(row, [
                "course_code",
                "code",
                "coursecode",
            ]);

            const courseName = firstValue(row, [
                "course_name",
                "name",
                "coursename",
            ]);

            const description = firstValue(row, [
                "description",
                "course_description",
            ]);

            const creditHours = toNumber(
                firstValue(row, [
                    "credit_hours",
                    "credits",
                    "credit",
                ]),
                3
            );

            if (!courseCode || !courseName) {
                skipped++;

                errors.push({
                    line,
                    message:
                        "course_code and course_name are required",
                });

                continue;
            }

            try {
                const existing = await query(
                    `
                    SELECT id
                    FROM courses
                    WHERE course_code = ?
                    LIMIT 1
                    `,
                    [courseCode]
                );

                if (existing.length > 0) {
                    await query(
                        `
                        UPDATE courses
                        SET
                            course_name = ?,
                            description = ?,
                            credit_hours = ?
                        WHERE id = ?
                        `,
                        [
                            courseName,
                            description,
                            creditHours,
                            existing[0].id,
                        ]
                    );
                } else {
                    await query(
                        `
                        INSERT INTO courses
                        (
                            course_code,
                            course_name,
                            description,
                            credit_hours
                        )
                        VALUES (?, ?, ?, ?)
                        `,
                        [
                            courseCode,
                            courseName,
                            description,
                            creditHours,
                        ]
                    );
                }

                imported++;
            } catch (error) {
                skipped++;

                errors.push({
                    line,
                    message: error.message,
                });
            }
        }

        return successResponse(
            res,
            "Courses imported successfully",
            imported,
            skipped,
            errors
        );
    } catch (error) {
        return errorResponse(res, error);
    } finally {
        cleanupUploadedFile(req.file);
    }
}

// ============================================================
// IMPORT STUDENTS
// ============================================================

async function importStudents(req, res) {
    let imported = 0;
    let skipped = 0;
    const errors = [];

    try {
        const rows = readUploadedCSV(req.file);

        if (rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "CSV file is empty",
            });
        }

        const studentRole = await query(
            `
            SELECT id
            FROM roles
            WHERE name = 'student'
            LIMIT 1
            `
        );

        if (studentRole.length === 0) {
            return res.status(500).json({
                success: false,
                message:
                    "Student role was not found",
            });
        }

        const studentRoleId =
            studentRole[0].id;

        for (let index = 0; index < rows.length; index++) {
            const row = rows[index];
            const line = index + 2;

            const firstName = firstValue(row, [
                "first_name",
                "firstname",
                "first",
            ]);

            const lastName = firstValue(row, [
                "last_name",
                "lastname",
                "last",
            ]);

            const email = firstValue(row, [
                "email",
                "student_email",
            ]);

            const phone = firstValue(row, [
                "phone",
                "phone_number",
                "mobile",
            ]);

            const studentCode = firstValue(row, [
                "student_code",
                "studentcode",
                "code",
            ]);

            const universityId = firstValue(row, [
                "university_id",
                "universityid",
            ]);

            const department = firstValue(row, [
                "department",
            ]);

            const level = toNumber(
                firstValue(row, [
                    "level",
                    "year",
                ])
            );

            const academicYear = firstValue(row, [
                "academic_year",
                "academicyear",
            ]);

            const password = firstValue(row, [
                "password",
            ]);

            if (
                !firstName ||
                !lastName ||
                !studentCode
            ) {
                skipped++;

                errors.push({
                    line,
                    message:
                        "first_name, last_name and student_code are required",
                });

                continue;
            }

            try {
                const existingProfile =
                    await query(
                        `
                        SELECT
                            sp.id,
                            sp.user_id
                        FROM student_profiles sp
                        WHERE sp.student_code = ?
                        LIMIT 1
                        `,
                        [studentCode]
                    );

                let userId;

                if (
                    existingProfile.length > 0
                ) {
                    userId =
                        existingProfile[0]
                            .user_id;

                    await query(
                        `
                        UPDATE users
                        SET
                            first_name = ?,
                            last_name = ?,
                            email = ?,
                            phone = ?,
                            status = 'active'
                        WHERE id = ?
                        `,
                        [
                            firstName,
                            lastName,
                            email,
                            phone,
                            userId,
                        ]
                    );

                    await query(
                        `
                        UPDATE student_profiles
                        SET
                            university_id = ?,
                            department = ?,
                            level = ?,
                            academic_year = ?
                        WHERE id = ?
                        `,
                        [
                            universityId,
                            department,
                            level,
                            academicYear,
                            existingProfile[0]
                                .id,
                        ]
                    );

                    if (password) {
                        const passwordHash =
                            await bcrypt.hash(
                                password,
                                10
                            );

                        await query(
                            `
                            UPDATE users
                            SET password_hash = ?
                            WHERE id = ?
                            `,
                            [
                                passwordHash,
                                userId,
                            ]
                        );
                    }
                } else {
                    let existingUser = [];

                    if (email) {
                        existingUser =
                            await query(
                                `
                                SELECT id
                                FROM users
                                WHERE email = ?
                                LIMIT 1
                                `,
                                [email]
                            );
                    }

                    if (
                        existingUser.length > 0
                    ) {
                        userId =
                            existingUser[0]
                                .id;

                        await query(
                            `
                            UPDATE users
                            SET
                                role_id = ?,
                                first_name = ?,
                                last_name = ?,
                                phone = ?,
                                status = 'active'
                            WHERE id = ?
                            `,
                            [
                                studentRoleId,
                                firstName,
                                lastName,
                                phone,
                                userId,
                            ]
                        );
                    } else {
                        const finalPassword =
                            password ||
                            studentCode;

                        const passwordHash =
                            await bcrypt.hash(
                                finalPassword,
                                10
                            );

                        const result =
                            await query(
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
                                VALUES (?, ?, ?, ?, ?, ?, 'active')
                                `,
                                [
                                    studentRoleId,
                                    firstName,
                                    lastName,
                                    email,
                                    passwordHash,
                                    phone,
                                ]
                            );

                        userId = result.insertId;
                    }

                    await query(
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
                            universityId,
                            department,
                            level,
                            academicYear,
                        ]
                    );
                }

                imported++;
            } catch (error) {
                skipped++;

                errors.push({
                    line,
                    message: error.message,
                });
            }
        }

        return successResponse(
            res,
            "Students imported successfully",
            imported,
            skipped,
            errors
        );
    } catch (error) {
        return errorResponse(res, error);
    } finally {
        cleanupUploadedFile(req.file);
    }
}

// ============================================================
// IMPORT SECTIONS
// ============================================================

async function importSections(req, res) {
    let imported = 0;
    let skipped = 0;
    const errors = [];

    try {
        const rows = readUploadedCSV(req.file);

        if (rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "CSV file is empty",
            });
        }

        for (let index = 0; index < rows.length; index++) {
            const row = rows[index];
            const line = index + 2;

            const courseCode = firstValue(row, [
                "course_code",
                "coursecode",
            ]);

            const sectionName = firstValue(row, [
                "section_name",
                "section",
                "section_code",
            ]);

            const academicYear = firstValue(row, [
                "academic_year",
                "academicyear",
            ]);

            const semester = firstValue(row, [
                "semester",
            ]);

            const lecturerEmail = firstValue(row, [
                "lecturer_email",
                "instructor_email",
                "teacher_email",
            ]);

            const lecturerIdValue = firstValue(
                row,
                [
                    "lecturer_id",
                    "instructor_id",
                    "teacher_id",
                ]
            );

            const capacity = toNumber(
                firstValue(row, [
                    "capacity",
                ]),
                100
            );

            if (
                !courseCode ||
                !sectionName ||
                !academicYear ||
                !semester
            ) {
                skipped++;

                errors.push({
                    line,
                    message:
                        "course_code, section_name, academic_year and semester are required",
                });

                continue;
            }

            try {
                const course = await query(
                    `
                    SELECT id
                    FROM courses
                    WHERE course_code = ?
                    LIMIT 1
                    `,
                    [courseCode]
                );

                if (course.length === 0) {
                    throw new Error(
                        `Course not found: ${courseCode}`
                    );
                }

                let lecturerId = null;

                if (lecturerIdValue) {
                    lecturerId =
                        toNumber(
                            lecturerIdValue
                        );
                }

                if (
                    !lecturerId &&
                    lecturerEmail
                ) {
                    const lecturer =
                        await query(
                            `
                            SELECT id
                            FROM users
                            WHERE email = ?
                            LIMIT 1
                            `,
                            [lecturerEmail]
                        );

                    if (
                        lecturer.length > 0
                    ) {
                        lecturerId =
                            lecturer[0].id;
                    }
                }

                const existing =
                    await query(
                        `
                        SELECT id
                        FROM sections
                        WHERE
                            course_id = ?
                            AND section_name = ?
                            AND academic_year = ?
                            AND semester = ?
                        LIMIT 1
                        `,
                        [
                            course[0].id,
                            sectionName,
                            academicYear,
                            semester,
                        ]
                    );

                if (existing.length > 0) {
                    await query(
                        `
                        UPDATE sections
                        SET
                            lecturer_id = ?,
                            capacity = ?
                        WHERE id = ?
                        `,
                        [
                            lecturerId,
                            capacity,
                            existing[0].id,
                        ]
                    );
                } else {
                    await query(
                        `
                        INSERT INTO sections
                        (
                            course_id,
                            section_name,
                            academic_year,
                            semester,
                            lecturer_id,
                            capacity
                        )
                        VALUES (?, ?, ?, ?, ?, ?)
                        `,
                        [
                            course[0].id,
                            sectionName,
                            academicYear,
                            semester,
                            lecturerId,
                            capacity,
                        ]
                    );
                }

                imported++;
            } catch (error) {
                skipped++;

                errors.push({
                    line,
                    message: error.message,
                });
            }
        }

        return successResponse(
            res,
            "Sections imported successfully",
            imported,
            skipped,
            errors
        );
    } catch (error) {
        return errorResponse(res, error);
    } finally {
        cleanupUploadedFile(req.file);
    }
}

// ============================================================
// IMPORT ENROLLMENTS
// ============================================================

async function importEnrollments(req, res) {
    let imported = 0;
    let skipped = 0;
    const errors = [];

    try {
        const rows = readUploadedCSV(req.file);

        if (rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "CSV file is empty",
            });
        }

        for (let index = 0; index < rows.length; index++) {
            const row = rows[index];
            const line = index + 2;

            const studentCode = firstValue(row, [
                "student_code",
                "studentcode",
                "code",
            ]);

            const sectionId = toNumber(
                firstValue(row, [
                    "section_id",
                ])
            );

            const courseCode = firstValue(row, [
                "course_code",
                "coursecode",
            ]);

            const sectionName = firstValue(row, [
                "section_name",
                "section",
            ]);

            const status =
                firstValue(row, [
                    "status",
                ]) || "active";

            if (!studentCode) {
                skipped++;

                errors.push({
                    line,
                    message:
                        "student_code is required",
                });

                continue;
            }

            try {
                const student =
                    await query(
                        `
                        SELECT id
                        FROM student_profiles
                        WHERE student_code = ?
                        LIMIT 1
                        `,
                        [studentCode]
                    );

                if (student.length === 0) {
                    throw new Error(
                        `Student not found: ${studentCode}`
                    );
                }

                let resolvedSectionId =
                    sectionId;

                if (!resolvedSectionId) {
                    if (
                        !courseCode ||
                        !sectionName
                    ) {
                        throw new Error(
                            "section_id or course_code + section_name is required"
                        );
                    }

                    const section =
                        await query(
                            `
                            SELECT
                                s.id
                            FROM sections s
                            INNER JOIN courses c
                                ON c.id = s.course_id
                            WHERE
                                c.course_code = ?
                                AND s.section_name = ?
                            ORDER BY s.id DESC
                            LIMIT 1
                            `,
                            [
                                courseCode,
                                sectionName,
                            ]
                        );

                    if (
                        section.length === 0
                    ) {
                        throw new Error(
                            `Section not found: ${courseCode} ${sectionName}`
                        );
                    }

                    resolvedSectionId =
                        section[0].id;
                }

                const existing =
                    await query(
                        `
                        SELECT id
                        FROM enrollments
                        WHERE
                            student_id = ?
                            AND section_id = ?
                        LIMIT 1
                        `,
                        [
                            student[0].id,
                            resolvedSectionId,
                        ]
                    );

                if (existing.length > 0) {
                    await query(
                        `
                        UPDATE enrollments
                        SET status = ?
                        WHERE id = ?
                        `,
                        [
                            status,
                            existing[0].id,
                        ]
                    );
                } else {
                    await query(
                        `
                        INSERT INTO enrollments
                        (
                            student_id,
                            section_id,
                            status
                        )
                        VALUES (?, ?, ?)
                        `,
                        [
                            student[0].id,
                            resolvedSectionId,
                            status,
                        ]
                    );
                }

                imported++;
            } catch (error) {
                skipped++;

                errors.push({
                    line,
                    message: error.message,
                });
            }
        }

        return successResponse(
            res,
            "Enrollments imported successfully",
            imported,
            skipped,
            errors
        );
    } catch (error) {
        return errorResponse(res, error);
    } finally {
        cleanupUploadedFile(req.file);
    }
}

// ============================================================
// IMPORT ROOMS
// ============================================================

async function importRooms(req, res) {
    let imported = 0;
    let skipped = 0;
    const errors = [];

    try {
        const rows = readUploadedCSV(req.file);

        if (rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "CSV file is empty",
            });
        }

        for (let index = 0; index < rows.length; index++) {
            const row = rows[index];
            const line = index + 2;

            const building = firstValue(row, [
                "building",
            ]);

            const roomName = firstValue(row, [
                "room_name",
                "room",
                "room_number",
            ]);

            const roomType =
                firstValue(row, [
                    "room_type",
                    "type",
                ]) || "classroom";

            const capacity = toNumber(
                firstValue(row, [
                    "capacity",
                ]),
                100
            );

            const latitude = toNullable(
                firstValue(row, [
                    "latitude",
                    "lat",
                ])
            );

            const longitude = toNullable(
                firstValue(row, [
                    "longitude",
                    "lng",
                    "lon",
                ])
            );

            if (!building || !roomName) {
                skipped++;

                errors.push({
                    line,
                    message:
                        "building and room_name are required",
                });

                continue;
            }

            try {
                const existing =
                    await query(
                        `
                        SELECT id
                        FROM rooms
                        WHERE
                            building = ?
                            AND room_name = ?
                        LIMIT 1
                        `,
                        [
                            building,
                            roomName,
                        ]
                    );

                if (existing.length > 0) {
                    await query(
                        `
                        UPDATE rooms
                        SET
                            room_type = ?,
                            capacity = ?,
                            latitude = ?,
                            longitude = ?
                        WHERE id = ?
                        `,
                        [
                            roomType,
                            capacity,
                            latitude,
                            longitude,
                            existing[0].id,
                        ]
                    );
                } else {
                    await query(
                        `
                        INSERT INTO rooms
                        (
                            building,
                            room_name,
                            room_type,
                            capacity,
                            latitude,
                            longitude
                        )
                        VALUES (?, ?, ?, ?, ?, ?)
                        `,
                        [
                            building,
                            roomName,
                            roomType,
                            capacity,
                            latitude,
                            longitude,
                        ]
                    );
                }

                imported++;
            } catch (error) {
                skipped++;

                errors.push({
                    line,
                    message: error.message,
                });
            }
        }

        return successResponse(
            res,
            "Rooms imported successfully",
            imported,
            skipped,
            errors
        );
    } catch (error) {
        return errorResponse(res, error);
    } finally {
        cleanupUploadedFile(req.file);
    }
}

// ============================================================
// IMPORT TIMETABLE
// ============================================================

async function importTimetable(req, res) {
    let imported = 0;
    let skipped = 0;
    const errors = [];

    try {
        const rows = readUploadedCSV(req.file);

        if (rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "CSV file is empty",
            });
        }

        for (let index = 0; index < rows.length; index++) {
            const row = rows[index];
            const line = index + 2;

            const sectionId = toNumber(
                firstValue(row, [
                    "section_id",
                ])
            );

            const courseCode = firstValue(row, [
                "course_code",
                "coursecode",
            ]);

            const sectionName = firstValue(row, [
                "section_name",
                "section",
            ]);

            const roomId = toNumber(
                firstValue(row, [
                    "room_id",
                ])
            );

            const building = firstValue(row, [
                "building",
            ]);

            const roomName = firstValue(row, [
                "room_name",
                "room",
            ]);

            const dayOfWeek = firstValue(row, [
                "day_of_week",
                "day",
            ]);

            const startTime = firstValue(row, [
                "start_time",
                "start",
            ]);

            const endTime = firstValue(row, [
                "end_time",
                "end",
            ]);

            const startDate = toNullable(
                firstValue(row, [
                    "start_date",
                ])
            );

            const endDate = toNullable(
                firstValue(row, [
                    "end_date",
                ])
            );

            if (
                !dayOfWeek ||
                !startTime ||
                !endTime
            ) {
                skipped++;

                errors.push({
                    line,
                    message:
                        "day_of_week, start_time and end_time are required",
                });

                continue;
            }

            try {
                let resolvedSectionId =
                    sectionId;

                if (!resolvedSectionId) {
                    if (
                        !courseCode ||
                        !sectionName
                    ) {
                        throw new Error(
                            "section_id or course_code + section_name is required"
                        );
                    }

                    const section =
                        await query(
                            `
                            SELECT
                                s.id
                            FROM sections s
                            INNER JOIN courses c
                                ON c.id = s.course_id
                            WHERE
                                c.course_code = ?
                                AND s.section_name = ?
                            ORDER BY s.id DESC
                            LIMIT 1
                            `,
                            [
                                courseCode,
                                sectionName,
                            ]
                        );

                    if (
                        section.length === 0
                    ) {
                        throw new Error(
                            `Section not found: ${courseCode} ${sectionName}`
                        );
                    }

                    resolvedSectionId =
                        section[0].id;
                }

                let resolvedRoomId =
                    roomId;

                if (
                    !resolvedRoomId &&
                    building &&
                    roomName
                ) {
                    const room =
                        await query(
                            `
                            SELECT id
                            FROM rooms
                            WHERE
                                building = ?
                                AND room_name = ?
                            LIMIT 1
                            `,
                            [
                                building,
                                roomName,
                            ]
                        );

                    if (room.length > 0) {
                        resolvedRoomId =
                            room[0].id;
                    }
                }

                const existing =
                    await query(
                        `
                        SELECT id
                        FROM timetable_slots
                        WHERE
                            section_id = ?
                            AND day_of_week = ?
                            AND start_time = ?
                            AND end_time = ?
                        LIMIT 1
                        `,
                        [
                            resolvedSectionId,
                            dayOfWeek,
                            startTime,
                            endTime,
                        ]
                    );

                if (existing.length > 0) {
                    await query(
                        `
                        UPDATE timetable_slots
                        SET
                            room_id = ?,
                            start_date = ?,
                            end_date = ?
                        WHERE id = ?
                        `,
                        [
                            resolvedRoomId,
                            startDate,
                            endDate,
                            existing[0].id,
                        ]
                    );
                } else {
                    await query(
                        `
                        INSERT INTO timetable_slots
                        (
                            section_id,
                            room_id,
                            day_of_week,
                            start_time,
                            end_time,
                            start_date,
                            end_date
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        `,
                        [
                            resolvedSectionId,
                            resolvedRoomId,
                            dayOfWeek,
                            startTime,
                            endTime,
                            startDate,
                            endDate,
                        ]
                    );
                }

                imported++;
            } catch (error) {
                skipped++;

                errors.push({
                    line,
                    message: error.message,
                });
            }
        }

        return successResponse(
            res,
            "Timetable imported successfully",
            imported,
            skipped,
            errors
        );
    } catch (error) {
        return errorResponse(res, error);
    } finally {
        cleanupUploadedFile(req.file);
    }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    importCourses,
    importStudents,
    importSections,
    importEnrollments,
    importRooms,
    importTimetable,
};