// ============================================================
// WEEKLY WHATSAPP ATTENDANCE SUMMARIES
// Runs on the backend only — never depends on a browser.
// Sends once per student per week (UNIQUE guard in
// attendance_summary_notifications). Skips gracefully when
// WhatsApp is not configured.
// ============================================================

const { pool } = require("../config/db");
const {
  getWeekRange,
  getStudentSummary,
  buildWhatsAppMessage,
  normalizeToE164,
} = require("../utils/attendanceSummary");
const {
  isWhatsAppConfigured,
  sendWhatsAppMessage,
} = require("../utils/whatsapp");

const CHECK_INTERVAL_MS = 15 * 60 * 1000;
const SEND_WEEKDAY = 5; // Friday (0 = Sunday)
const SEND_HOUR = 7; // 07:00 in WHATSAPP_TIMEZONE

function cairoNow() {
  const parts =
    new Intl.DateTimeFormat("en-US", {
      timeZone:
        process.env.WHATSAPP_TIMEZONE ||
        "Africa/Cairo",
      weekday: "short",
      hour: "numeric",
      hour12: false,
    }).formatToParts(new Date());

  const get = (type) =>
    parts.find((part) => part.type === type)
      ?.value;

  const weekday = String(get("weekday") || "");
  const hour = Number(get("hour") || 0);

  const weekdayIndex = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }[weekday.slice(0, 3)];

  return { weekdayIndex, hour };
}

function frontendUrl() {
  return String(
    process.env.FRONTEND_URL || ""
  ).trim();
}

async function alreadySent(
  studentId,
  weekStart
) {
  const [rows] = await pool.query(
    `
    SELECT id
    FROM attendance_summary_notifications
    WHERE student_id = ?
      AND week_start = ?
      AND status = 'sent'
    LIMIT 1
    `,
    [studentId, weekStart]
  );

  return rows.length > 0;
}

async function logDelivery({
  studentId,
  weekStart,
  status,
  providerMessageId,
  error,
}) {
  try {
    await pool.query(
      `
      INSERT INTO attendance_summary_notifications
      (
        student_id,
        week_start,
        channel,
        status,
        provider_message_id,
        error,
        sent_at
      )
      VALUES (?, ?, 'whatsapp', ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        provider_message_id = VALUES(provider_message_id),
        error = VALUES(error),
        sent_at = VALUES(sent_at)
      `,
      [
        studentId,
        weekStart,
        status,
        providerMessageId || null,
        error
          ? String(error).slice(0, 1000)
          : null,
        status === "sent"
          ? new Date()
          : null,
      ]
    );
  } catch (logError) {
    console.error(
      "Summary delivery log error:",
      logError.message
    );
  }
}

async function findEligibleStudents() {
  const [rows] = await pool.query(
    `
    SELECT
      sp.id AS student_id,
      u.first_name,
      u.phone
    FROM student_profiles sp

    INNER JOIN users u
      ON u.id = sp.user_id

    INNER JOIN roles r
      ON r.id = u.role_id

    WHERE r.name = 'student'
      AND u.status = 'active'
      AND u.phone IS NOT NULL
      AND TRIM(u.phone) <> ''
    `
  );

  return rows;
}

async function runWeeklySummaries({
  dryRun = false,
  referenceDate = new Date(),
  logger = console,
} = {}) {
  const week = getWeekRange(referenceDate);

  if (
    !dryRun &&
    !isWhatsAppConfigured()
  ) {
    logger.log(
      "Weekly summaries skipped: WhatsApp is not configured " +
        "(set WHATSAPP_ENABLED=true plus Twilio credentials)."
    );

    return {
      skipped: true,
      reason: "whatsapp-not-configured",
      week,
    };
  }

  const students =
    await findEligibleStudents();

  const stats = {
    week,
    dryRun,
    eligible: students.length,
    sent: 0,
    skipped: 0,
    failed: 0,
  };

  for (const student of students) {
    if (
      await alreadySent(
        student.student_id,
        week.start
      )
    ) {
      stats.skipped += 1;
      continue;
    }

    let summary;

    try {
      summary = await getStudentSummary(
        pool,
        student.student_id,
        referenceDate
      );
    } catch (error) {
      stats.failed += 1;

      await logDelivery({
        studentId: student.student_id,
        weekStart: week.start,
        status: "failed",
        error: error.message,
      });

      continue;
    }

    if (
      summary.weekly.total === 0 &&
      summary.overall.total === 0
    ) {
      stats.skipped += 1;

      await logDelivery({
        studentId: student.student_id,
        weekStart: week.start,
        status: "skipped",
        error: "No attendance data",
      });

      continue;
    }

    const to = normalizeToE164(
      student.phone
    );

    if (!to) {
      stats.failed += 1;

      await logDelivery({
        studentId: student.student_id,
        weekStart: week.start,
        status: "failed",
        error: "Phone number is not deliverable",
      });

      continue;
    }

    const message = buildWhatsAppMessage({
      summary,
      studentName: String(
        student.first_name || "Student"
      ).trim(),
      frontendUrl: frontendUrl(),
    });

    if (dryRun) {
      stats.sent += 1;
      continue;
    }

    try {
      const { sid } =
        await sendWhatsAppMessage(to, message);

      stats.sent += 1;

      await logDelivery({
        studentId: student.student_id,
        weekStart: week.start,
        status: "sent",
        providerMessageId: sid,
      });
    } catch (error) {
      stats.failed += 1;

      await logDelivery({
        studentId: student.student_id,
        weekStart: week.start,
        status: "failed",
        error: error.message,
      });
    }
  }

  logger.log(
    `Weekly summaries: ${stats.sent} sent, ` +
      `${stats.skipped} skipped, ${stats.failed} failed ` +
      `(${students.length} eligible, week ${week.start}).`
  );

  return stats;
}

function shouldRunNow() {
  const { weekdayIndex, hour } =
    cairoNow();

  return (
    weekdayIndex === SEND_WEEKDAY &&
    hour === SEND_HOUR
  );
}

function startWeeklyAttendanceJob() {
  async function tick() {
    try {
      if (!shouldRunNow()) {
        return;
      }

      await runWeeklySummaries();
    } catch (error) {
      // The scheduler must never crash the server.
      console.error(
        "Weekly summary job error:",
        error.message
      );
    }
  }

  const timer = setInterval(
    tick,
    CHECK_INTERVAL_MS
  );

  // Do not keep the process alive for the scheduler alone.
  if (typeof timer.unref === "function") {
    timer.unref();
  }

  // First check shortly after boot (covers restarts
  // inside the Friday window; per-student log prevents
  // duplicate sends).
  setTimeout(tick, 60 * 1000);

  console.log(
    "Weekly WhatsApp summary job scheduled " +
      "(Fridays 07:00 Africa/Cairo)."
  );

  return timer;
}

module.exports = {
  runWeeklySummaries,
  startWeeklyAttendanceJob,
};
