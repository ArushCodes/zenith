import "@tanstack/react-start/server-only";
import ical, { type ParameterValue } from "node-ical";
import { FeedError } from "./safe-url";
import { isAssessmentSession } from "./courses";
import { dayKey } from "./deadlines";

const text = (value: ParameterValue | undefined): string =>
  typeof value === "string" ? value : (value?.val ?? "");
const field = (description: string, label: string) =>
  description
    .split("\n")
    .map((line) => new RegExp(`^${label}:\\s*(.+)$`, "i").exec(line))
    .find(Boolean)?.[1]
    ?.trim() ?? null;

export async function parseCalendarSessions(source: string, batchId: string) {
  if (!source.includes("BEGIN:VCALENDAR") || !source.includes("END:VCALENDAR"))
    throw new FeedError("Incomplete calendar feed.");
  if (/^RRULE:.*FREQ=(SECONDLY|MINUTELY|HOURLY)/im.test(source))
    throw new FeedError("Timetable recurrence must be daily or less frequent.");
  // Floating times belong to the campus timezone; do not interpret them in UTC.
  const campusSource = source.replace(
    /^(DTSTART|DTEND|RECURRENCE-ID):(?=\d{8}T\d{6}(?:\r?$))/gm,
    "$1;TZID=Asia/Kolkata:",
  );
  const calendar = await ical.async.parseICS(campusSource);
  const rows = [];
  const windowStart = new Date();
  windowStart.setUTCFullYear(windowStart.getUTCFullYear() - 1);
  const windowEnd = new Date();
  windowEnd.setUTCFullYear(windowEnd.getUTCFullYear() + 1);
  for (const event of Object.values(calendar)) {
    if (!event || event.type !== "VEVENT" || event.status === "CANCELLED") continue;
    // Recurrences are bounded to the academic horizon, preserving exceptions/overrides.
    const instances = event.rrule
      ? ical.expandRecurringEvent(event, { from: windowStart, to: windowEnd })
      : [{ start: event.start, end: event.end ?? event.start, event }];
    for (const instance of instances) {
      if (instance.event.status === "CANCELLED") continue;
      const start = instance.start.toISOString();
      const end = instance.end.toISOString();
      if (end < start) throw new FeedError("A calendar event ends before it starts.");
      const rawSummary = text(instance.event.summary).trim() || "Class";
      const assessment = isAssessmentSession({
        title: rawSummary,
        course_name: field(text(instance.event.description), "Course"),
        short_name: null,
      });
      const summary = assessment ? rawSummary.replace(/^🎉\s*/, "") : rawSummary;
      const desc = text(instance.event.description);
      const holiday = !assessment && (/holiday/i.test(summary) || /^🎉/.test(summary));
      const slot = field(desc, "Slot");
      const code = slot ? (/:\s*([A-Z]{2,4}\s?\d{3,4})/.exec(slot)?.[1] ?? null) : null;
      const number = /-(\d+)\s*$/.exec(slot ?? "")?.[1] ?? /-\s*S(\d+)\s*-/.exec(summary)?.[1];
      const recurrenceId = instance.event.recurrenceid?.toISOString() ?? start;
      rows.push({
        batch_id: batchId,
        source: "ics" as const,
        external_uid: event.rrule
          ? `${event.uid.slice(0, 160)}#${recurrenceId}`
          : event.uid.slice(0, 200),
        title: summary,
        course_code: code,
        course_name: field(desc, "Course"),
        short_name: holiday ? null : summary.split(" - ")[0]!,
        faculty_name: field(desc, "Faculty"),
        section: field(desc, "Section"),
        classroom: text(instance.event.location).trim() || null,
        session_number: number ? Number(number) : null,
        start_at: start,
        end_at: end,
        is_holiday: holiday,
      });
      if (rows.length > 5000)
        throw new FeedError("Calendar has more than 5,000 sessions. Narrow the feed range.");
    }
  }
  const holidayDays = new Set(
    rows.filter((row) => row.is_holiday).map((row) => dayKey(row.start_at)),
  );
  // Generic exam-period placeholders on a declared holiday are feed artefacts.
  return rows.filter(
    (row) =>
      !(holidayDays.has(dayKey(row.start_at)) && /end[\s-]?term.*conceptual/i.test(row.title)),
  );
}
