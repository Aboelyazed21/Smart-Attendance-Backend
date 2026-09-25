// ============================================================
// OPENAPI ROOT — Smart Attendance API documentation.
// Served at GET /api-docs (Swagger UI) and
// GET /api-docs.json (raw spec). Path modules below are
// generated from the real route files; every live route
// must appear here (see scripts/verify-swagger.js).
// No secrets are ever included in this spec.
// ============================================================

const authUsers = require("./paths/auth-users");
const academic = require("./paths/academic");
const sessionsAttendance = require("./paths/sessions-attendance");
const reportsAdmin = require("./paths/reports-admin");
const messagingSettings = require("./paths/messaging-settings");

function mergePaths(...modules) {
  const paths = {};

  for (const mod of modules) {
    for (const [routePath, operations] of Object.entries(mod)) {
      paths[routePath] = {
        ...(paths[routePath] || {}),
        ...operations,
      };
    }
  }

  return paths;
}

const spec = {
  openapi: "3.0.3",
  info: {
    title: "Smart Attendance API",
    version: "1.0.0",
    description: [
      "REST API for the Smart Attendance platform",
      "(Node.js + Express + MySQL).",
      "",
      "How to test:",
      "1. POST /api/login with an admin email + password.",
      "2. Copy the returned `token`.",
      "3. Click Authorize above and paste: Bearer <token>.",
      "4. Call any endpoint — the token is sent automatically.",
      "",
      "Maintenance mode: when enabled, non-admin requests to",
      "protected endpoints return HTTP 503 with",
      "`{ maintenance: true }`. Admin users are never blocked.",
    ].join("\n"),
  },
  servers: [
    {
      url: "https://smart-attendance-backend-production-e4f6.up.railway.app",
      description: "Production (Railway)",
    },
    {
      url: "http://localhost:5000",
      description: "Local development",
    },
  ],
  tags: [
    { name: "Auth", description: "Login, register, profile, password recovery." },
    { name: "Users", description: "User management." },
    { name: "Students", description: "Student profiles and enrollments." },
    { name: "Courses", description: "Courses." },
    { name: "Sections", description: "Course sections." },
    { name: "Rooms", description: "Rooms and buildings." },
    { name: "Timetable", description: "Timetable slots." },
    { name: "Sessions", description: "Attendance sessions and QR tokens." },
    { name: "Attendance", description: "QR scan and attendance records." },
    { name: "Corrections", description: "Attendance correction requests." },
    { name: "Reports", description: "Dashboards and attendance reports." },
    { name: "Lecturer", description: "Lecturer-scoped endpoints." },
    { name: "Admin", description: "Admin management, imports, summaries." },
    {
      name: "Weekly Email Reports",
      description: "Resend weekly attendance emails (admin).",
    },
    {
      name: "Platform Settings",
      description: "Platform name and maintenance mode (admin).",
    },
    {
      name: "Public",
      description: "Unauthenticated safe endpoints.",
    },
  ],
  security: [{ bearerAuth: [] }],
  paths: mergePaths(
    authUsers,
    academic,
    sessionsAttendance,
    reportsAdmin,
    messagingSettings
  ),
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "Paste: Bearer <token from POST /api/login>",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          message: { type: "string", example: "Access denied" },
        },
      },
      MaintenanceBlock: {
        type: "object",
        properties: {
          maintenance: { type: "boolean", example: true },
          message: {
            type: "string",
            example:
              "The platform is currently under maintenance.",
          },
          maintenanceUntil: {
            type: "string",
            nullable: true,
            example: null,
          },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["password"],
        properties: {
          identifier: {
            type: "string",
            description: "University email or university ID.",
            example: "admin@university.edu",
          },
          email: {
            type: "string",
            description: "Legacy alias for identifier.",
          },
          password: { type: "string", example: "secret123" },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["firstName", "lastName", "email", "password"],
        properties: {
          firstName: { type: "string" },
          lastName: { type: "string" },
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 1 },
          studentCode: { type: "string" },
          universityId: { type: "string" },
          phone: { type: "string" },
        },
      },
      UserCreate: {
        type: "object",
        required: ["firstName", "lastName", "email", "password", "role"],
        properties: {
          firstName: { type: "string" },
          lastName: { type: "string" },
          email: { type: "string", format: "email" },
          password: { type: "string" },
          role: {
            type: "string",
            example: "lecturer",
            description: "Role name (e.g. student, lecturer, ta, admin).",
          },
          phone: { type: "string" },
          status: { type: "string", example: "active" },
        },
      },
      StudentCreate: {
        type: "object",
        properties: {
          firstName: { type: "string" },
          lastName: { type: "string" },
          email: { type: "string", format: "email" },
          phone: { type: "string" },
          studentCode: { type: "string" },
          universityId: { type: "string" },
          department: { type: "string" },
          level: { type: "integer" },
          academicYear: { type: "string" },
          status: { type: "string", example: "active" },
          password: { type: "string" },
        },
      },
      CourseCreate: {
        type: "object",
        required: ["courseCode", "courseName"],
        properties: {
          courseCode: { type: "string", example: "CS201" },
          courseName: { type: "string", example: "Data Structures" },
          description: { type: "string" },
          creditHours: { type: "integer", example: 3 },
        },
      },
      SectionCreate: {
        type: "object",
        required: ["courseId", "sectionName", "academicYear", "semester"],
        properties: {
          courseId: { type: "integer" },
          sectionName: { type: "string", example: "A" },
          academicYear: { type: "string", example: "2025/2026" },
          semester: { type: "string", example: "first" },
          lecturerId: { type: "integer", nullable: true },
          capacity: { type: "integer", example: 100 },
        },
      },
      RoomCreate: {
        type: "object",
        required: ["building", "roomName"],
        properties: {
          building: { type: "string", example: "Building A" },
          roomName: { type: "string", example: "LAB-1" },
          roomType: { type: "string", example: "classroom" },
          capacity: { type: "integer", example: 100 },
          latitude: { type: "number", nullable: true },
          longitude: { type: "number", nullable: true },
        },
      },
      TimetableCreate: {
        type: "object",
        properties: {
          sectionId: { type: "integer" },
          roomId: { type: "integer", nullable: true },
          dayOfWeek: { type: "string", example: "monday" },
          startTime: { type: "string", example: "10:00" },
          endTime: { type: "string", example: "12:00" },
          startDate: { type: "string", format: "date", nullable: true },
          endDate: { type: "string", format: "date", nullable: true },
        },
      },
      SessionCreate: {
        type: "object",
        required: ["sectionId", "sessionDate"],
        properties: {
          sectionId: { type: "integer" },
          roomId: { type: "integer", nullable: true },
          sessionDate: { type: "string", format: "date" },
          scheduledStart: { type: "string", example: "10:00" },
          scheduledEnd: { type: "string", example: "12:00" },
        },
      },
      ScanRequest: {
        type: "object",
        required: ["token"],
        properties: {
          token: {
            type: "string",
            description: "Short-lived signed QR token from the session.",
          },
        },
      },
      AttendanceUpdate: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["present", "absent", "late", "excused"],
          },
          notes: { type: "string" },
        },
      },
      CorrectionCreate: {
        type: "object",
        required: ["requestedStatus", "reason"],
        properties: {
          attendanceEventId: { type: "integer", nullable: true },
          requestedStatus: {
            type: "string",
            enum: ["present", "absent", "late", "excused"],
          },
          reason: { type: "string" },
          evidenceUrl: { type: "string", nullable: true },
        },
      },
      CorrectionReview: {
        type: "object",
        properties: {
          status: {
            type: "string",
            description: "Review decision, e.g. approved / rejected.",
            example: "approved",
          },
          reviewerComment: { type: "string" },
          sessionId: { type: "integer" },
          studentId: { type: "integer" },
          reason: { type: "string" },
          notes: { type: "string" },
        },
      },
      EnrollRequest: {
        type: "object",
        required: ["sectionId"],
        properties: { sectionId: { type: "integer" } },
      },
      LecturerAddStudent: {
        type: "object",
        required: ["email"],
        properties: { email: { type: "string", format: "email" } },
      },
      WeeklyEmailSettingsPatch: {
        type: "object",
        properties: {
          enabled: { type: "boolean", example: true },
          day: {
            type: "integer",
            minimum: 0,
            maximum: 6,
            example: 5,
            description: "0 = Sunday .. 6 = Saturday (5 = Friday).",
          },
          time: { type: "string", example: "18:00" },
          timezone: { type: "string", example: "Africa/Cairo" },
        },
      },
      WeeklyEmailSend: {
        type: "object",
        properties: {
          periodStart: {
            type: "string",
            format: "date",
            description: "Defaults to the previous academic week.",
          },
          periodEnd: { type: "string", format: "date" },
          studentId: {
            type: "integer",
            description: "Send to one student only.",
          },
          force: {
            type: "boolean",
            description: "Resend already-sent reports.",
          },
          dryRun: {
            type: "boolean",
            description: "Count only, send nothing.",
          },
        },
      },
      WeeklyEmailPreview: {
        type: "object",
        required: ["studentId"],
        properties: {
          studentId: { type: "integer" },
          periodStart: { type: "string", format: "date" },
          periodEnd: { type: "string", format: "date" },
        },
      },
      PlatformSettingsPatch: {
        type: "object",
        properties: {
          platformName: {
            type: "string",
            maxLength: 80,
            example: "Smart Attendance",
          },
          maintenanceMode: { type: "boolean", example: false },
          maintenanceMessage: {
            type: "string",
            maxLength: 500,
            example:
              "The platform is currently under maintenance.",
          },
          maintenanceUntil: {
            type: "string",
            nullable: true,
            example: "2026-10-01T18:00",
            description: "Valid date/time string, or null/empty.",
          },
        },
      },
      PublicSettings: {
        type: "object",
        properties: {
          platformName: { type: "string", example: "Smart Attendance" },
          maintenanceMode: { type: "boolean", example: false },
          maintenanceMessage: { type: "string" },
          maintenanceUntil: { type: "string", nullable: true },
        },
      },
    },
  },
};

module.exports = spec;
