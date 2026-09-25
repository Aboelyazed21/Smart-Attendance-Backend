// ============================================================
// WEEKLY EMAIL ATTENDANCE REPORTS (Resend)
// Runs on the backend only — never depends on a browser.
// One report per student per period (UNIQUE guard in
// weekly_email_logs). A single student's failure never
// stops the batch. Schedule is admin-configurable at
// runtime via weekly_email_settings (env = defaults).
//
// Numbers come from real attendance_events rows. A missing
// event row for an enrolled student + session counts as
// absent (same convention as the session roster).
// ============================================================

const { pool } = require("../config/db");
// Namespace import (not destructured) so the sender stays
// replaceable in tests and single-sourced in production.
const resend = require("../utils/resend");
const {
  getPlatformName,
} = require("../utils/platformSettings");
const {
  buildWeeklyEmail,
  sampleReport,
  isValidDateString,
  isValidTimeString,
  isValidTimezone,
} = require("../utils/weeklyEmail");

const CHECK_INTERVAL_MS = 15 * 60 * 1000;

function settingDefaults() {
  return {
    enabled: process.env.WEEKLY_REPORT_ENABLED || "true",
    day: process.env.WEEKLY_REPORT_DAY || "5",
    time: process.env.WEEKLY_REPORT_TIME || "18:00",
    timezone:
      process.env.WEEKLY_REPORT_TIMEZONE || "Africa/Cairo",
  };
}

async function getEmailSettings() {
  const raw = settingDefaults();

  try {
    const [rows] = await pool.query(
      "SELECT `key`, `value` FROM weekly_email_settings"
    );

    for (const row of rows) {
      raw[row.key] = row.value;
    }
  } catch (error) {
    // Table missing (migration not applied yet):
    // fall back to env/defaults.
    if (error.code !== "ER_NO_SUCH_TABLE") {
      throw error;
    }
  }

  return {
    enabled:
      String(raw.enabled).toLowerCase() === "true",
    day: Number(raw.day),
    time: raw.time,
    timezone: raw.timezone,
  };
}

function validateSettingsPatch(patch) {
  const out = {};

  if (patch.enabled !== undefined) {
    if (typeof patch.enabled !== "boolean") {
      throw Object.assign(
        new Error("enabled must be a boolean"),
        { status: 400 }
      );
    }

    out.enabled = patch.enabled ? "true" : "false";
  }

  if (patch.day !== undefined) {
    const day = Number(patch.day);

    if (
      !Number.isInteger(day) ||
      day < 0 ||
      day > 6
    ) {
      throw Object.assign(
        new Error("day must be an integer 0-6 (5 = Friday)"),
        { status: 400 }
      );
    }

    out.day = String(day);
  }

  if (patch.time !== undefined) {
    if (!isValidTimeString(patch.time)) {
      throw Object.assign(
        new Error("time must be HH:MM (24h)"),
        { status: 400 }
      );
    }

    out.time = patch.time;
  }

  if (patch.timezone !== undefined) {
    if (
      typeof patch.timezone !== "string" ||
      !isValidTimezone(patch.timezone)
    ) {
      throw Object.assign(
        new Error("Invalid timezone"),
        { status: 400 }
      );
    }

    out.timezone = patch.timezone;
  }

  if (!Object.keys(out).length) {
    throw Object.assign(
      new Error("No valid settings provided"),
      { status: 400 }
    );
  }

  return out;
}

async function updateEmailSettings(patch, adminId) {
  const values = validateSettingsPatch(patch);

  for (const [key, value] of Object.entries(values)) {
    await pool.query(
      `
      INSERT INTO weekly_email_settings
        (\`key\`, \`value\`, updated_by)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`value\` = VALUES(\`value\`),
        updated_by = VALUES(updated_by)
      `,
      [key, value, adminId || null]
    );
  }

  return getEmailSettings();
}

// Monday..Sunday week (ISO dates) immediately before the
// week containing referenceDate, evaluated in timezone.
function getPreviousWeek({ timezone, referenceDate } = {}) {
  const tz = timezone || settingDefaults().timezone;
  const ref = referenceDate
    ? new Date(referenceDate)
    : new Date();

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(ref);

  const get = (type) =>
    parts.find((part) => part.type === type).value;

  const todayUTCNoon = new Date(
    Date.UTC(
      Number(get("year")),
      Number(get("month")) - 1,
      Number(get("day")),
      12
    )
  );

  // 1 = Monday .. 7 = Sunday.
  const isoDay =
    todayUTCNoon.getUTCDay() === 0
      ? 7
      : todayUTCNoon.getUTCDay();

  const end = new Date(todayUTCNoon);
  end.setUTCDate(end.getUTCDate() - isoDay);

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 6);

  const fmt = (date) => date.toISOString().slice(0, 10);

  return { periodStart: fmt(start), periodEnd: fmt(end) };
}

async function loadActiveStudents(studentId) {
  const params = [];
  let extra = "";

  if (studentId !== undefined && studentId !== null) {
    extra = "AND sp.id = ?";
    params.push(studentId);
  }

  const [rows] = await pool.query(
    `
    SELECT
      sp.id AS student_id,
      u.email,
      CONCAT(u.first_name, ' ', u.last_name) AS student_name
    FROM student_profiles sp
    JOIN users u ON u.id = sp.user_id
    WHERE u.status = 'active' ${extra}
    ORDER BY sp.id
    `,
    params
  );

  return rows;
}

async function loadSessionsInPeriod(periodStart, periodEnd) {
  const [rows] = await pool.query(
    `
    SELECT
      ses.id,
      ses.section_id,
      ses.session_date,
      ses.scheduled_start,
      c.course_code,
      c.course_name,
      sec.section_name
    FROM attendance_sessions ses
    JOIN sections sec ON sec.id = ses.section_id
    JOIN courses c ON c.id = sec.course_id
    WHERE ses.session_date BETWEEN ? AND ?
      AND ses.status != 'cancelled'
    ORDER BY ses.session_date, ses.id
    `,
    [periodStart, periodEnd]
  );

  return rows;
}

async function loadEnrollments(studentIds) {
  if (!studentIds.length) {
    return [];
  }

  const [rows] = await pool.query(
    `
    SELECT student_id, section_id
    FROM enrollments
    WHERE status = 'active' AND student_id IN (?)
    `,
    [studentIds]
  );

  return rows;
}

async function loadEvents(studentIds, periodStart, periodEnd) {
  if (!studentIds.length) {
    return [];
  }

  const [rows] = await pool.query(
    `
    SELECT ae.student_id, ae.session_id, ae.status
    FROM attendance_events ae
    JOIN attendance_sessions ses ON ses.id = ae.session_id
    WHERE ae.student_id IN (?)
      AND ses.session_date BETWEEN ? AND ?
      AND ae.validation_status = 'accepted'
    `,
    [studentIds, periodStart, periodEnd]
  );

  return rows;
}

function computeStudentReport(
  student,
  sessions,
  enrollments,
  events
) {
  const enrolledSections = new Set(
    enrollments
      .filter((row) => row.student_id === student.student_id)
      .map((row) => row.section_id)
  );

  const relevant = sessions.filter((session) =>
    enrolledSections.has(session.section_id)
  );

  const eventBySession = new Map();

  for (const event of events) {
    if (event.student_id === student.student_id) {
      eventBySession.set(event.session_id, event.status);
    }
  }

  let present = 0;
  let late = 0;
  let excused = 0;

  const bySubject = new Map();
  const absences = [];
  const attended = [];

  for (const session of relevant) {
    const status =
      eventBySession.get(session.id) || "absent";
    const key = `${session.course_code}|${session.section_name}`;

    if (!bySubject.has(key)) {
      bySubject.set(key, {
        courseCode: session.course_code,
        courseName: session.course_name,
        sectionName: session.section_name,
        sessions: 0,
        present: 0,
        absent: 0,
        rate: null,
      });
    }

    const bucket = bySubject.get(key);
    bucket.sessions += 1;

    const info = {
      date: session.session_date,
      courseCode: session.course_code,
      courseName: session.course_name,
      sectionName: session.section_name,
      scheduledStart: session.scheduled_start,
      status,
    };

    if (
      status === "present" ||
      status === "late" ||
      status === "excused"
    ) {
      if (status === "present") present += 1;
      if (status === "late") late += 1;
      if (status === "excused") excused += 1;

      bucket.present += 1;
      attended.push(info);
    } else {
      bucket.absent += 1;
      absences.push(info);
    }
  }

  for (const bucket of bySubject.values()) {
    bucket.rate = bucket.sessions
      ? Number(
          ((bucket.present / bucket.sessions) * 100).toFixed(2)
        )
      : null;
  }

  const total = relevant.length;
  const attendedCount = present + late + excused;

  return {
    studentId: student.student_id,
    studentName: student.student_name,
    email: student.email,
    periodStart: null,
    periodEnd: null,
    totalSessions: total,
    presentCount: present,
    lateCount: late,
    excusedCount: excused,
    absentCount: total - attendedCount,
    attendanceRate: total
      ? Number(((attendedCount / total) * 100).toFixed(2))
      : null,
    bySubject: [...bySubject.values()],
    absences,
    attended,
  };
}

async function buildStudentReports(
  periodStart,
  periodEnd,
  studentId
) {
  const students = await loadActiveStudents(studentId);
  const sessions = await loadSessionsInPeriod(
    periodStart,
    periodEnd
  );
  const ids = students.map((row) => row.student_id);

  const [enrollments, events] = await Promise.all([
    loadEnrollments(ids),
    loadEvents(ids, periodStart, periodEnd),
  ]);

  return students.map((student) => {
    const report = computeStudentReport(
      student,
      sessions,
      enrollments,
      events
    );

    report.periodStart = periodStart;
    report.periodEnd = periodEnd;

    return report;
  });
}

async function buildStudentReport(
  studentId,
  periodStart,
  periodEnd
) {
  const reports = await buildStudentReports(
    periodStart,
    periodEnd,
    studentId
  );

  if (!reports.length) {
    throw Object.assign(
      new Error("Active student not found"),
      { status: 404 }
    );
  }

  return reports[0];
}

function resolvePeriod(periodStart, periodEnd, timezone) {
  if (periodStart || periodEnd) {
    if (
      !isValidDateString(periodStart) ||
      !isValidDateString(periodEnd)
    ) {
      throw Object.assign(
        new Error("periodStart/periodEnd must be YYYY-MM-DD"),
        { status: 400 }
      );
    }

    return { periodStart, periodEnd };
  }

  return getPreviousWeek({ timezone });
}

async function claimLogRow(report, periodStart, periodEnd, force) {
  const [existing] = await pool.query(
    `
    SELECT id, status
    FROM weekly_email_logs
    WHERE student_id = ?
      AND period_start = ?
      AND period_end = ?
    LIMIT 1
    `,
    [report.studentId, periodStart, periodEnd]
  );

  if (
    existing.length &&
    existing[0].status === "sent" &&
    !force
  ) {
    return { logId: existing[0].id, duplicate: true };
  }

  const [result] = await pool.query(
    `
    INSERT INTO weekly_email_logs
    (
      student_id, period_start, period_end, email,
      status, total_sessions, present_count,
      absent_count, attendance_rate,
      error, provider_message_id, sent_at
    )
    VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, NULL, NULL, NULL)
    ON DUPLICATE KEY UPDATE
      email = VALUES(email),
      status = 'pending',
      total_sessions = VALUES(total_sessions),
      present_count = VALUES(present_count),
      absent_count = VALUES(absent_count),
      attendance_rate = VALUES(attendance_rate),
      error = NULL,
      provider_message_id = NULL,
      sent_at = NULL
    `,
    [
      report.studentId,
      periodStart,
      periodEnd,
      report.email,
      report.totalSessions,
      report.presentCount +
        report.lateCount +
        report.excusedCount,
      report.absentCount,
      report.attendanceRate,
    ]
  );

  return {
    logId: result.insertId || (existing.length && existing[0].id),
    duplicate: false,
  };
}

async function markLogSent(logId, messageId) {
  await pool.query(
    `
    UPDATE weekly_email_logs
    SET status = 'sent', sent_at = NOW(),
      provider_message_id = ?
    WHERE id = ?
    `,
    [messageId || null, logId]
  );
}

async function markLogFailed(logId, errorMessage) {
  await pool.query(
    `
    UPDATE weekly_email_logs
    SET status = 'failed', error = ?
    WHERE id = ?
    `,
    [
      String(errorMessage || "Unknown error").slice(0, 1000),
      logId,
    ]
  );
}

async function sendWeeklyEmails({
  periodStart,
  periodEnd,
  studentId,
  force = false,
  dryRun = false,
  logger = console,
} = {}) {
  const settings = await getEmailSettings();
  const period = resolvePeriod(
    periodStart,
    periodEnd,
    settings.timezone
  );

  const reports = await buildStudentReports(
    period.periodStart,
    period.periodEnd,
    studentId
  );

  const summary = {
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    dryRun,
    total: reports.length,
    sent: 0,
    failed: 0,
    skipped: 0,
    failures: [],
  };

  for (const report of reports) {
    try {
      if (dryRun) {
        if (resend.isValidEmail(report.email)) {
          summary.sent += 1;
        } else {
          summary.failed += 1;
        }

        continue;
      }

      const { logId, duplicate } = await claimLogRow(
        report,
        period.periodStart,
        period.periodEnd,
        force
      );

      if (duplicate) {
        summary.skipped += 1;
        continue;
      }

      if (!resend.isValidEmail(report.email)) {
        await markLogFailed(
          logId,
          report.email
            ? "Invalid student email address"
            : "Missing student email address"
        );

        summary.failed += 1;
        summary.failures.push({
          studentId: report.studentId,
          error: "Missing or invalid email",
        });

        continue;
      }

      const { subject, html } = buildWeeklyEmail({
        appName: await getPlatformName(),
        report,
      });

      const result = await resend.sendResendEmail({
        to: report.email,
        subject,
        html,
      });

      if (result.success) {
        await markLogSent(logId, result.messageId);
        summary.sent += 1;
      } else {
        await markLogFailed(logId, result.error);
        summary.failed += 1;
        summary.failures.push({
          studentId: report.studentId,
          error: result.error,
        });
      }
    } catch (error) {
      // One student's failure must never stop the batch.
      summary.failed += 1;
      summary.failures.push({
        studentId: report.studentId,
        error: error.message,
      });

      try {
        const [rows] = await pool.query(
          `
          SELECT id
          FROM weekly_email_logs
          WHERE student_id = ?
            AND period_start = ?
            AND period_end = ?
          LIMIT 1
          `,
          [
            report.studentId,
            period.periodStart,
            period.periodEnd,
          ]
        );

        if (rows.length) {
          await markLogFailed(rows[0].id, error.message);
        }
      } catch {
        // Logging must not break the batch.
      }
    }
  }

  logger.log(
    `Weekly emails: ${summary.sent} sent, ` +
      `${summary.skipped} skipped, ${summary.failed} failed ` +
      `(${summary.total} students, ` +
      `${summary.periodStart}..${summary.periodEnd}).`
  );

  return summary;
}

async function retryEmailLog(logId) {
  const [rows] = await pool.query(
    "SELECT * FROM weekly_email_logs WHERE id = ? LIMIT 1",
    [logId]
  );

  if (!rows.length) {
    throw Object.assign(
      new Error("Report log not found"),
      { status: 404 }
    );
  }

  const log = rows[0];

  if (log.status === "sent") {
    throw Object.assign(
      new Error("Report already sent; use force send to resend"),
      { status: 409 }
    );
  }

  const report = await buildStudentReport(
    log.student_id,
    String(log.period_start).slice(0, 10),
    String(log.period_end).slice(0, 10)
  );

  if (!resend.isValidEmail(report.email)) {
    await markLogFailed(
      logId,
      "Missing or invalid student email address"
    );

    throw Object.assign(
      new Error("Student has no valid email address"),
      { status: 422 }
    );
  }

  const { subject, html } = buildWeeklyEmail({
    appName: await getPlatformName(),
    report,
  });

  const result = await resend.sendResendEmail({
    to: report.email,
    subject,
    html,
  });

  if (!result.success) {
    await markLogFailed(logId, result.error);

    throw Object.assign(new Error(result.error), {
      status: 502,
    });
  }

  await markLogSent(logId, result.messageId);

  return { logId: Number(logId), messageId: result.messageId };
}

async function sendTestEmail(to) {
  if (!resend.isValidEmail(to)) {
    throw Object.assign(
      new Error("A valid 'to' email address is required"),
      { status: 400 }
    );
  }

  const { subject, html } = buildWeeklyEmail({
    appName: await getPlatformName(),
    report: sampleReport(),
  });

  const result = await resend.sendResendEmail({
    to,
    subject: `[TEST] ${subject}`,
    html,
  });

  if (!result.success) {
    throw Object.assign(new Error(result.error), {
      status: 502,
    });
  }

  return { messageId: result.messageId };
}

async function getEmailLogs({
  status,
  periodStart,
  periodEnd,
  page = 1,
  limit = 50,
} = {}) {
  const conditions = [];
  const params = [];

  if (status) {
    if (
      !["pending", "sent", "failed", "skipped"].includes(status)
    ) {
      throw Object.assign(
        new Error("Invalid status filter"),
        { status: 400 }
      );
    }

    conditions.push("l.status = ?");
    params.push(status);
  }

  if (periodStart) {
    if (!isValidDateString(periodStart)) {
      throw Object.assign(
        new Error("periodStart must be YYYY-MM-DD"),
        { status: 400 }
      );
    }

    conditions.push("l.period_start = ?");
    params.push(periodStart);
  }

  if (periodEnd) {
    if (!isValidDateString(periodEnd)) {
      throw Object.assign(
        new Error("periodEnd must be YYYY-MM-DD"),
        { status: 400 }
      );
    }

    conditions.push("l.period_end = ?");
    params.push(periodEnd);
  }

  const where = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50));
  const offset = (safePage - 1) * safeLimit;

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM weekly_email_logs l ${where}`,
    params
  );

  const [rows] = await pool.query(
    `
    SELECT
      l.*,
      CONCAT(u.first_name, ' ', u.last_name) AS student_name
    FROM weekly_email_logs l
    JOIN student_profiles sp ON sp.id = l.student_id
    JOIN users u ON u.id = sp.user_id
    ${where}
    ORDER BY l.id DESC
    LIMIT ${safeLimit} OFFSET ${offset}
    `,
    params
  );

  return { total, page: safePage, limit: safeLimit, logs: rows };
}

async function getEmailStatus() {
  const settings = await getEmailSettings();

  let lastExecution = null;

  try {
    const [rows] = await pool.query(
      `
      SELECT
        period_start,
        period_end,
        MAX(updated_at) AS last_run_at,
        SUM(status = 'sent') AS sent,
        SUM(status = 'failed') AS failed,
        SUM(status = 'skipped') AS skipped,
        SUM(status = 'pending') AS pending,
        COUNT(*) AS total
      FROM weekly_email_logs
      GROUP BY period_start, period_end
      ORDER BY period_start DESC, period_end DESC
      LIMIT 1
      `
    );

    lastExecution = rows[0] || null;
  } catch (error) {
    if (error.code !== "ER_NO_SUCH_TABLE") {
      throw error;
    }
  }

  return {
    settings,
    emailConfigured: resend.isResendConfigured(),
    lastExecution,
  };
}

// ============================================================
// SCHEDULER (same pattern as the WhatsApp job: cheap
// interval tick, settings re-read every tick so admin
// changes apply without a restart).
// ============================================================

let running = false;

function currentParts(timezone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type) =>
    parts.find((part) => part.type === type)?.value;

  const weekdayIndex = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }[String(get("weekday") || "").slice(0, 3)];

  return {
    weekdayIndex,
    slot: `${String(get("hour") || "0").padStart(2, "0")}:${String(get("minute") || "0").padStart(2, "0")}`,
  };
}

async function runScheduledTick() {
  if (running) {
    console.log(
      "[weekly-emails] previous run still in progress, skipping tick"
    );

    return null;
  }

  running = true;

  try {
    const settings = await getEmailSettings();

    if (!settings.enabled) {
      return null;
    }

    const { weekdayIndex, slot } = currentParts(
      settings.timezone
    );

    if (
      weekdayIndex !== settings.day ||
      slot !== settings.time
    ) {
      return null;
    }

    console.log("[weekly-emails] starting scheduled batch");

    return await sendWeeklyEmails({});
  } catch (error) {
    console.error(
      "[weekly-emails] batch failed:",
      error.message
    );

    return null;
  } finally {
    running = false;
  }
}

function startWeeklyEmailJob() {
  async function tick() {
    try {
      await runScheduledTick();
    } catch (error) {
      // The scheduler must never crash the server.
      console.error(
        "Weekly email job error:",
        error.message
      );
    }
  }

  const timer = setInterval(tick, CHECK_INTERVAL_MS);

  // Do not keep the process alive for the scheduler alone.
  if (typeof timer.unref === "function") {
    timer.unref();
  }

  // First check shortly after boot (covers restarts
  // inside the send window; per-student log prevents
  // duplicate sends).
  setTimeout(tick, 60 * 1000);

  getEmailSettings()
    .then((settings) => {
      console.log(
        "Weekly email reports scheduled " +
          `(day ${settings.day} at ${settings.time} ` +
          `${settings.timezone}, enabled=${settings.enabled}).`
      );
    })
    .catch((error) => {
      console.log(
        "Weekly email scheduler starting with defaults: " +
          (error.message || "database is not ready yet.")
      );
    });

  return timer;
}

module.exports = {
  getEmailSettings,
  updateEmailSettings,
  validateSettingsPatch,
  getPreviousWeek,
  buildStudentReport,
  buildStudentReports,
  sendWeeklyEmails,
  retryEmailLog,
  sendTestEmail,
  getEmailLogs,
  getEmailStatus,
  startWeeklyEmailJob,
  runScheduledTick,
};
