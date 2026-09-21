const express = require("express");

const router = express.Router();

const { authenticate } = require("../middleware/auth");

const {
  list,
  create,
  update,
  remove,
} = require("../controllers/sections.controller");

/* =========================================================
   GET ALL SECTIONS
   GET /api/sections
========================================================= */

router.get(
  "/",
  authenticate,
  list
);

/* =========================================================
   CREATE SECTION
   POST /api/sections
========================================================= */

router.post(
  "/",
  authenticate,
  create
);

/* =========================================================
   UPDATE SECTION
   PUT /api/sections/:id
========================================================= */

router.put(
  "/:id",
  authenticate,
  update
);

/* =========================================================
   DELETE SECTION
   DELETE /api/sections/:id
========================================================= */

router.delete(
  "/:id",
  authenticate,
  remove
);

module.exports = router;