const express = require("express");

const { authenticate } = require("../middleware/auth");

const lecturerEnrollmentController = require(
  "../controllers/lecturerEnrollment.controller"
);

const router = express.Router();

/* ============================================================
   LECTURER ENROLLMENT MANAGEMENT
============================================================ */

/*
  Get all sections assigned to the logged-in lecturer

  GET
  /api/lecturer/enrollment/sections
*/
router.get(
  "/sections",
  authenticate,
  lecturerEnrollmentController.getLecturerSections
);

/*
  Get all students enrolled in a specific section

  GET
  /api/lecturer/enrollment/sections/:sectionId/students
*/
router.get(
  "/sections/:sectionId/students",
  authenticate,
  lecturerEnrollmentController.getSectionStudents
);

/*
  Add student to lecturer's section by email

  POST
  /api/lecturer/enrollment/sections/:sectionId/students

  Body:
  {
    "email": "student@example.com"
  }
*/
router.post(
  "/sections/:sectionId/students",
  authenticate,
  lecturerEnrollmentController.addStudentToSection
);

/*
  Remove student from section

  DELETE
  /api/lecturer/enrollment/:enrollmentId
*/
router.delete(
  "/:enrollmentId",
  authenticate,
  lecturerEnrollmentController.removeStudentFromSection
);

module.exports = router;