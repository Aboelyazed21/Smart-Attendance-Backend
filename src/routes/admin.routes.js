const express = require("express");

const router = express.Router();


// ============================================================
// MIDDLEWARE
// ============================================================

const authMiddleware =
    require("../middleware/auth");

const {
    requirePermission
} = require("../middleware/permission.middleware");

const {
    uploadCSV
} = require("../middleware/upload.middleware");


// ============================================================
// ADMIN CONTROLLER
// ============================================================

const {
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

} = require("../controllers/admin.controller");


// ============================================================
// IMPORT CONTROLLER
// ============================================================

const {
    importCourses,
    importStudents,
    importSections,
    importEnrollments,
    importRooms,
    importTimetable

} = require("../controllers/import.controller");


// ============================================================
// ADMIN TEST
// ============================================================

router.get(
    "/test",
    (req, res) => {

        return res.json({
            success: true,
            message: "Admin routes are working"
        });

    }
);


// ============================================================
// USERS
// ============================================================

// GET ALL USERS

router.get(
    "/users",
    authMiddleware,
    requirePermission("user.manage"),
    getUsers
);


// CREATE USER

router.post(
    "/users",
    authMiddleware,
    requirePermission("user.manage"),
    createUser
);


// UPDATE USER

router.patch(
    "/users/:id",
    authMiddleware,
    requirePermission("user.manage"),
    updateUser
);


// DEACTIVATE USER

router.delete(
    "/users/:id",
    authMiddleware,
    requirePermission("user.manage"),
    deleteUser
);


// ============================================================
// ROLES
// ============================================================

router.get(
    "/roles",
    authMiddleware,
    requirePermission("user.manage"),
    getRoles
);


// ============================================================
// STUDENTS
// ============================================================

// GET ALL STUDENTS

router.get(
    "/students",
    authMiddleware,
    requirePermission("student.view"),
    getStudents
);


// CREATE STUDENT

router.post(
    "/students",
    authMiddleware,
    requirePermission("student.create"),
    createStudent
);


// GET STUDENT BY ID

router.get(
    "/students/:id",
    authMiddleware,
    requirePermission("student.view"),
    getStudentById
);


// UPDATE STUDENT

router.patch(
    "/students/:id",
    authMiddleware,
    requirePermission("student.update"),
    updateStudent
);


// DELETE / DEACTIVATE STUDENT

router.delete(
    "/students/:id",
    authMiddleware,
    requirePermission("student.delete"),
    deleteStudent
);


// ============================================================
// COURSES
// ============================================================

// GET COURSES

router.get(
    "/courses",
    authMiddleware,
    requirePermission("course.view"),
    getCourses
);


// CREATE COURSE

router.post(
    "/courses",
    authMiddleware,
    requirePermission("course.create"),
    createCourse
);


// UPDATE COURSE

router.patch(
    "/courses/:id",
    authMiddleware,
    requirePermission("course.update"),
    updateCourse
);


// DELETE COURSE

router.delete(
    "/courses/:id",
    authMiddleware,
    requirePermission("course.delete"),
    deleteCourse
);


// ============================================================
// IMPORT COURSES
// ============================================================

router.post(
    "/import/courses",
    authMiddleware,
    requirePermission("course.create"),
    uploadCSV.single("file"),
    importCourses
);


// ============================================================
// IMPORT STUDENTS
// ============================================================

router.post(
    "/import/students",
    authMiddleware,
    requirePermission("user.manage"),
    uploadCSV.single("file"),
    importStudents
);


// ============================================================
// IMPORT SECTIONS
// ============================================================

router.post(
    "/import/sections",
    authMiddleware,
    requirePermission("user.manage"),
    uploadCSV.single("file"),
    importSections
);


// ============================================================
// IMPORT ENROLLMENTS
// ============================================================

router.post(
    "/import/enrollments",
    authMiddleware,
    requirePermission("user.manage"),
    uploadCSV.single("file"),
    importEnrollments
);


// ============================================================
// IMPORT ROOMS
// ============================================================

router.post(
    "/import/rooms",
    authMiddleware,
    requirePermission("user.manage"),
    uploadCSV.single("file"),
    importRooms
);


// ============================================================
// IMPORT TIMETABLE
// ============================================================

router.post(
    "/import/timetable",
    authMiddleware,
    requirePermission("user.manage"),
    uploadCSV.single("file"),
    importTimetable
);


// ============================================================
// SECTIONS
// ============================================================

router.get(
    "/sections",
    authMiddleware,
    requirePermission("user.manage"),
    getSections
);


// ============================================================
// ROOMS
// ============================================================

router.get(
    "/rooms",
    authMiddleware,
    requirePermission("user.manage"),
    getRooms
);


// ============================================================
// ENROLLMENTS
// ============================================================

router.get(
    "/enrollments",
    authMiddleware,
    requirePermission("user.manage"),
    getEnrollments
);


// ============================================================
// TIMETABLE
// ============================================================

router.get(
    "/timetable",
    authMiddleware,
    requirePermission("user.manage"),
    getTimetable
);


// ============================================================
// EXPORT
// ============================================================

module.exports = router;
