// DB-free checks for the weekly email report system.
// Usage: node scripts/verify-weekly-email.js
const assert = require("assert");
const {
  buildWeeklyEmail,
  isValidDateString,
  isValidTimeString,
  isValidTimezone,
} = require("../src/utils/weeklyEmail");
const {
  getPreviousWeek,
  validateSettingsPatch,
} = require("../src/jobs/weeklyEmail.job");

let passed = 0;

function check(name, fn) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

check("previous week is Monday-to-Sunday before reference week", () => {
  const refs = [
    "2026-09-25T12:00:00Z",
    "2026-09-21T00:30:00+02:00",
    "2026-01-01T23:59:59Z",
    "2026-06-15T08:00:00Z",
  ];

  for (const ref of refs) {
    const { periodStart, periodEnd } = getPreviousWeek({
      timezone: "Africa/Cairo",
      referenceDate: ref,
    });

    assert.match(periodStart, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(periodEnd, /^\d{4}-\d{2}-\d{2}$/);

    const start = new Date(`${periodStart}T12:00:00Z`);
    const end = new Date(`${periodEnd}T12:00:00Z`);

    assert.strictEqual(start.getUTCDay(), 1);
    assert.strictEqual(end.getUTCDay(), 0);
    assert.strictEqual((end - start) / 86400000, 6);
    assert.ok(end < new Date(ref));
    assert.ok((new Date(ref) - end) / 86400000 < 8);
  }
});

check("template renders full report with escaping", () => {
  const report = {
    studentName: "Jane <Doe>",
    periodStart: "2026-09-14",
    periodEnd: "2026-09-20",
    totalSessions: 5,
    presentCount: 3,
    lateCount: 1,
    excusedCount: 0,
    absentCount: 1,
    attendanceRate: 80.0,
    bySubject: [
      {
        courseCode: "CS201",
        courseName: "Data Structures",
        sectionName: "A",
        sessions: 3,
        present: 3,
        absent: 0,
        rate: 100,
      },
    ],
    absences: [
      {
        date: "2026-09-16",
        courseCode: "CS202",
        courseName: "Operating Systems",
        sectionName: "B",
        scheduledStart: "10:00:00",
      },
    ],
    attended: [
      {
        date: "2026-09-15",
        courseCode: "CS201",
        courseName: "Data Structures",
        sectionName: "A",
        status: "present",
      },
    ],
  };

  const { subject, html } = buildWeeklyEmail({
    appName: "Smart Attendance",
    report,
  });

  assert.ok(subject.includes("2026-09-14"));
  assert.ok(!html.includes("<Doe>"));

  for (const needle of [
    "Jane &lt;Doe&gt;",
    "80.0%",
    "CS201",
    "Absence Details",
    "Sessions Attended",
  ]) {
    assert.ok(html.includes(needle), `missing: ${needle}`);
  }
});

check("template handles empty states", () => {
  const { html } = buildWeeklyEmail({
    appName: "Smart Attendance",
    report: {
      studentName: "Empty",
      periodStart: "2026-09-14",
      periodEnd: "2026-09-20",
      totalSessions: 0,
      presentCount: 0,
      lateCount: 0,
      excusedCount: 0,
      absentCount: 0,
      attendanceRate: null,
      bySubject: [],
      absences: [],
      attended: [],
    },
  });

  assert.ok(html.includes("No sessions were scheduled"));
  assert.ok(html.includes("No absences recorded"));
});

check("validators accept good input", () => {
  assert.deepStrictEqual(
    validateSettingsPatch({
      enabled: false,
      day: 5,
      time: "18:00",
      timezone: "Africa/Cairo",
    }),
    {
      enabled: "false",
      day: "5",
      time: "18:00",
      timezone: "Africa/Cairo",
    }
  );
  assert.ok(isValidDateString("2026-09-14"));
  assert.ok(isValidTimeString("18:00"));
  assert.ok(isValidTimezone("Africa/Cairo"));
});

check("validators reject bad input", () => {
  for (const bad of [
    { day: 7 },
    { time: "25:00" },
    { timezone: "Mars/Olympus" },
    { enabled: "yes" },
    {},
  ]) {
    assert.throws(() => validateSettingsPatch(bad));
  }

  assert.ok(!isValidDateString("14-09-2026"));
  assert.ok(!isValidTimeString("6pm"));
  assert.ok(!isValidTimezone("Not/AZone"));
});

check("routes and modules load", () => {
  require("../src/app");
  require("../src/utils/resend");
  require("../src/jobs/weeklyEmail.job");
  require("../src/controllers/adminEmailReports.controller");
  require("../src/routes/admin.routes");
});

console.log(`\nAll ${passed} weekly-email checks passed`);
