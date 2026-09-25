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
    importTimetable,
    importSectionStudents

} = require("../controllers/import.controller");

// ============================================================
// ADMIN NOTIFICATIONS CONTROLLER
// ============================================================

const {
    runWeeklySummary

} = require("../controllers/adminNotifications.controller");

// ============================================================
// ADMIN EMAIL REPORTS CONTROLLER
// ============================================================

const {
    getSettings: getEmailSettings,
    updateSettings: updateEmailSettings,
    send: sendWeeklyEmails,
    test: sendTestEmail,
    preview: previewWeeklyEmail,
    logs: getEmailLogs,
    retry: retryEmailLog,
    status: getEmailStatus

} = require("../controllers/adminEmailReports.controller");

// ============================================================
// ADMIN PLATFORM SETTINGS CONTROLLER
// ============================================================

const {
    getSettings: getPlatformSettings,
    updateSettings: updatePlatformSettings

} = require("../controllers/adminSettings.controller");

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
// IMPORT STUDENTS INTO ONE SECTION (CSV or Excel)
// POST /api/admin/import/sections/:sectionId/students
// ============================================================

router.post(
    "/import/sections/:sectionId/students",
    authenticate,
    requirePermission("user.manage"),
    uploadCSV.single("file"),
    importSectionStudents
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
// WEEKLY WHATSAPP SUMMARIES (manual trigger)
// POST /api/admin/attendance-summaries/run
// ============================================================

router.post(
    "/attendance-summaries/run",
    authenticate,
    requirePermission("user.manage"),
    runWeeklySummary
);

// ============================================================
// WEEKLY EMAIL ATTENDANCE REPORTS (Resend)
// ============================================================

router.get(
    "/weekly-reports/settings",
    authenticate,
    requirePermission("weekly_reports.view"),
    getEmailSettings
);

router.patch(
    "/weekly-reports/settings",
    authenticate,
    requirePermission("weekly_reports.manage"),
    updateEmailSettings
);

router.post(
    "/weekly-reports/send",
    authenticate,
    requirePermission("weekly_reports.send"),
    sendWeeklyEmails
);

router.post(
    "/weekly-reports/test",
    authenticate,
    requirePermission("weekly_reports.test"),
    sendTestEmail
);

router.post(
    "/weekly-reports/preview",
    authenticate,
    requirePermission("weekly_reports.view"),
    previewWeeklyEmail
);

router.get(
    "/weekly-reports/logs",
    authenticate,
    requirePermission("weekly_reports.view"),
    getEmailLogs
);

router.post(
    "/weekly-reports/retry/:id",
    authenticate,
    requirePermission("weekly_reports.retry"),
    retryEmailLog
);

router.get(
    "/weekly-reports/status",
    authenticate,
    requirePermission("weekly_reports.view"),
    getEmailStatus
);

// ============================================================
// PLATFORM SETTINGS (name + maintenance mode)
// ============================================================

router.get(
    "/settings",
    authenticate,
    requirePermission("settings.view"),
    getPlatformSettings
);

router.patch(
    "/settings",
    authenticate,
    requirePermission("settings.manage"),
    updatePlatformSettings
);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;