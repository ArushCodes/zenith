import { attendanceColor } from "@/lib/attendance-colors";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useBatch } from "@/hooks/use-batch";
import { attendanceQuery, sessionsQuery } from "@/lib/batches";
import { courseAttendance, defaultClassDay } from "@/lib/course-attendance";
import { sessionSubject, shortSubject, getBunkStatus } from "@/lib/attendance";
import { isTeachingClass, autoColor } from "@/lib/courses";
import { dayKey } from "@/lib/deadlines";
import { IPM1_BATCH_ID } from "@/lib/roster.data";
import { MissAllowance } from "@/components/attendance/MissAllowance";

export function FeedAttendanceSummary({ now, onOpen }: { now: number; onOpen: () => void }) {
  const [showAll, setShowAll] = useState(false);
  const { user } = useAuth();
  const { batchId, isMember, canManage } = useBatch();
  const timetable = useQuery(sessionsQuery(batchId));
  const attendance = useQuery(attendanceQuery(batchId, isMember || canManage, user?.id, canManage));
  const rows = useMemo(() => {
    const sessions = timetable.data ?? [];
    const stats = courseAttendance(sessions, attendance.data ?? [], user?.id, now);
    return [...new Set(sessions.filter(isTeachingClass).map(sessionSubject))]
      .sort()
      .map((course) => ({
        course,
        ...(stats.get(course) ?? { present: 0, absent: 0, unmarked: 0, held: 0 }),
      }));
  }, [timetable.data, attendance.data, user?.id, now]);
  const focusDate = new Date(now);
  focusDate.setDate(focusDate.getDate() + defaultClassDay(timetable.data ?? [], now));
  const focusCourses = new Set(
    (timetable.data ?? [])
      .filter(isTeachingClass)
      .filter((session) => dayKey(session.start_at) === dayKey(focusDate))
      .map(sessionSubject),
  );
  const orderedRows = [...rows].sort(
    (a, b) => Number(focusCourses.has(b.course)) - Number(focusCourses.has(a.course)),
  );
  const visibleRows =
    showAll || !focusCourses.size
      ? orderedRows
      : orderedRows.filter((row) => focusCourses.has(row.course));
  if (!user || (!isMember && !canManage)) return null;
  return (
    <section
      aria-label="Attendance overview"
      className="rounded-2xl border border-border/80 bg-surface/95 p-4 sm:p-5"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">Attendance</h2>
        <button
          type="button"
          onClick={onOpen}
          className="flex items-center gap-1 text-xs text-cyan"
        >
          Full records <ArrowUpRight className="size-3.5" />
        </button>
      </div>
      <p className="mb-3 text-[10px] text-dim">
        Based on recorded absences. Check unmarked classes.
      </p>
      {focusCourses.size > 0 && (
        <div className="mb-3 flex items-center justify-between text-xs text-dim">
          <span>
            {dayKey(focusDate) === dayKey(new Date(now)) ? "Today's courses" : "Next day's courses"}
          </span>
          <button type="button" onClick={() => setShowAll(!showAll)} className="text-cyan">
            {showAll ? "Scheduled subjects" : "All subjects"}
          </button>
        </div>
      )}
      {timetable.isError || attendance.isError ? (
        <p className="text-xs text-dim">Attendance unavailable</p>
      ) : timetable.isPending || attendance.isPending ? (
        <p className="text-xs text-dim">Loading attendance…</p>
      ) : !rows.length ? (
        <p className="text-xs text-dim">No classes yet</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {visibleRows.map((row) => {
            const allowance =
              batchId === IPM1_BATCH_ID ? getBunkStatus(row.course, row.absent) : null;
            return (
              <button
                key={row.course}
                type="button"
                onClick={onOpen}
                title={row.course}
                className="min-w-0 rounded-xl border border-border/60 bg-surface2/40 px-3 py-2 text-left transition-colors hover:border-cyan/40"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: autoColor(row.course) }}
                  />
                  <span className="truncate text-xs font-semibold text-ink">
                    {shortSubject(row.course, 22)}
                  </span>
                </div>
                {allowance && <MissAllowance course={row.course} missed={row.absent} />}
                <p
                  className="mt-1 text-xs text-dim"
                  style={
                    allowance
                      ? {
                          color: attendanceColor(
                            allowance.safeLeft,
                            allowance.allowed,
                            allowance.excess,
                          ),
                        }
                      : undefined
                  }
                >
                  {row.absent} missed
                </p>
                <p className="mt-0.5 text-[10px] text-faint">
                  {row.present} present{row.unmarked ? ` · ${row.unmarked} unmarked` : ""}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
