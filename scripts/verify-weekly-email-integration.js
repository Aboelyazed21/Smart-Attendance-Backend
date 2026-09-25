// Integration-style test with stubbed pool + stubbed Resend.
// No database, no API key. Verifies report math, failure
// isolation, duplicate protection, retry guards.
// Usage: node scripts/verify-weekly-email-integration.js
const assert = require("assert");

const db = require("../src/config/db");
const resendUtil = require("../src/utils/resend");
const job = require("../src/jobs/weeklyEmail.job");

const sendAttempts = [];
resendUtil.sendResendEmail = async ({ to, subject, html }) => {
  sendAttempts.push(to);
  assert.ok(subject && html.includes("Weekly Attendance Report"));

  if (to === "fail@student.com") {
    return { success: false, error: "Resend rejected (testing mode)" };
  }

  return { success: true, messageId: "msg_test_123" };
};

let logSeq = 0;
const logs = new Map();
const logKey = (sid, s, e) => `${sid}|${s}|${e}`;

const students = [
  { student_id: 1, email: "a@student.com", student_name: "Student A" },
  { student_id: 2, email: "fail@student.com", student_name: "Student B" },
  { student_id: 3, email: null, student_name: "Student C" },
  { student_id: 4, email: "not-an-email", student_name: "Student D" },
  { student_id: 5, email: "e@student.com", student_name: "Student E" },
];
const sessions = [
  { id: 11, section_id: 101, session_date: "2026-09-15", scheduled_start: "10:00:00", course_code: "CS201", course_name: "Data Structures", section_name: "A" },
  { id: 12, section_id: 101, session_date: "2026-09-16", scheduled_start: "10:00:00", course_code: "CS201", course_name: "Data Structures", section_name: "A" },
  { id: 13, section_id: 102, session_date: "2026-09-17", scheduled_start: "12:00:00", course_code: "CS202", course_name: "Operating Systems", section_name: "B" },
];
const enrollments = [
  { student_id: 1, section_id: 101 },
  { student_id: 2, section_id: 101 },
  { student_id: 3, section_id: 101 },
  { student_id: 4, section_id: 102 },
  { student_id: 5, section_id: 99 },
];
const events = [
  { student_id: 1, session_id: 11, status: "present" },
  { student_id: 1, session_id: 12, status: "late" },
  { student_id: 2, session_id: 11, status: "present" },
  { student_id: 4, session_id: 13, status: "present" },
];

db.pool.query = async (sql, params = []) => {
  const q = String(sql).replace(/\s+/g, " ");

  if (q.includes("FROM weekly_email_settings")) return [[]];
  if (q.includes("FROM platform_settings")) return [[]];
  if (q.includes("FROM student_profiles sp")) {
    return [params.length ? students.filter((s) => params.includes(s.student_id)) : students];
  }
  if (q.includes("FROM attendance_sessions ses")) return [sessions];
  if (q.includes("FROM enrollments")) return [enrollments];
  if (q.includes("FROM attendance_events ae")) return [events];
  if (q.includes("FROM weekly_email_logs") && q.includes("SELECT")) {
    if (params.length === 1) {
      const row = [...logs.values()].find((r) => r.id === params[0]);
      return [row ? [row] : []];
    }
    const row = logs.get(logKey(params[0], params[1], params[2]));
    return [row ? [row] : []];
  }
  if (q.includes("INSERT INTO weekly_email_logs")) {
    const [sid, s, e, email, total, present, absent, rate] = params;
    const k = logKey(sid, s, e);
    let row = logs.get(k);
    if (!row) {
      row = { id: ++logSeq, student_id: sid, period_start: s, period_end: e };
      logs.set(k, row);
    }
    Object.assign(row, { email, status: "pending", total_sessions: total, present_count: present, absent_count: absent, attendance_rate: rate });
    return [{ insertId: row.id }];
  }
  if (q.includes("UPDATE weekly_email_logs")) {
    const row = [...logs.values()].find((r) => r.id === params[params.length - 1]);
    if (row) {
      if (q.includes("status = 'sent'")) Object.assign(row, { status: "sent", provider_message_id: params[0] });
      else Object.assign(row, { status: "failed", error: params[0] });
    }
    return [{ affectedRows: 1 }];
  }

  throw new Error(`UNSTUBBED QUERY: ${q.slice(0, 100)}`);
};

async function main() {
  const period = { periodStart: "2026-09-14", periodEnd: "2026-09-20" };

  const a = await job.buildStudentReport(1, period.periodStart, period.periodEnd);
  assert.strictEqual(a.totalSessions, 2);
  assert.strictEqual(a.presentCount, 1);
  assert.strictEqual(a.lateCount, 1);
  assert.strictEqual(a.absentCount, 0);
  assert.strictEqual(a.attendanceRate, 100);
  console.log("ok - report math (present + late counted as attended)");

  const c = await job.buildStudentReport(3, period.periodStart, period.periodEnd);
  assert.strictEqual(c.absentCount, 2, "missing events must count as absent");
  assert.strictEqual(c.attendanceRate, 0);
  assert.strictEqual(c.absences.length, 2);
  console.log("ok - missing attendance events count as absent");

  const run1 = await job.sendWeeklyEmails({ ...period, logger: { log() {} } });
  assert.deepStrictEqual(
    { total: run1.total, sent: run1.sent, failed: run1.failed, skipped: run1.skipped },
    { total: 5, sent: 2, failed: 3, skipped: 0 }
  );
  assert.strictEqual(sendAttempts.length, 3);
  console.log("ok - batch isolates failures (2 sent, 3 failed, batch completed)");

  const run2 = await job.sendWeeklyEmails({ ...period, logger: { log() {} } });
  assert.strictEqual(run2.sent, 0);
  assert.strictEqual(run2.skipped, 2);
  assert.strictEqual(run2.failed, 3);
  assert.strictEqual(sendAttempts.filter((t) => t === "a@student.com").length, 1);
  console.log("ok - re-run sends zero duplicates, skips sent rows");

  const sentLog = [...logs.values()].find((r) => r.student_id === 1);
  await assert.rejects(job.retryEmailLog(sentLog.id), /already sent/);
  const failedLog = [...logs.values()].find((r) => r.student_id === 2);
  await assert.rejects(job.retryEmailLog(failedLog.id), /testing mode/);
  await assert.rejects(job.retryEmailLog(999999), /not found/);
  console.log("ok - retry guards (409 on sent, re-send on failed, 404 on missing)");

  console.log("\nAll integration checks passed");
}

main().catch((error) => {
  console.error("INTEGRATION CHECK FAILED:", error);
  process.exit(1);
});
