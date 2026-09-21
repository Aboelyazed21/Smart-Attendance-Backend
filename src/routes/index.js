const express = require("express");

const router = express.Router();

// ============================================================
// ROUTES
// ============================================================

const authRoutes = require("./auth.routes");

const reportRoutes = require("./report.routes");

const attendanceRoutes = require("./attendance.routes");

const sessionRoutes = require("./session.routes");

const lecturerRoutes = require("./lecturer.routes");

const usersRoutes = require("./users.routes");

const coursesRoutes = require("./courses.routes");

const sectionsRoutes = require("./sections.routes");

const roomsRoutes = require("./rooms.routes");

const timetableRoutes = require("./timetable.routes");

const studentRoutes = require("./student.routes");

const adminRoutes = require("./admin.routes");

// ============================================================
// AUTH
// ============================================================

router.use(authRoutes);

// ============================================================
// REPORTS
// ============================================================

router.use(reportRoutes);

// ============================================================
// ATTENDANCE
// ============================================================

router.use(attendanceRoutes);

// ============================================================
// LECTURER
// ============================================================

router.use(lecturerRoutes);

// ============================================================
// SESSIONS
// ============================================================

router.use(
  "/sessions",
  sessionRoutes
);

// ============================================================
// USERS
// ============================================================

router.use(
  "/users",
  usersRoutes
);

// ============================================================
// COURSES
// ============================================================

router.use(
  "/courses",
  coursesRoutes
);

// ============================================================
// SECTIONS
// ============================================================

router.use(
  "/sections",
  sectionsRoutes
);

// ============================================================
// ROOMS
// ============================================================

router.use(
  "/rooms",
  roomsRoutes
);

// ============================================================
// TIMETABLE
// ============================================================

router.use(
  "/timetable",
  timetableRoutes
);

// ============================================================
// STUDENTS
// ============================================================

router.use(
  "/students",
  studentRoutes
);

// ============================================================
// ADMIN
// ============================================================

router.use(
  "/admin",
  adminRoutes
);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;