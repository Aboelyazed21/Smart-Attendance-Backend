// ============================================================
// ADMIN NOTIFICATIONS
// Manual trigger for the weekly WhatsApp summaries.
// Admin-only. Supports dryRun to preview counts without
// sending any message.
// POST /api/admin/attendance-summaries/run { dryRun: true }
// ============================================================

const {
  runWeeklySummaries,
} = require("../jobs/weeklyAttendance.job");

async function runWeeklySummary(req, res) {
  try {
    const dryRun =
      req.body?.dryRun !== false;

    const stats = await runWeeklySummaries({
      dryRun,
    });

    return res.json({
      message: dryRun
        ? "Weekly summary dry run completed (no messages sent)"
        : "Weekly summary run completed",
      stats,
    });
  } catch (error) {
    console.error(
      "Manual weekly summary error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to run weekly summaries",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
}

module.exports = {
  runWeeklySummary,
};
