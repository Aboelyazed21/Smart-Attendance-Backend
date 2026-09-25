// Weekly email reports + platform settings + public paths.
const { SEC, R401, R403, R503, bodyRef, jsonRef, idParam } = require("../helpers");

const statusResponse = (summary) => ({
  tags: ["Weekly Email Reports"],
  summary,
  security: SEC,
  responses: { 200: { description: "OK." }, 401: R401, 403: R403 },
});

module.exports = {
  "/api/admin/weekly-reports/settings": {
    get: {
      ...statusResponse("Get email schedule. Permission: weekly_reports.view."),
    },
    patch: {
      tags: ["Weekly Email Reports"],
      summary: "Update email schedule. Permission: weekly_reports.manage.",
      security: SEC,
      requestBody: bodyRef("WeeklyEmailSettingsPatch"),
      responses: {
        200: { description: "Updated settings." },
        400: jsonRef("Error", "Validation error."),
        401: R401,
        403: R403,
      },
    },
  },
  "/api/admin/weekly-reports/send": {
    post: {
      tags: ["Weekly Email Reports"],
      summary: "Send weekly emails (batch, duplicate-safe). Permission: weekly_reports.send.",
      security: SEC,
      requestBody: bodyRef("WeeklyEmailSend", false),
      responses: {
        200: {
          description: "Send summary { sent, failed, skipped, failures }.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: { type: "string" },
                  summary: {
                    type: "object",
                    properties: {
                      periodStart: { type: "string" },
                      periodEnd: { type: "string" },
                      total: { type: "integer" },
                      sent: { type: "integer" },
                      failed: { type: "integer" },
                      skipped: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
        },
        400: jsonRef("Error", "Validation error."),
        401: R401,
        403: R403,
      },
    },
  },
  "/api/admin/weekly-reports/test": {
    post: {
      tags: ["Weekly Email Reports"],
      summary: "Send a sample report email. Permission: weekly_reports.test.",
      security: SEC,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["to"],
              properties: { to: { type: "string", format: "email" } },
            },
          },
        },
      },
      responses: {
        200: { description: "Test email sent (+ messageId)." },
        400: jsonRef("Error", "Invalid address."),
        401: R401,
        502: jsonRef("Error", "Resend error / key missing."),
      },
    },
  },
  "/api/admin/weekly-reports/preview": {
    post: {
      tags: ["Weekly Email Reports"],
      summary: "Preview a student report (subject + HTML + data, no send). Permission: weekly_reports.view.",
      security: SEC,
      requestBody: bodyRef("WeeklyEmailPreview"),
      responses: {
        200: { description: "{ subject, html, data }." },
        400: jsonRef("Error", "Validation error."),
        401: R401,
        404: jsonRef("Error", "Student not found."),
      },
    },
  },
  "/api/admin/weekly-reports/logs": {
    get: {
      ...statusResponse("List send logs (filters: status, periodStart, periodEnd, page, limit). Permission: weekly_reports.view."),
      parameters: [
        {
          name: "status",
          in: "query",
          schema: { type: "string", enum: ["pending", "sent", "failed", "skipped"] },
        },
        { name: "periodStart", in: "query", schema: { type: "string", format: "date" } },
        { name: "periodEnd", in: "query", schema: { type: "string", format: "date" } },
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
      ],
    },
  },
  "/api/admin/weekly-reports/retry/{id}": {
    post: {
      tags: ["Weekly Email Reports"],
      summary: "Retry one failed log. Permission: weekly_reports.retry.",
      security: SEC,
      parameters: [idParam("id", "Log id.")],
      responses: {
        200: { description: "Retried (+ messageId)." },
        401: R401,
        404: jsonRef("Error", "Log not found."),
        409: jsonRef("Error", "Already sent."),
        422: jsonRef("Error", "No valid student email."),
        502: jsonRef("Error", "Resend error."),
      },
    },
  },
  "/api/admin/weekly-reports/status": {
    get: {
      ...statusResponse("Scheduler settings + last execution + emailConfigured. Permission: weekly_reports.view."),
    },
  },
  "/api/admin/settings": {
    get: {
      tags: ["Platform Settings"],
      summary: "Get platform settings. Permission: settings.view.",
      security: SEC,
      responses: {
        200: {
          description: "Same safe shape as public settings.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PublicSettings" },
            },
          },
        },
        401: R401,
        403: R403,
      },
    },
    patch: {
      tags: ["Platform Settings"],
      summary: "Update platformName / maintenance fields. Permission: settings.manage.",
      security: SEC,
      requestBody: bodyRef("PlatformSettingsPatch"),
      responses: {
        200: {
          description: "Updated safe settings.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PublicSettings" },
            },
          },
        },
        400: jsonRef("Error", "Validation error."),
        401: R401,
        403: R403,
      },
    },
  },
  "/api/settings/public": {
    get: {
      tags: ["Public"],
      summary: "Safe public settings (platformName, maintenanceMode, message, until). No auth, no secrets.",
      security: [],
      responses: {
        200: {
          description: "Public settings.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PublicSettings" },
            },
          },
        },
        503: {
          description: "Docs-only note: this endpoint is never blocked by maintenance.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PublicSettings" },
            },
          },
        },
      },
    },
  },
  "/health": {
    get: {
      tags: ["Public"],
      summary: "Service health check (no auth).",
      security: [],
      responses: {
        200: {
          description: "{ status: OK }.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string", example: "OK" },
                  service: { type: "string", example: "smart-attendance-backend" },
                },
              },
            },
          },
        },
      },
    },
  },
};
