const express = require("express");

const { authenticate } = require("../middleware/auth");

const notificationsController = require(
  "../controllers/notifications.controller"
);

const router = express.Router();

/* ============================================================
   NOTIFICATION CENTER (all authenticated roles)
   ============================================================ */

/*
  Role-scoped feed + unread counter for the bell badge.

  GET
  /api/notifications?limit=30
*/
router.get(
  "/",
  authenticate,
  notificationsController.list
);

/*
  Mark every visible notification as read.

  PATCH
  /api/notifications/read-all
*/
router.patch(
  "/read-all",
  authenticate,
  notificationsController.markAllRead
);

/*
  Mark one notification as read.

  PATCH
  /api/notifications/:id/read
*/
router.patch(
  "/:id/read",
  authenticate,
  notificationsController.markRead
);

module.exports = router;
