// Auth + Users + Students paths.
const { SEC, R401, R503, jsonRef, bodyRef, idParam } = require("../helpers");

module.exports = {
  "/api/login": {
    post: {
      tags: ["Auth"],
      summary: "Login with university email / ID + password.",
      security: [],
      requestBody: bodyRef("LoginRequest"),
      responses: {
        200: {
          description: "JWT token + user object.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: { type: "string" },
                  token: { type: "string" },
                  user: { type: "object" },
                },
              },
            },
          },
        },
        400: jsonRef("Error", "Missing credentials."),
        401: jsonRef("Error", "Invalid credentials or inactive account."),
      },
    },
  },
  "/api/register": {
    post: {
      tags: ["Auth"],
      summary: "Public student registration.",
      security: [],
      requestBody: bodyRef("RegisterRequest"),
      responses: {
        201: { description: "Student registered." },
        400: jsonRef("Error", "Validation error."),
        403: jsonRef("Error", "Only student role is allowed publicly."),
        409: jsonRef("Error", "Email already exists."),
      },
    },
  },
  "/api/auth/me": {
    get: {
      tags: ["Auth"],
      summary: "Current authenticated user.",
      security: SEC,
      responses: {
        200: { description: "User object with role." },
        401: R401,
        404: jsonRef("Error", "User not found."),
      },
    },
    put: {
      tags: ["Auth"],
      summary: "Update own profile (firstName, lastName, email, phone).",
      security: SEC,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                firstName: { type: "string" },
                lastName: { type: "string" },
                email: { type: "string", format: "email" },
                phone: { type: "string" },
              },
            },
          },
        },
      },
      responses: { 200: { description: "Profile updated." }, 401: R401 },
    },
  },
  "/api/auth/me/password": {
    put: {
      tags: ["Auth"],
      summary: "Change own password.",
      security: SEC,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["currentPassword", "newPassword"],
              properties: {
                currentPassword: { type: "string" },
                newPassword: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Password changed." },
        400: jsonRef("Error", "Validation error."),
        401: R401,
      },
    },
  },
  "/api/auth/forgot-password": {
    post: {
      tags: ["Auth"],
      summary: "Request a password reset email (always same message).",
      security: [],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email"],
              properties: { email: { type: "string" } },
            },
          },
        },
      },
      responses: { 200: { description: "If the account exists, an email was sent." } },
    },
  },
  "/api/auth/reset-password": {
    post: {
      tags: ["Auth"],
      summary: "Reset password with a token from email.",
      security: [],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["token", "newPassword"],
              properties: {
                token: { type: "string" },
                newPassword: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Password has been reset." },
        400: jsonRef("Error", "Invalid or expired token."),
      },
    },
  },
  "/api/users": {
    get: {
      tags: ["Users"],
      summary: "List users. Permission: user.view.",
      security: SEC,
      responses: { 200: { description: "User list." }, 401: R401, 503: R503 },
    },
    post: {
      tags: ["Users"],
      summary: "Create a user. Permission: user.create.",
      security: SEC,
      requestBody: bodyRef("UserCreate"),
      responses: {
        201: { description: "User created." },
        400: jsonRef("Error", "Validation error."),
        401: R401,
        503: R503,
      },
    },
  },
  "/api/users/{id}": {
    put: {
      tags: ["Users"],
      summary: "Update a user. Permission: user.update.",
      security: SEC,
      parameters: [idParam("id")],
      requestBody: bodyRef("UserCreate", false),
      responses: { 200: { description: "User updated." }, 401: R401, 404: jsonRef("Error", "Not found.") },
    },
    patch: {
      tags: ["Users"],
      summary: "Partially update a user. Permission: user.update.",
      security: SEC,
      parameters: [idParam("id")],
      requestBody: bodyRef("UserCreate", false),
      responses: { 200: { description: "User updated." }, 401: R401, 404: jsonRef("Error", "Not found.") },
    },
    delete: {
      tags: ["Users"],
      summary: "Delete a user. Permission: user.delete.",
      security: SEC,
      parameters: [idParam("id")],
      responses: { 200: { description: "User deleted." }, 401: R401, 404: jsonRef("Error", "Not found.") },
    },
  },
  "/api/students": {
    get: {
      tags: ["Students"],
      summary: "List students. Permission: student.view.",
      security: SEC,
      responses: { 200: { description: "Student list." }, 401: R401, 503: R503 },
    },
    post: {
      tags: ["Students"],
      summary: "Create a student. Permission: student.create.",
      security: SEC,
      requestBody: bodyRef("StudentCreate"),
      responses: { 201: { description: "Student created." }, 400: jsonRef("Error", "Validation error."), 401: R401 },
    },
  },
  "/api/students/{id}": {
    get: {
      tags: ["Students"],
      summary: "Get one student. Permission: student.view.",
      security: SEC,
      parameters: [idParam("id", "Student profile id.")],
      responses: { 200: { description: "Student object." }, 401: R401, 404: jsonRef("Error", "Not found.") },
    },
    put: {
      tags: ["Students"],
      summary: "Update a student. Permission: student.update.",
      security: SEC,
      parameters: [idParam("id", "Student profile id.")],
      requestBody: bodyRef("StudentCreate", false),
      responses: { 200: { description: "Student updated." }, 401: R401, 404: jsonRef("Error", "Not found.") },
    },
    delete: {
      tags: ["Students"],
      summary: "Delete a student account. Permission: student.delete.",
      security: SEC,
      parameters: [idParam("id", "Student profile id.")],
      responses: { 200: { description: "Student deleted." }, 401: R401, 404: jsonRef("Error", "Not found.") },
    },
  },
  "/api/students/me": {
    get: {
      tags: ["Students"],
      summary: "Current logged-in student profile.",
      security: SEC,
      responses: { 200: { description: "Own student profile." }, 401: R401 },
    },
  },
  "/api/students/sections/available": {
    get: {
      tags: ["Students"],
      summary: "Sections available for enrollment. Permission: enrollment.view.",
      security: SEC,
      responses: { 200: { description: "Available sections." }, 401: R401 },
    },
  },
  "/api/students/{id}/enrollments": {
    get: {
      tags: ["Students"],
      summary: "Enrollments of one student. Permission: enrollment.view.",
      security: SEC,
      parameters: [idParam("id", "Student profile id.")],
      responses: { 200: { description: "Enrollment list." }, 401: R401 },
    },
    post: {
      tags: ["Students"],
      summary: "Enroll a student into a section. Permission: enrollment.create.",
      security: SEC,
      parameters: [idParam("id", "Student profile id.")],
      requestBody: bodyRef("EnrollRequest"),
      responses: { 201: { description: "Enrolled." }, 400: jsonRef("Error", "Validation error."), 401: R401 },
    },
  },
  "/api/students/enrollments/{enrollmentId}": {
    delete: {
      tags: ["Students"],
      summary: "Remove an enrollment. Permission: enrollment.delete.",
      security: SEC,
      parameters: [idParam("enrollmentId", "Enrollment id.")],
      responses: { 200: { description: "Enrollment removed." }, 401: R401, 404: jsonRef("Error", "Not found.") },
    },
  },
};
