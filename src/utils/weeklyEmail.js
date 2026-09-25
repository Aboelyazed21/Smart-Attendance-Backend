// ============================================================
// WEEKLY EMAIL REPORT HELPERS
// Professional responsive HTML template (table layout +
// inline styles for Gmail / Outlook / mobile). No external
// assets, no animations, no emojis. Plus small pure
// validation helpers shared by the job and the controller.
// ============================================================

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}/.test(value)
  ) {
    return value.slice(0, 10);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const pad = (part) => String(part).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function isValidDateString(value) {
  if (typeof value !== "string" || !DATE_RE.test(value)) {
    return false;
  }

  return !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

function isValidTimeString(value) {
  return typeof value === "string" && TIME_RE.test(value);
}

function isValidTimezone(value) {
  try {
    Intl.DateTimeFormat("en-CA", {
      timeZone: value,
    }).format(new Date());

    return true;
  } catch {
    return false;
  }
}

function percentageColor(rate) {
  if (rate == null) {
    return "#555555";
  }

  if (rate >= 75) {
    return "#1e7e34";
  }

  if (rate >= 50) {
    return "#b7791f";
  }

  return "#c0392b";
}

// report: {
//   studentName, periodStart, periodEnd,
//   totalSessions, presentCount, lateCount, excusedCount,
//   absentCount, attendanceRate,
//   bySubject: [{ courseCode, courseName, sectionName,
//     sessions, present, absent, rate }],
//   absences: [{ date, courseCode, courseName, sectionName,
//     scheduledStart }],
//   attended: [{ date, courseCode, courseName, sectionName,
//     status }]
// }
function buildWeeklyEmail({ appName, report }) {
  const safeApp = escapeHtml(appName || "Smart Attendance");
  const safeName = escapeHtml(report.studentName || "Student");
  const period =
    `${escapeHtml(formatDate(report.periodStart))}` +
    ` to ${escapeHtml(formatDate(report.periodEnd))}`;
  const rate = report.attendanceRate;
  const rateText =
    rate == null ? "N/A" : `${Number(rate).toFixed(1)}%`;
  const rateColor = percentageColor(rate);

  const subject =
    `Weekly Attendance Report ` +
    `(${formatDate(report.periodStart)} to ` +
    `${formatDate(report.periodEnd)})`;

  const cell =
    "padding:8px 10px;border:1px solid #d9dee5;";
  const head =
    "background-color:#eef2f7;";

  const subjectRows = (report.bySubject || [])
    .map(
      (row) => `
        <tr>
          <td style="${cell}">${escapeHtml(row.courseCode)} - ${escapeHtml(row.courseName)}</td>
          <td style="${cell}">${escapeHtml(row.sectionName)}</td>
          <td align="center" style="${cell}">${row.sessions}</td>
          <td align="center" style="${cell}">${row.present}</td>
          <td align="center" style="${cell}">${row.absent}</td>
          <td align="center" style="${cell}">${row.rate == null ? "N/A" : Number(row.rate).toFixed(1) + "%"}</td>
        </tr>`
    )
    .join("");

  const subjectTable = (report.bySubject || []).length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;font-size:13px;color:#333333;">
        <thead>
          <tr style="${head}">
            <th align="left" style="${cell}">Subject</th>
            <th align="left" style="${cell}">Section</th>
            <th style="${cell}">Sessions</th>
            <th style="${cell}">Present</th>
            <th style="${cell}">Absent</th>
            <th style="${cell}">Attendance %</th>
          </tr>
        </thead>
        <tbody>${subjectRows}</tbody>
      </table>`
    : `<p style="font-size:13px;color:#555555;">No sessions were scheduled for your enrolled sections during this period.</p>`;

  const absenceRows = (report.absences || [])
    .map(
      (row) => `
        <tr>
          <td style="${cell}">${escapeHtml(formatDate(row.date))}</td>
          <td style="${cell}">${escapeHtml(row.courseCode)} - ${escapeHtml(row.courseName)}</td>
          <td style="${cell}">${escapeHtml(row.sectionName)}</td>
          <td align="center" style="${cell}">${escapeHtml(row.scheduledStart || "-")}</td>
        </tr>`
    )
    .join("");

  const absenceBlock = (report.absences || []).length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;font-size:13px;color:#333333;">
        <thead>
          <tr style="${head}">
            <th align="left" style="${cell}">Date</th>
            <th align="left" style="${cell}">Subject</th>
            <th align="left" style="${cell}">Section</th>
            <th style="${cell}">Session</th>
          </tr>
        </thead>
        <tbody>${absenceRows}</tbody>
      </table>`
    : `<p style="font-size:13px;color:#1e7e34;">No absences recorded. Good attendance this week.</p>`;

  const attendedRows = (report.attended || [])
    .map(
      (row) => `
        <tr>
          <td style="${cell}">${escapeHtml(formatDate(row.date))}</td>
          <td style="${cell}">${escapeHtml(row.courseCode)} - ${escapeHtml(row.courseName)}</td>
          <td style="${cell}">${escapeHtml(row.sectionName)}</td>
          <td align="center" style="${cell}">${escapeHtml(row.status)}</td>
        </tr>`
    )
    .join("");

  const attendedBlock = (report.attended || []).length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;font-size:13px;color:#333333;">
        <thead>
          <tr style="${head}">
            <th align="left" style="${cell}">Date</th>
            <th align="left" style="${cell}">Subject</th>
            <th align="left" style="${cell}">Section</th>
            <th style="${cell}">Status</th>
          </tr>
        </thead>
        <tbody>${attendedRows}</tbody>
      </table>`
    : `<p style="font-size:13px;color:#555555;">No attended sessions in this period.</p>`;

  const summaryRow = (label, value, highlight) =>
    `<tr>
      <td style="${highlight ? head : ""}${cell}font-size:13px;color:#555555;">${label}</td>
      <td align="right" style="${cell}font-size:14px;color:#222222;">${value}</td>
    </tr>`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f6f9;padding:20px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background-color:#ffffff;border:1px solid #e1e6ec;">
          <tr>
            <td style="background-color:#1a3a5c;padding:20px 24px;">
              <div style="color:#ffffff;font-size:20px;font-weight:bold;">${safeApp}</div>
              <div style="color:#bcd0e5;font-size:13px;margin-top:4px;">Weekly Attendance Report</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="font-size:14px;color:#333333;margin:0 0 6px;">Dear ${safeName},</p>
              <p style="font-size:13px;color:#555555;margin:0 0 16px;">Here is a summary of your attendance for the reporting period <strong>${period}</strong>.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin-bottom:20px;">
                ${summaryRow("Total sessions", `<strong>${report.totalSessions}</strong>`, true)}
                ${summaryRow("Present", report.presentCount)}
                ${summaryRow("Late", report.lateCount)}
                ${summaryRow("Excused", report.excusedCount)}
                ${summaryRow("Absent", report.absentCount)}
                <tr>
                  <td style="${head}${cell}font-size:13px;color:#555555;">Overall attendance</td>
                  <td align="right" style="${cell}font-size:16px;color:${rateColor};"><strong>${rateText}</strong></td>
                </tr>
              </table>
              <h3 style="font-size:14px;color:#1a3a5c;margin:0 0 8px;">Attendance by Subject</h3>
              ${subjectTable}
              <h3 style="font-size:14px;color:#1a3a5c;margin:20px 0 8px;">Absence Details</h3>
              ${absenceBlock}
              <h3 style="font-size:14px;color:#1a3a5c;margin:20px 0 8px;">Sessions Attended</h3>
              ${attendedBlock}
              <p style="font-size:12px;color:#888888;margin:20px 0 0;">If any record looks incorrect, please contact your lecturer or submit a correction request. This is an automated message.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#eef2f7;padding:12px 24px;font-size:11px;color:#888888;" align="center">${safeApp} - Weekly Attendance Report (${period})</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

function sampleReport() {
  return {
    studentName: "Test Student",
    periodStart: "2026-01-05",
    periodEnd: "2026-01-11",
    totalSessions: 4,
    presentCount: 3,
    lateCount: 0,
    excusedCount: 0,
    absentCount: 1,
    attendanceRate: 75.0,
    bySubject: [
      {
        courseCode: "CS201",
        courseName: "Data Structures",
        sectionName: "A",
        sessions: 2,
        present: 2,
        absent: 0,
        rate: 100,
      },
      {
        courseCode: "CS202",
        courseName: "Operating Systems",
        sectionName: "A",
        sessions: 2,
        present: 1,
        absent: 1,
        rate: 50,
      },
    ],
    absences: [
      {
        date: "2026-01-08",
        courseCode: "CS202",
        courseName: "Operating Systems",
        sectionName: "A",
        scheduledStart: "10:00:00",
      },
    ],
    attended: [
      {
        date: "2026-01-06",
        courseCode: "CS201",
        courseName: "Data Structures",
        sectionName: "A",
        status: "present",
      },
    ],
  };
}

module.exports = {
  buildWeeklyEmail,
  sampleReport,
  escapeHtml,
  formatDate,
  isValidDateString,
  isValidTimeString,
  isValidTimezone,
};
