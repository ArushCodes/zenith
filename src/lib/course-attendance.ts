import { resolveMarks, sessionSubject } from "./attendance";
import { isTeachingClass } from "./courses";
import type { AttendanceMark, ClassSession } from "./batches";

/** Only completed teaching sessions count; an unmarked session is not present. */
export function courseAttendance(
  sessions: ClassSession[],
  marks: AttendanceMark[],
  userId: string | undefined,
  now: number,
) {
  const resolved = resolveMarks(marks, userId);
  const rows = new Map<
    string,
    { held: number; present: number; absent: number; unmarked: number }
  >();
  for (const session of sessions) {
    if (!isTeachingClass(session) || new Date(session.end_at).getTime() > now) continue;
    const subject = sessionSubject(session);
    const row = rows.get(subject) ?? { held: 0, present: 0, absent: 0, unmarked: 0 };
    row.held++;
    const mark = resolved.get(session.id);
    if (!mark) row.unmarked++;
    else if (mark.status === "absent") row.absent++;
    else row.present++;
    rows.set(subject, row);
  }
  return rows;
}
