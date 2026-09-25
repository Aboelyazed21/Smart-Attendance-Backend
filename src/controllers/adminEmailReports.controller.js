// ============================================================
// ADMIN EMAIL REPORTS
// Admin controls for the weekly attendance email reports.
// All routes are admin-only via requirePermission.
// POST /api/admin/weekly-reports/send { periodStart,
//   periodEnd, studentId, force, dryRun }
// ============================================================

const {
  getEmailSettings,
  updateEmailSettings,
  buildStudentReport,
  sendWeeklyEmails,
  retryEmailLog,
  sendTestEmail,
  getEmailLogs,
  getEmailStatus,
  getPreviousWeek,
} = require("../jobs/weeklyEmail.job");
const {
  isResendConfigured,
} = require("../utils/resend");
const {
  getPlatformName,
} = require("../utils/platformSettings");
const {
  buildWeeklyEmail,
  isValidDateString,
} = require("../utils/weeklyEmail");

async function getSettings(req, res) {
  try {
    return res.json(await getEmailSettings());
  } catch (error) {
    console.error("Email settings error:", error);

    return res.status(500).json({
      message: "Failed to load email report settings",
    });
  }
}

async function updateSettings(req, res) {
  try {
    const settings = await updateEmailSettings(
      req.body || {},
      req.user?.id || req.user?.userId || null
    );

    return res.json(settings);
  } catch (error) {
    console.error("Email settings update error:", error);

    return res.status(error.status || 500).json({
      message:
        error.message || "Failed to update email report settings",
    });
  }
}

async function send(req, res) {
  try {
    const {
      periodStart,
      periodEnd,
      studentId,
      force,
      dryRun,
    } = req.body || {};

    if (
      studentId !== undefined &&
      (!Number.isInteger(Number(studentId)) ||
        Number(studentId) <= 0)
    ) {
      return res.status(400).json({
        message: "studentId must be a positive integer",
      });
    }

    const summary = await sendWeeklyEmails({
      periodStart,
      periodEnd,
      studentId:
        studentId !== undefined ? Number(studentId) : undefined,
      force: force === true,
      dryRun: dryRun === true,
    });

    return res.json({
      message: dryRun
        ? "Weekly email dry run completed (nothing sent)"
        : "Weekly email run completed",
      summary,
    });
  } catch (error) {
    console.error("Manual weekly email error:", error);

    return res.status(error.status || 500).json({
      message:
        error.message || "Failed to send weekly emails",
    });
  }
}

async function test(req, res) {
  try {
    const { to } = req.body || {};
    const result = await sendTestEmail(to);

    return res.json({
      message: "Test email sent",
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("Weekly email test error:", error);

    return res.status(error.status || 500).json({
      message: error.message || "Failed to send test email",
      emailConfigured: isResendConfigured(),
    });
  }
}

async function preview(req, res) {
  try {
    const { studentId, periodStart, periodEnd } =
      req.body || {};

    if (!studentId) {
      return res.status(400).json({
        message: "studentId is required",
      });
    }

    const settings = await getEmailSettings();
    const period =
      periodStart && periodEnd
        ? { periodStart, periodEnd }
        : getPreviousWeek({ timezone: settings.timezone });

    if (
      !isValidDateString(period.periodStart) ||
      !isValidDateString(period.periodEnd)
    ) {
      return res.status(400).json({
        message: "periodStart/periodEnd must be YYYY-MM-DD",
      });
    }

    const report = await buildStudentReport(
      Number(studentId),
      period.periodStart,
      period.periodEnd
    );

    const { subject, html } = buildWeeklyEmail({
      appName: await getPlatformName(),
      report,
    });

    return res.json({ subject, html, data: report });
  } catch (error) {
    console.error("Weekly email preview error:", error);

    return res.status(error.status || 500).json({
      message:
        error.message || "Failed to preview weekly report",
    });
  }
}

async function logs(req, res) {
  try {
    return res.json(
      await getEmailLogs({
        status: req.query.status,
        periodStart: req.query.periodStart,
        periodEnd: req.query.periodEnd,
        page: req.query.page,
        limit: req.query.limit,
      })
    );
  } catch (error) {
    console.error("Weekly email logs error:", error);

    return res.status(error.status || 500).json({
      message: error.message || "Failed to load email logs",
    });
  }
}

async function retry(req, res) {
  try {
    const result = await retryEmailLog(req.params.id);

    return res.json({
      message: "Report email retried",
      ...result,
    });
  } catch (error) {
    console.error("Weekly email retry error:", error);

    return res.status(error.status || 500).json({
      message: error.message || "Failed to retry email",
    });
  }
}

async function status(req, res) {
  try {
    return res.json(await getEmailStatus());
  } catch (error) {
    console.error("Weekly email status error:", error);

    return res.status(500).json({
      message: "Failed to load email report status",
    });
  }
}

module.exports = {
  getSettings,
  updateSettings,
  send,
  test,
  preview,
  logs,
  retry,
  status,
};
