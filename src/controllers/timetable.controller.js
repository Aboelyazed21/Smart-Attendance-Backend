const { pool } = require("../config/db");

/*
|--------------------------------------------------------------------------
| Valid Days
|--------------------------------------------------------------------------
*/

const VALID_DAYS = [
  "saturday",
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
];

/*
|--------------------------------------------------------------------------
| Get All Timetable Slots
|--------------------------------------------------------------------------
*/

async function list(req, res) {
  const [rows] = await pool.query(`
    SELECT
      t.id,
      t.section_id,
      t.room_id,
      t.day_of_week,
      t.start_time,
      t.end_time,
      t.start_date,
      t.end_date,
      t.created_at,

      s.section_name,
      s.academic_year,
      s.semester,
      s.capacity AS section_capacity,

      c.id AS course_id,
      c.course_code,
      c.course_name,

      r.building,
      r.room_name,
      r.room_type,
      r.capacity AS room_capacity

    FROM timetable_slots t

    INNER JOIN sections s
      ON s.id = t.section_id

    INNER JOIN courses c
      ON c.id = s.course_id

    LEFT JOIN rooms r
      ON r.id = t.room_id

    ORDER BY
      FIELD(
        t.day_of_week,
        'saturday',
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday'
      ),
      t.start_time ASC,
      t.id DESC
  `);

  res.json(rows);
}

/*
|--------------------------------------------------------------------------
| Get Timetable Slot By ID
|--------------------------------------------------------------------------
*/

async function getById(req, res) {
  const [rows] = await pool.query(
    `
      SELECT
        t.id,
        t.section_id,
        t.room_id,
        t.day_of_week,
        t.start_time,
        t.end_time,
        t.start_date,
        t.end_date,
        t.created_at,

        s.section_name,
        s.academic_year,
        s.semester,

        c.id AS course_id,
        c.course_code,
        c.course_name,

        r.building,
        r.room_name,
        r.room_type,
        r.capacity AS room_capacity

      FROM timetable_slots t

      INNER JOIN sections s
        ON s.id = t.section_id

      INNER JOIN courses c
        ON c.id = s.course_id

      LEFT JOIN rooms r
        ON r.id = t.room_id

      WHERE t.id = ?
    `,
    [req.params.id]
  );

  if (!rows.length) {
    return res.status(404).json({
      message: "Timetable slot not found",
    });
  }

  res.json(rows[0]);
}

/*
|--------------------------------------------------------------------------
| Create Timetable Slot
|--------------------------------------------------------------------------
*/

async function create(req, res) {
  const {
    sectionId,
    roomId,
    dayOfWeek,
    startTime,
    endTime,
    startDate,
    endDate,
  } = req.body;

  /*
  |--------------------------------------------------------------------------
  | Required Fields
  | Room and dates are optional: the schema allows NULL room_id,
  | start_date and end_date, and the UI offers a "No Room" choice.
  |--------------------------------------------------------------------------
  */

  if (
    !sectionId ||
    !dayOfWeek ||
    !startTime ||
    !endTime
  ) {
    return res.status(400).json({
      message: "Section, day and time are required",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Validate Day
  |--------------------------------------------------------------------------
  */

  if (!VALID_DAYS.includes(dayOfWeek)) {
    return res.status(400).json({
      message: "Invalid day of week",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Validate Time
  |--------------------------------------------------------------------------
  */

  if (startTime >= endTime) {
    return res.status(400).json({
      message: "Start time must be before end time",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Validate Dates (only when both are provided)
  |--------------------------------------------------------------------------
  */

  if (startDate && endDate && startDate > endDate) {
    return res.status(400).json({
      message: "Start date must be before or equal to end date",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Check Section
  |--------------------------------------------------------------------------
  */

  const [sectionRows] = await pool.query(
    `
      SELECT
        id,
        capacity
      FROM sections
      WHERE id = ?
    `,
    [sectionId]
  );

  if (!sectionRows.length) {
    return res.status(404).json({
      message: "Section not found",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Check Room (optional — a slot may have no room yet)
  |--------------------------------------------------------------------------
  */

  let roomRows = [];

  if (
    roomId !== undefined &&
    roomId !== null &&
    roomId !== ""
  ) {
    [roomRows] = await pool.query(
      `
      SELECT
        id,
        capacity
      FROM rooms
      WHERE id = ?
      `,
      [roomId]
    );

    if (!roomRows.length) {
      return res.status(404).json({
        message: "Room not found",
      });
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Check Room Capacity
  |--------------------------------------------------------------------------
  */

  if (
    roomRows.length &&
    sectionRows[0].capacity &&
    roomRows[0].capacity &&
    sectionRows[0].capacity > roomRows[0].capacity
  ) {
    return res.status(400).json({
      message:
        "Room capacity is smaller than the section capacity",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Check Schedule Conflict
  | Room-less or open-dated slots cannot be reliably
  | compared, so the check only runs when room and both
  | dates are known.
  |--------------------------------------------------------------------------
  */

  if (
    roomRows.length &&
    startDate &&
    endDate
  ) {
    const [conflicts] = await pool.query(
      `
      SELECT
        t.id,
        t.section_id,
        t.room_id,
        t.start_time,
        t.end_time
      FROM timetable_slots t

      WHERE
        t.room_id = ?
        AND t.day_of_week = ?

        AND t.start_date <= ?
        AND t.end_date >= ?

        AND t.start_time < ?
        AND t.end_time > ?
      `,
      [
        roomId,
        dayOfWeek,
        endDate,
        startDate,
        endTime,
        startTime,
      ]
    );

    if (conflicts.length) {
      return res.status(409).json({
        message:
          "This room already has another timetable slot at the selected time",
        conflict: conflicts[0],
      });
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Insert
  |--------------------------------------------------------------------------
  */

  const [result] = await pool.query(
    `
      INSERT INTO timetable_slots
      (
        section_id,
        room_id,
        day_of_week,
        start_time,
        end_time,
        start_date,
        end_date
      )

      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      sectionId,
      roomId ?? null,
      dayOfWeek,
      startTime,
      endTime,
      startDate ?? null,
      endDate ?? null,
    ]
  );

  res.status(201).json({
    id: result.insertId,
    message: "Timetable slot created successfully",
  });
}

/*
|--------------------------------------------------------------------------
| Update Timetable Slot
|--------------------------------------------------------------------------
*/

async function update(req, res) {
  const {
    sectionId,
    roomId,
    dayOfWeek,
    startTime,
    endTime,
    startDate,
    endDate,
  } = req.body;

  const timetableId = req.params.id;

  /*
  |--------------------------------------------------------------------------
  | Check Existing Slot
  |--------------------------------------------------------------------------
  */

  const [existingRows] = await pool.query(
    `
      SELECT *
      FROM timetable_slots
      WHERE id = ?
    `,
    [timetableId]
  );

  if (!existingRows.length) {
    return res.status(404).json({
      message: "Timetable slot not found",
    });
  }

  const existing = existingRows[0];

  const finalSectionId =
    sectionId ?? existing.section_id;

  const finalRoomId =
    roomId ?? existing.room_id;

  const finalDay =
    dayOfWeek ?? existing.day_of_week;

  const finalStartTime =
    startTime ?? existing.start_time;

  const finalEndTime =
    endTime ?? existing.end_time;

  const finalStartDate =
    startDate ?? existing.start_date;

  const finalEndDate =
    endDate ?? existing.end_date;

  /*
  |--------------------------------------------------------------------------
  | Validation
  |--------------------------------------------------------------------------
  */

  if (!VALID_DAYS.includes(finalDay)) {
    return res.status(400).json({
      message: "Invalid day of week",
    });
  }

  if (finalStartTime >= finalEndTime) {
    return res.status(400).json({
      message: "Start time must be before end time",
    });
  }

  if (finalStartDate && finalEndDate && finalStartDate > finalEndDate) {
    return res.status(400).json({
      message: "Start date must be before or equal to end date",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Check Section
  |--------------------------------------------------------------------------
  */

  const [sectionRows] = await pool.query(
    `
      SELECT
        id,
        capacity
      FROM sections
      WHERE id = ?
    `,
    [finalSectionId]
  );

  if (!sectionRows.length) {
    return res.status(404).json({
      message: "Section not found",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Check Room (a slot may have no room yet)
  |--------------------------------------------------------------------------
  */

  let roomRows = [];

  if (
    finalRoomId !== undefined &&
    finalRoomId !== null &&
    finalRoomId !== ""
  ) {
    [roomRows] = await pool.query(
      `
      SELECT
        id,
        capacity
      FROM rooms
      WHERE id = ?
      `,
      [finalRoomId]
    );

    if (!roomRows.length) {
      return res.status(404).json({
        message: "Room not found",
      });
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Check Capacity
  |--------------------------------------------------------------------------
  */

  if (
    roomRows.length &&
    sectionRows[0].capacity &&
    roomRows[0].capacity &&
    sectionRows[0].capacity > roomRows[0].capacity
  ) {
    return res.status(400).json({
      message:
        "Room capacity is smaller than the section capacity",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Check Conflict (only when room and both dates are known)
  |--------------------------------------------------------------------------
  */

  if (
    roomRows.length &&
    finalStartDate &&
    finalEndDate
  ) {
    const [conflicts] = await pool.query(
      `
      SELECT
        t.id,
        t.section_id,
        t.room_id,
        t.start_time,
        t.end_time
      FROM timetable_slots t

      WHERE
        t.id != ?

        AND t.room_id = ?
        AND t.day_of_week = ?

        AND t.start_date <= ?
        AND t.end_date >= ?

        AND t.start_time < ?
        AND t.end_time > ?
      `,
      [
        timetableId,
        finalRoomId,
        finalDay,
        finalEndDate,
        finalStartDate,
        finalEndTime,
        finalStartTime,
      ]
    );

    if (conflicts.length) {
      return res.status(409).json({
        message:
          "This room already has another timetable slot at the selected time",
        conflict: conflicts[0],
      });
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Update
  |--------------------------------------------------------------------------
  */

  await pool.query(
    `
      UPDATE timetable_slots

      SET
        section_id = ?,
        room_id = ?,
        day_of_week = ?,
        start_time = ?,
        end_time = ?,
        start_date = ?,
        end_date = ?

      WHERE id = ?
    `,
    [
      finalSectionId,
      finalRoomId,
      finalDay,
      finalStartTime,
      finalEndTime,
      finalStartDate,
      finalEndDate,
      timetableId,
    ]
  );

  res.json({
    message: "Timetable slot updated successfully",
  });
}

/*
|--------------------------------------------------------------------------
| Delete Timetable Slot
|--------------------------------------------------------------------------
*/

async function remove(req, res) {
  const [result] = await pool.query(
    `
      DELETE FROM timetable_slots
      WHERE id = ?
    `,
    [req.params.id]
  );

  if (!result.affectedRows) {
    return res.status(404).json({
      message: "Timetable slot not found",
    });
  }

  res.json({
    message: "Timetable slot deleted successfully",
  });
}

/*
|--------------------------------------------------------------------------
| Export
|--------------------------------------------------------------------------
*/

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
};