const { pool } = require("../config/db");

/* =========================================================
   GET ALL ROOMS
========================================================= */

async function list(req, res) {
  const [rows] = await pool.query(
    "SELECT * FROM rooms ORDER BY id DESC"
  );

  res.json(rows);
}

/* =========================================================
   CREATE ROOM
========================================================= */

async function create(req, res) {
  const {
    building,
    roomName,
    roomType = "classroom",
    capacity = 100,
    latitude,
    longitude,
  } = req.body;

  if (!building || !roomName) {
    return res.status(400).json({
      message: "building and roomName are required",
    });
  }

  const allowedRoomTypes = [
    "classroom",
    "lab",
    "hall",
  ];

  if (!allowedRoomTypes.includes(roomType)) {
    return res.status(400).json({
      message:
        "roomType must be classroom, lab, or hall",
    });
  }

  const [result] = await pool.query(
    `
      INSERT INTO rooms
      (
        building,
        room_name,
        room_type,
        capacity,
        latitude,
        longitude
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      building,
      roomName,
      roomType,
      capacity,
      latitude || null,
      longitude || null,
    ]
  );

  res.status(201).json({
    id: result.insertId,
    message: "Room created",
  });
}

/* =========================================================
   UPDATE ROOM
========================================================= */

async function update(req, res) {
  const roomId = req.params.id;

  const {
    building,
    roomName,
    roomType,
    capacity,
    latitude,
    longitude,
  } = req.body;

  if (!building || !roomName) {
    return res.status(400).json({
      message: "building and roomName are required",
    });
  }

  const allowedRoomTypes = [
    "classroom",
    "lab",
    "hall",
  ];

  if (
    roomType &&
    !allowedRoomTypes.includes(roomType)
  ) {
    return res.status(400).json({
      message:
        "roomType must be classroom, lab, or hall",
    });
  }

  const [result] = await pool.query(
    `
      UPDATE rooms
      SET
        building = ?,
        room_name = ?,
        room_type = ?,
        capacity = ?,
        latitude = ?,
        longitude = ?
      WHERE id = ?
    `,
    [
      building,
      roomName,
      roomType || "classroom",
      capacity ?? 100,
      latitude || null,
      longitude || null,
      roomId,
    ]
  );

  if (!result.affectedRows) {
    return res.status(404).json({
      message: "Room not found",
    });
  }

  res.json({
    message: "Room updated successfully",
  });
}

/* =========================================================
   DELETE ROOM
========================================================= */

async function remove(req, res) {
  const roomId = req.params.id;

  try {
    const [result] = await pool.query(
      `
        DELETE FROM rooms
        WHERE id = ?
      `,
      [roomId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    res.json({
      message: "Room deleted successfully",
    });
  } catch (error) {
    /*
      Room may already be referenced by
      timetable_slots or attendance_sessions.
    */

    if (
      error.code === "ER_ROW_IS_REFERENCED_2" ||
      error.code === "ER_ROW_IS_REFERENCED"
    ) {
      return res.status(409).json({
        message:
          "This room cannot be deleted because it is already used by a timetable or attendance session.",
      });
    }

    throw error;
  }
}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  list,
  create,
  update,
  remove,
};