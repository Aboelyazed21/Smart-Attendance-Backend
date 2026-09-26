// Sessions + Attendance + Corrections paths.
const { SEC, R401, R403, R503, bodyRef, jsonRef, idParam } = require("../helpers");

module.exports = {
  "/api/sessions": {
    get: {
      tags: ["Sessions"],
      summary: "List sessions. Permission: session.view.",
      security: SEC,
      responses: { 200: { description: "Session list." }, 401: R401, 403: R403, 503: R503 },
    },
    post: {
      tags: ["Sessions"],
      summary: "Create a session. Permission: session.create.",
      security: SEC,
      requestBody: bodyRef("SessionCreate"),
      responses: {
        201: { description: "Session created." },
        400: jsonRef("Error", "sectionId and sessionDate are required."),
        401: R401,
        403: R403,
      },
    },
  },
  "/api/sessions/my": {
    get: {
      tags: ["Sessions"],
      summary: "Sessions of the logged-in student.",
      security: SEC,
      responses: { 200: { description: "Own sessions." }, 401: R401 },
    },
  },
  "/api/sessions/{id}": {
    get: {
      tags: ["Sessions"],
      summary: "Get one session. Permission: session.view.",
      security: SEC,
      parameters: [idParam("id", "Session id.")],
      responses: { 200: { description: "Session object." }, 401: R401, 404: jsonRef("Error", "Not found.") },
    },
  },
  "/api/sessions/{id}/qr": {
    get: {
      tags: ["Sessions"],
      summary: "Open a session and get a fresh signed QR token + qrDataUrl. Permission: session.view.",
      security: SEC,
      parameters: [idParam("id", "Session id.")],
      responses: {
        200: {
          description: "QR token, version, expiry and qrDataUrl.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: { type: "string" },
                  sessionId: { type: "integer" },
                  qr: {
                    type: "object",
                    properties: {
                      token: { type: "string" },
                      version: { type: "integer" },
                      expiresAt: { type: "string" },
                      rotationSeconds: { type: "integer" },
                      qrDataUrl: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
        400: jsonRef("Error", "Session cannot be opened."),
        401: R401,
        404: jsonRef("Error", "Session not found."),
      },
    },
  },
  "/api/sessions/{id}/qr/refresh": {
    post: {
      tags: ["Sessions"],
      summary: "Rotate the QR token of an active session. Permission: session.view.",
      security: SEC,
      parameters: [idParam("id", "Session id.")],
      responses: {
        200: { description: "New token + qrDataUrl." },
        400: jsonRef("Error", "Session is not active."),
        401: R401,
        404: jsonRef("Error", "Session not found."),
      },
    },
  },
  "/api/sessions/{id}/close": {
    patch: {
      tags: ["Sessions"],
      summary: "Close an active session. Permission: session.close.",
      security: SEC,
      parameters: [idParam("id", "Session id.")],
      responses: {
        200: { description: "Session closed." },
        400: jsonRef("Error", "Active session not found."),
        401: R401,
      },
    },
  },
  "/api/sessions/{id}/roster": {
    get: {
      tags: ["Sessions"],
      summary: "Session roster with per-student status. Permission: attendance.view.",
      security: SEC,
      parameters: [idParam("id", "Session id.")],
      responses: { 200: { description: "Roster rows." }, 401: R401 },
    },
  },
  "/api/attendance/scan": {
    post: {
      tags: ["Attendance"],
      summary: "Student QR scan (student only, rate limited). Missing event rows count as absent elsewhere.",
      security: SEC,
      requestBody: bodyRef("ScanRequest"),
      responses: {
        200: { description: "Already recorded (duplicate) or recorded." },
        201: { description: "Attendance recorded." },
        400: jsonRef("Error", "QR invalid/expired or session not active."),
        401: R401,
        403: jsonRef("Error", "Not enrolled / not a student."),
      },
    },
  },
  "/api/attendance": {
    get: {
      tags: ["Attendance"],
      summary: "List attendance events (filters: sessionId, studentId, status).",
      security: SEC,
      parameters: [
        { name: "sessionId", in: "query", schema: { type: "integer" } },
        { name: "studentId", in: "query", schema: { type: "integer" } },
        {
          name: "status",
          in: "query",
          schema: { type: "string", enum: ["present", "absent", "late", "excused"] },
        },
      ],
      responses: { 200: { description: "Attendance rows." }, 401: R401, 503: R503 },
    },
  },
  "/api/attendance/my": {
    get: {
      tags: ["Attendance"],
      summary: "Logged-in student attendance history.",
      security: SEC,
      responses: { 200: { description: "Own attendance rows." }, 401: R401 },
    },
  },
  "/api/attendance/{id}": {
    put: {
      tags: ["Attendance"],
      summary: "Manual attendance update (staff).",
      security: SEC,
      parameters: [idParam("id", "Attendance event id.")],
      requestBody: bodyRef("AttendanceUpdate"),
      responses: {
        200: { description: "Attendance updated." },
        400: jsonRef("Error", "Invalid status."),
        401: R401,
        404: jsonRef("Error", "Record not found."),
      },
    },
  },
  "/api/corrections": {
    get: {
      tags: ["Corrections"],
      summary: "Staff correction inbox (lecturer sees own sections, admin sees all). Permission: correction.review.",
      security: SEC,
      parameters: [
        { name: "status", in: "query", schema: { type: "string", enum: ["pending", "approved", "rejected"] } },
        { name: "sectionId", in: "query", schema: { type: "integer" } },
      ],
      responses: { 200: { description: "Correction requests." }, 401: R401, 403: R403 },
    },
    post: {
      tags: ["Corrections"],
      summary: "Student creates a correction request.",
      security: SEC,
      requestBody: bodyRef("CorrectionCreate"),
      responses: {
        201: { description: "Request created." },
        400: jsonRef("Error", "Validation error."),
        401: R401,
      },
    },
  },
  "/api/corrections/me": {
    get: {
      tags: ["Corrections"],
      summary: "Logged-in student correction requests.",
      security: SEC,
      responses: { 200: { description: "Own requests." }, 401: R401 },
    },
  },
  "/api/corrections/{eventId}": {
    patch: {
      tags: ["Corrections"],
      summary: "Manual attendance correction by event id. Permission: attendance.update.",
      security: SEC,
      parameters: [idParam("eventId", "Attendance event id.")],
      requestBody: bodyRef("CorrectionReview"),
      responses: {
        200: { description: "Review saved." },
        401: R401,
        403: R403,
        404: jsonRef("Error", "Not found."),
      },
    },
  },
  "/api/corrections/{id}/review": {
    patch: {
      tags: ["Corrections"],
      summary: "Approve/reject a correction request. Permission: correction.review.",
      security: SEC,
      parameters: [idParam("id", "Correction request id.")],
      requestBody: bodyRef("CorrectionReview"),
      responses: {
        200: { description: "Correction approved/rejected; attendance updated on approve." },
        400: jsonRef("Error", "Validation error."),
        401: R401,
        403: R403,
        404: jsonRef("Error", "Not found."),
      },
    },
  },
};
