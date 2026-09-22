const express = require("express");

const router = express.Router();

const { authenticate } = require("../middleware/auth");

const {
  requirePermission,
} = require("../middleware/permission.middleware");

const {
  list,
  getById,
  create,
  open,
  refreshQr,
  close,
  roster,
} = require("../controllers/sessions.controller");

/* =========================================================
   LIST ATTENDANCE SESSIONS
   GET /api/sessions
========================================================= */

router.get(
  "/",
  authenticate,
  requirePermission("session.view"),
  list
);

/* =========================================================
   GET ATTENDANCE SESSION BY ID
   GET /api/sessions/:id
========================================================= */

router.get(
  "/:id",
  authenticate,
  requirePermission("session.view"),
  getById
);

/* =========================================================
   CREATE ATTENDANCE SESSION
   POST /api/sessions
========================================================= */

router.post(
  "/",
  authenticate,
  requirePermission("session.create"),
  create
);

/* =========================================================
   OPEN SESSION + GENERATE QR
   GET /api/sessions/:id/qr
========================================================= */

router.get(
  "/:id/qr",
  authenticate,
  requirePermission("session.view"),
  open
);

/* =========================================================
   REFRESH QR
   POST /api/sessions/:id/qr/refresh
========================================================= */

router.post(
  "/:id/qr/refresh",
  authenticate,
  requirePermission("session.view"),
  refreshQr
);

/* =========================================================
   CLOSE SESSION
   PATCH /api/sessions/:id/close
========================================================= */

router.patch(
  "/:id/close",
  authenticate,
  requirePermission("session.close"),
  close
);

/* =========================================================
   SESSION ROSTER
   GET /api/sessions/:id/roster
========================================================= */

router.get(
  "/:id/roster",
  authenticate,
  requirePermission("attendance.view"),
  roster
);

module.exports = router;