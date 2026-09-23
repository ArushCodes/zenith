import type { ClassSession } from "@/lib/batches";
import type { Deadline } from "@/lib/deadlines";
import { isTeachingClass } from "@/lib/courses";

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatIcsDate(date: Date): string {
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
}

function escapeIcs(str: string): string {
  return (str || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function generateIcalFeed({
  batchName,
  sessions,
  deadlines,
}: {
  batchName: string;
  sessions: ClassSession[];
  deadlines: Deadline[];
}): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Zenith TAPMI//Academic Portal//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(`Zenith TAPMI — ${batchName}`)}`,
    "X-WR-TIMEZONE:Asia/Kolkata",
  ];

  const nowIcs = formatIcsDate(new Date());

  // 1. Sessions / Lectures
  for (const s of sessions) {
    if (!isTeachingClass(s) && !s.title) continue;
    const start = new Date(s.starts_at);
    const end = new Date(s.ends_at);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;

    const title = s.course_code
      ? `${s.course_code}: ${s.subject_name || s.title}`
      : s.subject_name || s.title;

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:zenith-session-${s.id}@zenithfor.me`);
    lines.push(`DTSTAMP:${nowIcs}`);
    lines.push(`DTSTART:${formatIcsDate(start)}`);
    lines.push(`DTEND:${formatIcsDate(end)}`);
    lines.push(`SUMMARY:${escapeIcs(title)}`);
    if (s.classroom) {
      lines.push(`LOCATION:${escapeIcs(s.classroom)}`);
    }
    const desc = [
      s.faculty_name ? `Faculty: ${s.faculty_name}` : null,
      s.classroom ? `Room: ${s.classroom}` : null,
      "Synced via Zenith (https://www.zenithfor.me)",
    ]
      .filter(Boolean)
      .join("\n");
    lines.push(`DESCRIPTION:${escapeIcs(desc)}`);
    lines.push("STATUS:CONFIRMED");
    lines.push("END:VEVENT");
  }

  // 2. Deadlines / Exams / Quizzes
  for (const d of deadlines) {
    const due = new Date(d.due_at);
    if (isNaN(due.getTime())) continue;
    const start = new Date(due.getTime() - 30 * 60_000); // 30 min before
    const end = due;

    const label = `[${d.type.toUpperCase()}] ${d.subject ? `${d.subject} · ` : ""}${d.title}`;

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:zenith-deadline-${d.id}@zenithfor.me`);
    lines.push(`DTSTAMP:${nowIcs}`);
    lines.push(`DTSTART:${formatIcsDate(start)}`);
    lines.push(`DTEND:${formatIcsDate(end)}`);
    lines.push(`SUMMARY:${escapeIcs(label)}`);
    const desc = [
      `Type: ${d.type.toUpperCase()}`,
      d.work_mode === "group" ? "Work Mode: Group" : "Work Mode: Individual",
      d.submission_link ? `Submission Link: ${d.submission_link}` : null,
      "Zenith Academic Board",
    ]
      .filter(Boolean)
      .join("\n");
    lines.push(`DESCRIPTION:${escapeIcs(desc)}`);
    lines.push("STATUS:CONFIRMED");
    lines.push("BEGIN:VALARM");
    lines.push("TRIGGER:-PT2H");
    lines.push("ACTION:DISPLAY");
    lines.push(`DESCRIPTION:${escapeIcs(`Reminder: ${label}`)}`);
    lines.push("END:VALARM");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
