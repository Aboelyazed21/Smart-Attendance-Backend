const express = require("express");

const router = express.Router();

const timetable = require("../controllers/timetable.controller");

const {
  authenticate,
  authorize,
} = require("../middleware/auth");

const asyncHandler = require("../utils/asyncHandler");

/*
|--------------------------------------------------------------------------
| Get All Timetable Slots
| GET /api/timetable
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  authenticate,
  asyncHandler(timetable.list)
);

/*
|--------------------------------------------------------------------------
| Get Timetable Slot By ID
| GET /api/timetable/:id
|--------------------------------------------------------------------------
*/

router.get(
  "/:id",
  authenticate,
  asyncHandler(timetable.getById)
);

/*
|--------------------------------------------------------------------------
| Create Timetable Slot
| POST /api/timetable
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  authenticate,
  authorize("admin"),
  asyncHandler(timetable.create)
);

/*
|--------------------------------------------------------------------------
| Update Timetable Slot
| PUT /api/timetable/:id
|--------------------------------------------------------------------------
*/

router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  asyncHandler(timetable.update)
);

/*
|--------------------------------------------------------------------------
| Delete Timetable Slot
| DELETE /api/timetable/:id
|--------------------------------------------------------------------------
*/

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  asyncHandler(timetable.remove)
);

module.exports = router;