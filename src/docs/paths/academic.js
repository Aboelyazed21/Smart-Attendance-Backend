// Courses + Sections + Rooms + Timetable paths.
// Permissions below match the route middleware exactly:
// courses/rooms use granular permissions, sections and
// timetable require authentication only.
const { SEC, R401, R403, R503, bodyRef, jsonRef, idParam } = require("../helpers");

function permNote(perm) {
  return perm ? ` Permission: ${perm}.` : " Authentication only.";
}

function collection(tag, summary, perm) {
  return {
    tags: [tag],
    summary: `List.${permNote(perm)}`,
    security: SEC,
    responses: {
      200: { description: summary },
      401: R401,
      ...(perm ? { 403: R403, 503: R503 } : { 503: R503 }),
    },
  };
}

function create(tag, schema, perm) {
  return {
    tags: [tag],
    summary: `Create.${permNote(perm)}`,
    security: SEC,
    requestBody: bodyRef(schema),
    responses: {
      201: { description: "Created." },
      400: jsonRef("Error", "Validation error."),
      401: R401,
      ...(perm ? { 403: R403 } : {}),
    },
  };
}

function update(tag, schema, perm) {
  return {
    tags: [tag],
    summary: `Update.${permNote(perm)}`,
    security: SEC,
    parameters: [idParam("id")],
    requestBody: bodyRef(schema, false),
    responses: {
      200: { description: "Updated." },
      401: R401,
      404: jsonRef("Error", "Not found."),
    },
  };
}

function remove(tag, perm) {
  return {
    tags: [tag],
    summary: `Delete.${permNote(perm)}`,
    security: SEC,
    parameters: [idParam("id")],
    responses: {
      200: { description: "Deleted." },
      401: R401,
      404: jsonRef("Error", "Not found."),
    },
  };
}

module.exports = {
  "/api/courses": {
    get: collection("Courses", "Course list.", "course.view"),
    post: create("Courses", "CourseCreate", "course.create"),
  },
  "/api/courses/{id}": {
    put: update("Courses", "CourseCreate", "course.update"),
    delete: remove("Courses", "course.delete"),
  },
  "/api/sections": {
    get: collection("Sections", "Section list.", null),
    post: create("Sections", "SectionCreate", null),
  },
  "/api/sections/{id}": {
    put: update("Sections", "SectionCreate", null),
    delete: remove("Sections", null),
  },
  "/api/rooms": {
    get: collection("Rooms", "Room list.", "room.view"),
    post: create("Rooms", "RoomCreate", "room.create"),
  },
  "/api/rooms/{id}": {
    put: update("Rooms", "RoomCreate", "room.update"),
    delete: remove("Rooms", "room.delete"),
  },
  "/api/timetable": {
    get: collection("Timetable", "Timetable slots.", null),
    post: create("Timetable", "TimetableCreate", null),
  },
  "/api/timetable/{id}": {
    get: {
      tags: ["Timetable"],
      summary: "Get one slot. Authentication only.",
      security: SEC,
      parameters: [idParam("id")],
      responses: {
        200: { description: "Timetable slot." },
        401: R401,
        404: jsonRef("Error", "Not found."),
      },
    },
    put: update("Timetable", "TimetableCreate", null),
    delete: remove("Timetable", null),
  },
};
