import { resolveMarks, sessionSubject } from "./attendance";
import { isTeachingClass } from "./courses";
import type { AttendanceMark, ClassSession } from "./batches";
import { dayKey } from "./deadlines";

export function defaultClassDay(sessions: ClassSession[], now: number) {
  const today = sessions.filter(
    (s) => isTeachingClass(s) && dayKey(s.start_at) === dayKey(new Date(now)),
  );
  if (today.some((s) => new Date(s.end_at).getTime() > now)) return 0;
  const next = sessions
    .filter((s) => isTeachingClass(s) && new Date(s.start_at).getTime() > now)
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())[0];
  if (!next) return 0;
  return Math.round(
    (Date.parse(dayKey(next.start_at)) - Date.parse(dayKey(new Date(now)))) / 86400000,
  );
}

/** Personal tracker: completed classes default to present unless marked absent. */
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
    if (mark?.status === "absent") row.absent++;
    else row.present++;
    rows.set(subject, row);
  }
  return rows;
}

/** Held-to-date percentage excludes future classes and defaults unmarked held classes to present. */
export function attendanceProgress(held: number, absent: number) {
  const attended = Math.max(0, held - absent);
  return { held, attended, pct: held > 0 ? Math.round((attended / held) * 100) : null };
}
