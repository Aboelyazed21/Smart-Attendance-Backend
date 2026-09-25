// Reports + Lecturer + Admin paths.
const { SEC, R401, R403, R503, bodyRef, jsonRef, idParam } = require("../helpers");

const reportFilters = [
  { name: "sectionId", in: "query", schema: { type: "integer" } },
  { name: "courseId", in: "query", schema: { type: "integer" } },
  { name: "status", in: "query", schema: { type: "string" } },
  { name: "startDate", in: "query", schema: { type: "string", format: "date" } },
  { name: "endDate", in: "query", schema: { type: "string", format: "date" } },
];

const csvUpload = {
  required: true,
  content: {
    "multipart/form-data": {
      schema: {
        type: "object",
        required: ["file"],
        properties: {
          file: { type: "string", format: "binary", description: "CSV file." },
        },
      },
    },
  },
};

function adminUserCrud(base, schemaName, summary, withGetById) {
  const byId = {
    patch: {
      tags: ["Admin"],
      summary: `Update ${summary.toLowerCase()}.`,
      security: SEC,
      parameters: [idParam("id")],
      requestBody: bodyRef(schemaName, false),
      responses: { 200: { description: "Updated." }, 401: R401, 404: jsonRef("Error", "Not found.") },
    },
    delete: {
      tags: ["Admin"],
      summary: `Delete ${summary.toLowerCase()}.`,
      security: SEC,
      parameters: [idParam("id")],
      responses: { 200: { description: "Deleted." }, 401: R401, 404: jsonRef("Error", "Not found.") },
    },
  };

  if (withGetById) {
    byId.get = {
      tags: ["Admin"],
      summary: `Get one ${summary.toLowerCase()}.`,
      security: SEC,
      parameters: [idParam("id")],
      responses: { 200: { description: "Object." }, 401: R401, 404: jsonRef("Error", "Not found.") },
    };
  }

  return {
    [base]: {
      get: {
        tags: ["Admin"],
        summary: `${summary} list.`,
        security: SEC,
        responses: { 200: { description: "List." }, 401: R401, 403: R403 },
      },
      post: {
        tags: ["Admin"],
        summary: `Create ${summary.toLowerCase()}.`,
        security: SEC,
        requestBody: bodyRef(schemaName),
        responses: { 201: { description: "Created." }, 400: jsonRef("Error", "Validation error."), 401: R401 },
      },
    },
    [`${base}/{id}`]: byId,
  };
}

module.exports = {
  "/api/reports/dashboard": {
    get: {
      tags: ["Reports"],
      summary: "Dashboard counters (students, sessions, records, pending).",
      security: SEC,
      responses: { 200: { description: "Counters." }, 401: R401 },
    },
  },
  "/api/reports/attendance": {
    get: {
      tags: ["Reports"],
      summary: "Attendance report (filters: sectionId, courseId, status, startDate, endDate). Permission: report.view.",
      security: SEC,
      parameters: reportFilters,
      responses: { 200: { description: "Report rows." }, 401: R401, 403: R403 },
    },
  },
  "/api/reports/students": {
    get: {
      tags: ["Reports"],
      summary: "Per-student attendance summary. Permission: report.view.",
      security: SEC,
      responses: { 200: { description: "Summary rows." }, 401: R401, 403: R403 },
    },
  },
  "/api/reports/courses": {
    get: {
      tags: ["Reports"],
      summary: "Per-course attendance summary. Permission: report.view.",
      security: SEC,
      responses: { 200: { description: "Summary rows." }, 401: R401, 403: R403 },
    },
  },
  "/api/lecturer-dashboard/stats": {
    get: {
      tags: ["Lecturer"],
      summary: "Lecturer dashboard stats (lecturer role).",
      security: SEC,
      responses: { 200: { description: "Stats." }, 401: R401, 403: R403 },
    },
  },
  "/api/lecturer/sections": {
    get: {
      tags: ["Lecturer"],
      summary: "Sections of the logged-in lecturer.",
      security: SEC,
      responses: { 200: { description: "Own sections." }, 401: R401 },
    },
  },
  "/api/lecturer/enrollment/sections": {
    get: {
      tags: ["Lecturer"],
      summary: "Lecturer-owned sections for enrollment management.",
      security: SEC,
      responses: { 200: { description: "Sections." }, 401: R401 },
    },
  },
  "/api/lecturer/enrollment/sections/{sectionId}/students": {
    get: {
      tags: ["Lecturer"],
      summary: "Students enrolled in one lecturer-owned section.",
      security: SEC,
      parameters: [idParam("sectionId", "Section id.")],
      responses: { 200: { description: "Enrolled students." }, 401: R401 },
    },
    post: {
      tags: ["Lecturer"],
      summary: "Add an existing student to a lecturer-owned section by email.",
      security: SEC,
      parameters: [idParam("sectionId", "Section id.")],
      requestBody: bodyRef("LecturerAddStudent"),
      responses: { 201: { description: "Student added." }, 400: jsonRef("Error", "Validation error."), 401: R401 },
    },
  },
  "/api/lecturer/enrollment/{enrollmentId}": {
    delete: {
      tags: ["Lecturer"],
      summary: "Remove a student enrollment from a lecturer-owned section.",
      security: SEC,
      parameters: [idParam("enrollmentId", "Enrollment id.")],
      responses: { 200: { description: "Removed." }, 401: R401, 404: jsonRef("Error", "Not found.") },
    },
  },
  "/api/student/attendance/summary": {
    get: {
      tags: ["Students"],
      summary: "Attendance analytics of the logged-in student (student role).",
      security: SEC,
      responses: { 200: { description: "Overall + weekly + per-course summary." }, 401: R401, 403: R403 },
    },
  },
  "/api/admin/test": {
    get: {
      tags: ["Admin"],
      summary: "Admin router health check (no auth).",
      security: [],
      responses: { 200: { description: "{ success: true }." } },
    },
  },
  "/api/admin/roles": {
    get: {
      tags: ["Admin"],
      summary: "List roles. Permission: user.manage.",
      security: SEC,
      responses: { 200: { description: "Roles." }, 401: R401, 403: R403 },
    },
  },
  "/api/admin/sections": {
    get: {
      tags: ["Admin"],
      summary: "Admin sections view. Permission: user.manage.",
      security: SEC,
      responses: { 200: { description: "Sections." }, 401: R401, 403: R403 },
    },
  },
  "/api/admin/rooms": {
    get: {
      tags: ["Admin"],
      summary: "Admin rooms view. Permission: user.manage.",
      security: SEC,
      responses: { 200: { description: "Rooms." }, 401: R401, 403: R403 },
    },
  },
  "/api/admin/enrollments": {
    get: {
      tags: ["Admin"],
      summary: "Admin enrollments view. Permission: user.manage.",
      security: SEC,
      responses: { 200: { description: "Enrollments." }, 401: R401, 403: R403 },
    },
  },
  "/api/admin/timetable": {
    get: {
      tags: ["Admin"],
      summary: "Admin timetable view. Permission: user.manage.",
      security: SEC,
      responses: { 200: { description: "Slots." }, 401: R401, 403: R403 },
    },
  },
  "/api/admin/attendance-summaries/run": {
    post: {
      tags: ["Admin"],
      summary: "Manually trigger weekly WhatsApp summaries. Permission: user.manage.",
      security: SEC,
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                dryRun: {
                  type: "boolean",
                  description: "Default true: preview counts without sending.",
                },
              },
            },
          },
        },
      },
      responses: { 200: { description: "Run stats." }, 401: R401, 500: jsonRef("Error", "Run failed.") },
    },
  },
  "/api/admin/import/courses": {
    post: {
      tags: ["Admin"],
      summary: "Import courses from CSV. Permission: course.create.",
      security: SEC,
      requestBody: csvUpload,
      responses: { 200: { description: "Import result." }, 400: jsonRef("Error", "Bad file."), 401: R401 },
    },
  },
  "/api/admin/import/students": {
    post: {
      tags: ["Admin"],
      summary: "Import students from CSV. Permission: user.manage.",
      security: SEC,
      requestBody: csvUpload,
      responses: { 200: { description: "Import result." }, 400: jsonRef("Error", "Bad file."), 401: R401 },
    },
  },
  "/api/admin/import/sections": {
    post: {
      tags: ["Admin"],
      summary: "Import sections from CSV. Permission: user.manage.",
      security: SEC,
      requestBody: csvUpload,
      responses: { 200: { description: "Import result." }, 400: jsonRef("Error", "Bad file."), 401: R401 },
    },
  },
  "/api/admin/import/enrollments": {
    post: {
      tags: ["Admin"],
      summary: "Import enrollments from CSV. Permission: user.manage.",
      security: SEC,
      requestBody: csvUpload,
      responses: { 200: { description: "Import result." }, 400: jsonRef("Error", "Bad file."), 401: R401 },
    },
  },
  "/api/admin/import/rooms": {
    post: {
      tags: ["Admin"],
      summary: "Import rooms from CSV. Permission: user.manage.",
      security: SEC,
      requestBody: csvUpload,
      responses: { 200: { description: "Import result." }, 400: jsonRef("Error", "Bad file."), 401: R401 },
    },
  },
  "/api/admin/import/timetable": {
    post: {
      tags: ["Admin"],
      summary: "Import timetable slots from CSV. Permission: user.manage.",
      security: SEC,
      requestBody: csvUpload,
      responses: { 200: { description: "Import result." }, 400: jsonRef("Error", "Bad file."), 401: R401 },
    },
  },
  ...adminUserCrud("/api/admin/users", "UserCreate", "User", false),
  ...adminUserCrud("/api/admin/students", "StudentCreate", "Student", true),
  ...adminUserCrud("/api/admin/courses", "CourseCreate", "Course", false),
};
