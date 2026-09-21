const express = require("express");

const router = express.Router();

// ============================================================
// MIDDLEWARE
// ============================================================

const {
    authenticate
} = require("../middleware/auth");

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
    getUsers,
    createUser,
    updateUser,
    deleteUser,

    getStudents,
    getStudentById,
    createStudent,
    updateStudent,
    deleteStudent,

    getRoles,

    getCourses,
    createCourse,
    updateCourse,
    deleteCourse,

    getSections,

    getRooms,

    getEnrollments,

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

router.get(
    "/users",
    authenticate,
    requirePermission("user.manage"),
    getUsers
);

router.post(
    "/users",
    authenticate,
    requirePermission("user.manage"),
    createUser
);

router.patch(
    "/users/:id",
    authenticate,
    requirePermission("user.manage"),
    updateUser
);

router.delete(
    "/users/:id",
    authenticate,
    requirePermission("user.manage"),
    deleteUser
);

// ============================================================
// ROLES
// ============================================================

router.get(
    "/roles",
    authenticate,
    requirePermission("user.manage"),
    getRoles
);

// ============================================================
// STUDENTS
// ============================================================

router.get(
    "/students",
    authenticate,
    requirePermission("student.view"),
    getStudents
);

router.post(
    "/students",
    authenticate,
    requirePermission("student.create"),
    createStudent
);

router.get(
    "/students/:id",
    authenticate,
    requirePermission("student.view"),
    getStudentById
);

router.patch(
    "/students/:id",
    authenticate,
    requirePermission("student.update"),
    updateStudent
);

router.delete(
    "/students/:id",
    authenticate,
    requirePermission("student.delete"),
    deleteStudent
);

// ============================================================
// COURSES
// ============================================================

router.get(
    "/courses",
    authenticate,
    requirePermission("course.view"),
    getCourses
);

router.post(
    "/courses",
    authenticate,
    requirePermission("course.create"),
    createCourse
);

router.patch(
    "/courses/:id",
    authenticate,
    requirePermission("course.update"),
    updateCourse
);

router.delete(
    "/courses/:id",
    authenticate,
    requirePermission("course.delete"),
    deleteCourse
);

// ============================================================
// IMPORT COURSES
// ============================================================

router.post(
    "/import/courses",
    authenticate,
    requirePermission("course.create"),
    uploadCSV.single("file"),
    importCourses
);

// ============================================================
// IMPORT STUDENTS
// ============================================================

router.post(
    "/import/students",
    authenticate,
    requirePermission("user.manage"),
    uploadCSV.single("file"),
    importStudents
);

// ============================================================
// IMPORT SECTIONS
// ============================================================

router.post(
    "/import/sections",
    authenticate,
    requirePermission("user.manage"),
    uploadCSV.single("file"),
    importSections
);

// ============================================================
// IMPORT ENROLLMENTS
// ============================================================

router.post(
    "/import/enrollments",
    authenticate,
    requirePermission("user.manage"),
    uploadCSV.single("file"),
    importEnrollments
);

// ============================================================
// IMPORT ROOMS
// ============================================================

router.post(
    "/import/rooms",
    authenticate,
    requirePermission("user.manage"),
    uploadCSV.single("file"),
    importRooms
);

// ============================================================
// IMPORT TIMETABLE
// ============================================================

router.post(
    "/import/timetable",
    authenticate,
    requirePermission("user.manage"),
    uploadCSV.single("file"),
    importTimetable
);

// ============================================================
// SECTIONS
// ============================================================

router.get(
    "/sections",
    authenticate,
    requirePermission("user.manage"),
    getSections
);

// ============================================================
// ROOMS
// ============================================================

router.get(
    "/rooms",
    authenticate,
    requirePermission("user.manage"),
    getRooms
);

// ============================================================
// ENROLLMENTS
// ============================================================

router.get(
    "/enrollments",
    authenticate,
    requirePermission("user.manage"),
    getEnrollments
);

// ============================================================
// TIMETABLE
// ============================================================

router.get(
    "/timetable",
    authenticate,
    requirePermission("user.manage"),
    getTimetable
);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;