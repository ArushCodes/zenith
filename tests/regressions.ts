import assert from "node:assert/strict";
import { courseAttendance } from "../src/lib/course-attendance";
import { sessionSubject } from "../src/lib/attendance";
import type { ClassSession } from "../src/lib/batches";
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
const completedClass = {
  id: "session",
  title: "Mathematics",
  course_name: "Mathematics",
  start_at: "2026-10-05T03:30:00Z",
  end_at: "2026-10-05T04:30:00Z",
} as ClassSession;
const courseRows = courseAttendance(
  [
    completedClass,
    { ...completedClass, id: "unmarked" },
    { ...completedClass, id: "future", end_at: "2026-10-06T04:30:00Z" },
  ],
  [self, rep] as never,
  "student",
  Date.parse("2026-10-05T05:00:00Z"),
);
assert.deepEqual(courseRows.get(sessionSubject(completedClass)), {
  held: 2,
  present: 0,
  absent: 1,
  unmarked: 1,
});
assert.equal(
  courseAttendance(
    [completedClass],
    [self, rep] as never,
    "other",
    Date.parse("2026-10-05T05:00:00Z"),
  ).get(sessionSubject(completedClass))?.unmarked,
  1,
);
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

const { noticeResultSchema, toIstInput, fromIstInput, matchesNotice } =
  await import("../src/lib/notice-drafts");
assert.equal(toIstInput("2026-10-05T04:00:00Z"), "2026-10-05T09:30");
assert.equal(fromIstInput("2026-10-05T09:30"), "2026-10-05T04:00:00.000Z");
assert.equal(fromIstInput(""), null);
assert.equal(
  matchesNotice(
    { title: " Quiz ", due_at: "2026-10-05T09:30:00+05:30" },
    { title: "quiz", due_at: "2026-10-05T04:00:00Z" },
  ),
  true,
);
assert.equal(
  noticeResultSchema.parse({ events: [{ title: "Quiz", type: "quiz", due_at: null }] }).events[0]
    .due_at,
  null,
);
assert.throws(() =>
  noticeResultSchema.parse({ events: [{ title: "Quiz", type: "quiz", due_at: "tomorrow" }] }),
);
assert.throws(() =>
  noticeResultSchema.parse({
    events: [{ title: "Quiz", type: "quiz", due_at: null, submission_link: "javascript:alert(1)" }],
  }),
);
const { extractNotice } = await import("../src/lib/notice-extraction.server");
const savedFetch = globalThis.fetch;
const savedKey = process.env.GEMINI_API_KEY;
try {
  process.env.GEMINI_API_KEY = "unit-test-only";
  globalThis.fetch = async (_url, options) => {
    const payload = JSON.parse(String(options?.body));
    assert.match(payload.systemInstruction.parts[0].text, /untrusted data/);
    return Response.json({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  events: [
                    { title: "Quiz", type: "quiz", due_at: null },
                    {
                      title: "Assignment",
                      type: "assignment",
                      due_at: "2026-10-05T23:59:00+05:30",
                    },
                  ],
                }),
              },
            ],
          },
        },
      ],
    });
  };
  assert.equal((await extractNotice("Synthetic test notice", "2026-10-04")).length, 2);
  globalThis.fetch = async () => new Response("error", { status: 429 });
  await assert.rejects(extractNotice("test", "2026-10-04"), /429/);
} finally {
  globalThis.fetch = savedFetch;
  if (savedKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = savedKey;
}
console.log(
  "Passed: notice draft validation, missing deadlines, duplicate matching, IST editing and mocked extraction.",
);
