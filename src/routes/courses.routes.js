const express = require("express");

const router = express.Router();

const {
  authenticate,
} = require("../middleware/auth");

const {
  requirePermission,
} = require("../middleware/permission.middleware");

const {
  list,
  create,
  update,
  remove,
} = require("../controllers/courses.controller");

/* =========================================================
   GET ALL COURSES
   GET /api/courses
========================================================= */

router.get(
  "/",
  authenticate,
  requirePermission("course.view"),
  list
);

/* =========================================================
   CREATE COURSE
   POST /api/courses
========================================================= */

router.post(
  "/",
  authenticate,
  requirePermission("course.create"),
  create
);

/* =========================================================
   UPDATE COURSE
   PUT /api/courses/:id
========================================================= */

router.put(
  "/:id",
  authenticate,
  requirePermission("course.update"),
  update
);

/* =========================================================
   DELETE COURSE
   DELETE /api/courses/:id
========================================================= */

router.delete(
  "/:id",
  authenticate,
  requirePermission("course.delete"),
  remove
);

module.exports = router;