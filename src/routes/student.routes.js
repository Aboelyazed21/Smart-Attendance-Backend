const express = require("express");

const router = express.Router();

const { authenticate } = require("../middleware/auth");

const {
  requirePermission,
} = require("../middleware/permission.middleware");

const studentController = require("../controllers/students.controller");

// ============================================================
// CURRENT STUDENT
// GET /api/students/me
// ============================================================

router.get(
  "/me",
  authenticate,
  studentController.me
);

// ============================================================
// AVAILABLE SECTIONS
// GET /api/students/sections/available
// ============================================================

router.get(
  "/sections/available",
  authenticate,
  requirePermission("enrollment.view"),
  studentController.getAvailableSections
);

// ============================================================
// GET ALL STUDENTS
// GET /api/students
// ============================================================

router.get(
  "/",
  authenticate,
  requirePermission("student.view"),
  studentController.list
);

// ============================================================
// GET STUDENT BY ID
// GET /api/students/:id
// ============================================================

router.get(
  "/:id",
  authenticate,
  requirePermission("student.view"),
  studentController.getById
);

// ============================================================
// GET STUDENT ENROLLMENTS
// GET /api/students/:id/enrollments
// ============================================================

router.get(
  "/:id/enrollments",
  authenticate,
  requirePermission("enrollment.view"),
  studentController.getEnrollments
);

// ============================================================
// CREATE STUDENT
// POST /api/students
// ============================================================

router.post(
  "/",
  authenticate,
  requirePermission("student.create"),
  studentController.create
);

// ============================================================
// UPDATE STUDENT
// PUT /api/students/:id
// ============================================================

router.put(
  "/:id",
  authenticate,
  requirePermission("student.update"),
  studentController.update
);

// ============================================================
// DELETE STUDENT
// DELETE /api/students/:id
// ============================================================

router.delete(
  "/:id",
  authenticate,
  requirePermission("student.delete"),
  studentController.remove
);

// ============================================================
// ENROLL STUDENT
// POST /api/students/:id/enrollments
// ============================================================

router.post(
  "/:id/enrollments",
  authenticate,
  requirePermission("enrollment.create"),
  studentController.enroll
);

// ============================================================
// REMOVE ENROLLMENT
// DELETE /api/students/enrollments/:enrollmentId
// ============================================================

router.delete(
  "/enrollments/:enrollmentId",
  authenticate,
  requirePermission("enrollment.delete"),
  studentController.removeEnrollment
);

module.exports = router;