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
} = require("../controllers/rooms.controller");

/* =========================================================
   GET ALL ROOMS
   GET /api/rooms
========================================================= */

router.get(
  "/",
  authenticate,
  requirePermission("room.view"),
  list
);

/* =========================================================
   CREATE ROOM
   POST /api/rooms
========================================================= */

router.post(
  "/",
  authenticate,
  requirePermission("room.create"),
  create
);

/* =========================================================
   UPDATE ROOM
   PUT /api/rooms/:id
========================================================= */

router.put(
  "/:id",
  authenticate,
  requirePermission("room.update"),
  update
);

/* =========================================================
   DELETE ROOM
   DELETE /api/rooms/:id
========================================================= */

router.delete(
  "/:id",
  authenticate,
  requirePermission("room.delete"),
  remove
);

module.exports = router;