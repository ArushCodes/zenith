import type { AttendanceMark, ClassSession } from "@/lib/batches";
import { resolveMarks } from "@/lib/attendance";
import { isTeachingClass } from "@/lib/courses";
import { dayKey } from "@/lib/deadlines";

/** Use the full day, independently of the current subject/calendar filters. */
export function dayTeachingSessions(sessions: ClassSession[], batchId: string, day: string) {
  return sessions.filter(
    (session) =>
      session.batch_id === batchId &&
      !session.is_cancelled &&
      isTeachingClass(session) &&
      dayKey(session.start_at) === day,
  );
}

export function selfAttendanceTargets(
  sessions: ClassSession[],
  marks: AttendanceMark[],
  userId: string,
  absent: boolean,
) {
  const resolved = resolveMarks(marks, userId);
  return sessions.filter((session) => {
    const mark = resolved.get(session.id);
    return (
      !session.is_cancelled &&
      isTeachingClass(session) &&
      mark?.mark_source !== "rep" &&
      (mark?.status === "absent") !== absent
    );
  });
}
