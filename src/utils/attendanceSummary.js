// ============================================================
// ATTENDANCE SUMMARY
// Shared calculation used by:
// - GET /api/student/attendance/summary
// - the weekly WhatsApp job
// Every number comes from real attendance_events rows.
// Weeks are Monday-Sunday in the WHATSAPP_TIMEZONE
// (default Africa/Cairo).
// ============================================================

function getTimeZone() {
  return (
    process.env.WHATSAPP_TIMEZONE ||
    "Africa/Cairo"
  );
}

function cairoParts(date) {
  const formatted =
    new Intl.DateTimeFormat("en-CA", {
      timeZone: getTimeZone(),
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);

  const [year, month, day] = formatted
    .split("-")
    .map(Number);

  return { year, month, day };
}

function toDateString(year, month, day) {
  const pad = (value) =>
    String(value).padStart(2, "0");

  return `${year}-${pad(month)}-${pad(day)}`;
}

function addDays(year, month, day, delta) {
  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  date.setUTCDate(
    date.getUTCDate() + delta
  );

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

// Monday-based weekday index (Monday = 0 ... Sunday = 6).
function cairoWeekday(year, month, day) {
  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  return (date.getUTCDay() + 6) % 7;
}

function getWeekRange(referenceDate = new Date()) {
  const current = cairoParts(referenceDate);
  const weekday = cairoWeekday(
    current.year,
    current.month,
    current.day
  );

  const start = addDays(
    current.year,
    current.month,
    current.day,
    -weekday
  );

  const end = addDays(
    start.year,
    start.month,
    start.day,
    6
  );

  const previousEnd = addDays(
    start.year,
    start.month,
    start.day,
    -1
  );

  const previousStart = addDays(
    previousEnd.year,
    previousEnd.month,
    previousEnd.day,
    -6
  );

  const startStr = toDateString(
    start.year,
    start.month,
    start.day
  );

  const endStr = toDateString(
    end.year,
    end.month,
    end.day
  );

  return {
    start: startStr,
    end: endStr,
    previousStart: toDateString(
      previousStart.year,
      previousStart.month,
      previousStart.day
    ),
    previousEnd: toDateString(
      previousEnd.year,
      previousEnd.month,
      previousEnd.day
    ),
    label: `${start.day}/${start.month} - ${end.day}/${end.month}/${end.year}`,
  };
}

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function courseOf(event) {
  return (
    event.course_name ||
    event.course_code ||
    event.section_name ||
    "Unknown Course"
  );
}

function emptyBucket() {
  return {
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    attended: 0,
    rate: 0,
  };
}

function finalizeBucket(bucket) {
  const attended =
    bucket.present +
    bucket.late +
    bucket.excused;

  return {
    ...bucket,
    attended,
    rate:
      bucket.total > 0
        ? Math.round(
            (attended / bucket.total) * 100
          )
        : 0,
  };
}

function countInto(bucket, status) {
  bucket.total += 1;

  if (
    status === "present" ||
    status === "accepted"
  ) {
    bucket.present += 1;
  } else if (status === "absent") {
    bucket.absent += 1;
  } else if (status === "late") {
    bucket.late += 1;
  } else if (status === "excused") {
    bucket.excused += 1;
  }
}

function summarizeEvents(
  events,
  week,
  previousWeek
) {
  const overall = emptyBucket();
  const weekly = emptyBucket();
  const previous = emptyBucket();
  const byCourseMap = new Map();

  const sessionDateOf = (event) => {
    const raw =
      event.session_date ||
      event.sessionDate;

    if (!raw) return "";

    return String(raw).slice(0, 10);
  };

  for (const event of events) {
    const status = normalizeStatus(
      event.status
    );

    const date = sessionDateOf(event);

    countInto(overall, status);

    if (
      date >= week.start &&
      date <= week.end
    ) {
      countInto(weekly, status);

      const course = courseOf(event);

      if (!byCourseMap.has(course)) {
        byCourseMap.set(course, emptyBucket());
      }

      countInto(
        byCourseMap.get(course),
        status
      );
    }

    if (
      previousWeek &&
      date >= previousWeek.start &&
      date <= previousWeek.end
    ) {
      countInto(previous, status);
    }
  }

  const byCourse = [...byCourseMap.entries()]
    .map(([course, bucket]) => ({
      course,
      ...finalizeBucket(bucket),
    }))
    .sort((a, b) => a.rate - b.rate);

  const recent = [...events]
    .sort((a, b) =>
      String(b.session_date || "").localeCompare(
        String(a.session_date || "")
      )
    )
    .slice(0, 5)
    .map((event) => ({
      date: String(
        event.session_date || ""
      ).slice(0, 10),
      course: courseOf(event),
      status: normalizeStatus(event.status),
    }));

  return {
    overall: finalizeBucket(overall),
    weekly: finalizeBucket(weekly),
    previousWeek: finalizeBucket(previous),
    byCourse,
    recent,
  };
}

function deriveWarnings(summary) {
  const warnings = [];
  const { overall, weekly } = summary;

  if (overall.total === 0) {
    return warnings;
  }

  if (overall.absent >= 3) {
    warnings.push({
      type: "Absence accumulation",
      message: `You have ${overall.absent} absent sessions out of ${overall.total}.`,
    });
  }

  if (
    overall.total >= 3 &&
    overall.rate < 75
  ) {
    warnings.push({
      type: "Low attendance rate",
      message: `Your overall attendance rate is ${overall.rate}%. The usual target is 75%.`,
    });
  }

  if (overall.late >= 2) {
    warnings.push({
      type: "Repeated lateness",
      message: `You have ${overall.late} late arrivals.`,
    });
  }

  if (weekly.absent >= 2) {
    warnings.push({
      type: "This week absences",
      message: `You missed ${weekly.absent} session(s) this week.`,
    });
  }

  return warnings.slice(0, 4);
}

async function fetchStudentEvents(
  pool,
  studentId
) {
  const [rows] = await pool.query(
    `
    SELECT
      ae.id,
      ae.status,
      ae.source,
      ae.scanned_at,
      c.course_code,
      c.course_name,
      sec.section_name,
      ses.session_date
    FROM attendance_events ae

    INNER JOIN attendance_sessions ses
      ON ses.id = ae.session_id

    INNER JOIN sections sec
      ON sec.id = ses.section_id

    INNER JOIN courses c
      ON c.id = sec.course_id

    WHERE ae.student_id = ?

    ORDER BY
      ses.session_date DESC,
      ae.id DESC
    `,
    [studentId]
  );

  return rows;
}

async function getStudentSummary(
  pool,
  studentId,
  referenceDate = new Date()
) {
  const week = getWeekRange(referenceDate);

  const previousWeek = {
    start: week.previousStart,
    end: week.previousEnd,
  };

  const events = await fetchStudentEvents(
    pool,
    studentId
  );

  const summary = summarizeEvents(
    events,
    week,
    previousWeek
  );

  return {
    overall: summary.overall,
    weekly: {
      ...summary.weekly,
      range: {
        start: week.start,
        end: week.end,
        label: week.label,
      },
      previousWeekRate:
        summary.previousWeek.rate,
      byCourse: summary.byCourse,
    },
    byCourse: summary.byCourse,
    warnings: deriveWarnings(summary),
    recent: summary.recent,
  };
}

function formatDateLabel(value) {
  if (!value) return "-";

  const [year, month, day] = String(value)
    .slice(0, 10)
    .split("-");

  return `${day}/${month}/${year}`;
}

function buildWhatsAppMessage({
  summary,
  studentName,
  frontendUrl,
}) {
  const { overall, weekly } = summary;
  const range = weekly.range || {};

  const lines = [
    "Attendify Weekly Attendance Summary",
    "",
    `Week: ${range.label || `${range.start || "-"} - ${range.end || "-"}`}`,
    "",
    `Attendance: ${weekly.rate}%`,
    "",
    `Present: ${weekly.present}`,
    `Absent: ${weekly.absent}`,
    `Late: ${weekly.late}`,
    "",
    "Course Summary:",
  ];

  if (
    !summary.byCourse ||
    !summary.byCourse.length
  ) {
    lines.push("No sessions recorded this week.");
  } else {
    for (const course of summary.byCourse.slice(
      0,
      10
    )) {
      lines.push(
        `${course.course}: ${course.rate}%`
      );
    }
  }

  lines.push("");
  lines.push("Attendance note:");

  if (weekly.total === 0) {
    lines.push(
      "No sessions were recorded for you this week."
    );
  } else if (weekly.rate >= 75) {
    lines.push(
      `Good consistency, ${studentName}. Overall rate is ${overall.rate}%.`
    );
  } else {
    lines.push(
      `Your weekly rate is ${weekly.rate}%. Overall rate is ${overall.rate}%. Please attend upcoming sessions.`
    );
  }

  if (frontendUrl) {
    lines.push("");
    lines.push("Open Attendify:");
    lines.push(frontendUrl);
  }

  return lines.join("\n");
}

// Normalize to E.164 for WhatsApp delivery.
// Egyptian mobiles without country code are mapped to +20.
// Anything else without a leading "+" is rejected (null)
// so a message can never go to a misdialed number.
function normalizeToE164(phone) {
  if (
    phone === undefined ||
    phone === null
  ) {
    return null;
  }

  let text = String(phone)
    .trim()
    .replace(/[\s\-().]/g, "");

  text = text.replace(/\+(?=.*\+)/g, "");

  if (/^\+[0-9]{7,15}$/.test(text)) {
    return text;
  }

  const digits = text.replace(/^\+/, "");

  if (!/^[0-9]{7,15}$/.test(digits)) {
    return null;
  }

  // Egyptian mobile: 01XXXXXXXXX (11 digits).
  if (
    digits.length === 11 &&
    digits.startsWith("01")
  ) {
    return `+20${digits.slice(1)}`;
  }

  // Egyptian mobile without trunk zero: 1XXXXXXXXX.
  if (
    digits.length === 10 &&
    digits.startsWith("1")
  ) {
    return `+20${digits}`;
  }

  return null;
}

module.exports = {
  getWeekRange,
  summarizeEvents,
  deriveWarnings,
  fetchStudentEvents,
  getStudentSummary,
  buildWhatsAppMessage,
  normalizeToE164,
};
