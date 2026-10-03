import assert from "node:assert/strict";
import {
  safeMisses,
  gradePenalty,
  consecutiveNeededFor70,
  safeMissBufferFor70,
  getBunkStatus,
  resolveMarks,
} from "../src/lib/attendance";
import { assertSafeFeedUrl } from "../src/lib/safe-url";
import { parseCalendarSessions } from "../src/lib/ics-parser.server";

for (const credits of [1, 2, 3]) {
  assert.equal(safeMisses(credits * 8), credits);
  assert.equal(gradePenalty(credits * 8, credits), 0);
  assert.equal(gradePenalty(credits * 8, credits + 1), 0.5);
  assert.equal(getBunkStatus(credits, credits - 1).penalty, 0);
}
assert.equal(consecutiveNeededFor70(10, 6), 4);
assert.equal(consecutiveNeededFor70(10, 7), 0);
assert.equal(safeMissBufferFor70(10, 7), 0);
assert.equal(safeMissBufferFor70(10, 10), 4);
const self = {
  session_id: "session",
  user_id: "student",
  mark_source: "self",
  status: "present",
} as const;
const rep = { ...self, mark_source: "rep", status: "absent" } as const;
assert.equal(resolveMarks([rep, self] as never, "student").get("session")?.status, "absent");
assert.equal(resolveMarks([self, rep] as never, "other").size, 0);
for (const url of [
  "http://example.com/calendar",
  "https://127.0.0.1/feed",
  "https://169.254.169.254/feed",
  "https://user:password@example.com/feed",
  "https://example.com:8443/feed",
  "https://campus.local/feed",
])
  assert.throws(() => assertSafeFeedUrl(url));
assert.equal(assertSafeFeedUrl("https://example.com/calendar.ics").hostname, "example.com");
const calendar = (events: string) =>
  `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Zenith//Regression//EN\r\n${events}\r\nEND:VCALENDAR`;
const event = (extra = "", date = "20261005T090000") =>
  `BEGIN:VEVENT\r\nUID:course-1\r\nDTSTART:${date}\r\nDTEND:20261005T101500\r\nSUMMARY:Mathematics\r\n${extra}\r\nEND:VEVENT`;
const floating = await parseCalendarSessions(calendar(event()), "batch");
assert.equal(floating[0]?.start_at, "2026-10-05T03:30:00.000Z");
const explicit = await parseCalendarSessions(
  calendar(
    event()
      .replace("DTSTART:", "DTSTART;TZID=Asia/Kolkata:")
      .replace("DTEND:", "DTEND;TZID=Asia/Kolkata:"),
  ),
  "batch",
);
assert.equal(explicit[0]?.start_at, floating[0]?.start_at);
const repeat = await parseCalendarSessions(
  calendar(event("RRULE:FREQ=DAILY;COUNT=3\r\nEXDATE;TZID=Asia/Kolkata:20261006T090000")),
  "batch",
);
assert.equal(repeat.length, 2);
assert.equal(new Set(repeat.map((row) => row.external_uid)).size, 2);
assert.equal((await parseCalendarSessions(calendar(event("STATUS:CANCELLED")), "batch")).length, 0);
await assert.rejects(parseCalendarSessions("BEGIN:VCALENDAR", "batch"));
await assert.rejects(
  parseCalendarSessions(calendar(event("RRULE:FREQ=SECONDLY;COUNT=10000000")), "batch"),
);
console.log(
  "Passed: attendance boundaries, rep precedence, feed URL guards, IST dates, recurrence exclusions and cancellations.",
);
