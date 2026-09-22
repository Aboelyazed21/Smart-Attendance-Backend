const express = require("express");

const router = express.Router();

const { authenticate } = require("../middleware/auth");

const {
  requirePermission,
} = require("../middleware/permission.middleware");

const {
  list,
  create,
  update,
  remove,
} = require("../controllers/users.controller");

/* =========================================================
   GET ALL USERS
   GET /api/users
========================================================= */

router.get(
  "/",
  authenticate,
  requirePermission("user.view"),
  list
);

/* =========================================================
   CREATE USER
   POST /api/users
========================================================= */

router.post(
  "/",
  authenticate,
  requirePermission("user.create"),
  create
);

/* =========================================================
   UPDATE USER
   PUT /api/users/:id
========================================================= */

router.put(
  "/:id",
  authenticate,
  requirePermission("user.update"),
  update
);

/* =========================================================
   UPDATE USER
   PATCH /api/users/:id
========================================================= */

router.patch(
  "/:id",
  authenticate,
  requirePermission("user.update"),
  update
);

/* =========================================================
   DELETE USER
   DELETE /api/users/:id
========================================================= */

router.delete(
  "/:id",
  authenticate,
  requirePermission("user.delete"),
  remove
);

module.exports = router;