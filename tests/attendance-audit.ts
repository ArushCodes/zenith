import assert from "node:assert/strict";
import { courseCredits, sessionCredits, resolveMarks, getBunkStatus } from "../src/lib/attendance";
import { attendanceProgress, courseAttendance } from "../src/lib/course-attendance";
import type { CreditCourse } from "../src/lib/attendance";
import type { AttendanceMark, ClassSession } from "../src/lib/batches";
export function testAttendanceAudit() {
  assert.equal(courseCredits("Retail Management"), 0);
  assert.equal(courseCredits("AI"), 2);
  const catalog = [
    { code: "RT 101", name: "Retail Management", short_name: "Retail", credits: 4 },
  ] as CreditCourse[];
  assert.equal(courseCredits("Retail Management", catalog), 4);
  assert.equal(courseCredits("AI", catalog), 0);
  assert.equal(
    sessionCredits({ course_code: "RT 101", course_name: "Retail" } as ClassSession, catalog),
    4,
  );
  assert.equal(getBunkStatus("Unknown course", 3).penalty, 0);
  assert.deepEqual(attendanceProgress(2, 1), { held: 2, attended: 1, pct: 50 });
  assert.equal(attendanceProgress(0, 0).pct, null);
  const self = {
    session_id: "a",
    user_id: "u",
    mark_source: "self",
    status: "present",
  } as AttendanceMark;
  const rep = { ...self, mark_source: "rep", status: "absent" } as AttendanceMark;
  assert.equal(resolveMarks([rep, self], "u").get("a")?.status, "absent");
  assert.equal(resolveMarks([self, rep], "u").get("a")?.status, "absent");
  const session = {
    id: "a",
    title: "Retail Management",
    course_name: "Retail Management",
    course_code: "RT 101",
    start_at: "2026-10-09T04:45:00Z",
    end_at: "2026-10-09T06:00:00Z",
    is_holiday: false,
  } as ClassSession;
  const row = [
    ...courseAttendance(
      [session, { ...session, id: "b", end_at: "2026-10-12T06:00:00Z" }],
      [self, rep],
      "u",
      Date.parse("2026-10-10T06:00:00Z"),
    ).values(),
  ][0];
  assert.deepEqual(row, { held: 1, present: 0, absent: 1, unmarked: 0 });
}
