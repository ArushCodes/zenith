import { useEffect, useMemo, useState } from "react";
import { Clock, MapPin, User, ChevronRight, CheckCircle2, Sparkles, BookOpen } from "lucide-react";
import type { ClassSession } from "@/lib/batches";
import { isTeachingClass } from "@/lib/courses";

type Props = {
  sessions: ClassSession[];
  batchName?: string;
  onNavigateToTimetable?: () => void;
  onNavigateToCourses?: () => void;
};

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function LiveClassHud({
  sessions,
  batchName = "Zenith Batch",
  onNavigateToTimetable,
  onNavigateToCourses,
}: Props) {
  const [now, setNow] = useState(() => Date.now());

  // Keep countdown strictly live every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const todaySchedule = useMemo(() => {
    const nowDate = new Date(now);
    const y = nowDate.getFullYear();
    const m = nowDate.getMonth();
    const d = nowDate.getDate();

    const teaching = sessions.filter(isTeachingClass);

    return teaching
      .filter((s) => {
        const start = new Date(s.start_at);
        return (
          start.getFullYear() === y &&
          start.getMonth() === m &&
          start.getDate() === d
        );
      })
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  }, [sessions, now]);

  // Determine active class or next class today
  const hudState = useMemo(() => {
    if (todaySchedule.length === 0) {
      // Find the next upcoming session in future days
      const future = sessions
        .filter(isTeachingClass)
        .map((s) => ({ ...s, startTime: new Date(s.start_at).getTime() }))
        .filter((s) => s.startTime > now)
        .sort((a, b) => a.startTime - b.startTime)[0];

      return {
        type: "no_classes_today" as const,
        nextFutureSession: future,
      };
    }

    // 1. Check if a class is currently in progress
    const active = todaySchedule.find((s) => {
      const start = new Date(s.start_at).getTime();
      const end = new Date(s.end_at).getTime();
      return now >= start && now < end;
    });

    if (active) {
      const start = new Date(active.start_at).getTime();
      const end = new Date(active.end_at).getTime();
      const totalMins = Math.max(1, Math.round((end - start) / 60000));
      const elapsedMins = Math.max(0, Math.round((now - start) / 60000));
      const remainingMins = Math.max(1, Math.round((end - now) / 60000));
      const progress = Math.min(100, Math.round((elapsedMins / totalMins) * 100));

      return {
        type: "in_progress" as const,
        session: active,
        remainingMins,
        progress,
        startTimeStr: formatTime(new Date(start)),
        endTimeStr: formatTime(new Date(end)),
      };
    }

    // 2. Check for the next upcoming class today
    const nextToday = todaySchedule.find((s) => {
      return new Date(s.start_at).getTime() > now;
    });

    if (nextToday) {
      const start = new Date(nextToday.start_at).getTime();
      const end = new Date(nextToday.end_at).getTime();
      const diffMins = Math.max(1, Math.round((start - now) / 60000));

      return {
        type: "upcoming_today" as const,
        session: nextToday,
        diffMins,
        startTimeStr: formatTime(new Date(start)),
        endTimeStr: formatTime(new Date(end)),
      };
    }

    // 3. All classes today have concluded
    const tomorrowFirst = sessions
      .filter(isTeachingClass)
      .map((s) => ({ ...s, startTime: new Date(s.start_at).getTime() }))
      .filter((s) => s.startTime > now)
      .sort((a, b) => a.startTime - b.startTime)[0];

    return {
      type: "done_today" as const,
      tomorrowFirst,
    };
  }, [todaySchedule, sessions, now]);

  return (
    <div className="mb-3.5 w-full">
      {hudState.type === "in_progress" && (
        <div className="relative overflow-hidden rounded-2xl border border-cyan/40 bg-gradient-to-r from-cyan/10 via-surface to-surface p-3.5 sm:p-4 shadow-lg shadow-cyan/5 ring-1 ring-cyan/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="relative flex size-3 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan opacity-75" />
                <span className="relative inline-flex size-3 rounded-full bg-cyan" />
              </span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan">
                Class In Progress · {hudState.remainingMins}m remaining
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-dim">
                {hudState.startTimeStr} – {hudState.endTimeStr}
              </span>
              {onNavigateToTimetable && (
                <button
                  type="button"
                  onClick={onNavigateToTimetable}
                  className="inline-flex items-center gap-1 rounded-lg bg-cyan/15 px-2.5 py-1 font-mono text-[10px] font-bold text-cyan hover:bg-cyan/25 transition-all cursor-pointer"
                >
                  Timetable <ChevronRight className="size-3" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="font-display text-base sm:text-lg font-bold text-ink">
              {hudState.session.course_code
                ? `${hudState.session.course_code}: ${hudState.session.course_name || hudState.session.title}`
                : hudState.session.course_name || hudState.session.title}
            </h2>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-dim">
            <div className="flex items-center gap-1.5 font-medium text-ink">
              <MapPin className="size-3.5 text-cyan shrink-0" />
              <span>{hudState.session.classroom || "Academic Block"}</span>
            </div>
            {hudState.session.faculty_name && (
              <div className="flex items-center gap-1.5">
                <User className="size-3.5 text-faint shrink-0" />
                <span>Prof. {hudState.session.faculty_name}</span>
              </div>
            )}
          </div>

          {/* Lecture Progress Indicator */}
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan to-violet transition-all duration-500"
              style={{ width: `${hudState.progress}%` }}
            />
          </div>
        </div>
      )}

      {hudState.type === "upcoming_today" && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-surface to-surface p-3.5 sm:p-4 shadow-sm ring-1 ring-amber-500/15">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex size-2.5 rounded-full bg-amber-400 shrink-0" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500">
                Up Next · Starts in {formatDuration(hudState.diffMins)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-dim">
                {hudState.startTimeStr} – {hudState.endTimeStr}
              </span>
              {onNavigateToTimetable && (
                <button
                  type="button"
                  onClick={onNavigateToTimetable}
                  className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 px-2.5 py-1 font-mono text-[10px] font-bold text-amber-500 hover:bg-amber-500/25 transition-all cursor-pointer"
                >
                  Timetable <ChevronRight className="size-3" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="font-display text-base sm:text-lg font-bold text-ink">
              {hudState.session.course_code
                ? `${hudState.session.course_code}: ${hudState.session.course_name || hudState.session.title}`
                : hudState.session.course_name || hudState.session.title}
            </h2>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-dim">
            <div className="flex items-center gap-1.5 font-medium text-ink">
              <MapPin className="size-3.5 text-amber-400 shrink-0" />
              <span>{hudState.session.classroom || "Academic Block"}</span>
            </div>
            {hudState.session.faculty_name && (
              <div className="flex items-center gap-1.5">
                <User className="size-3.5 text-faint shrink-0" />
                <span>Prof. {hudState.session.faculty_name}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {hudState.type === "done_today" && (
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-surface/80 p-3 sm:p-3.5 shadow-xs backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-xs font-semibold text-ink">
                  Classes completed for today
                </span>
                {hudState.tomorrowFirst && (
                  <p className="text-[11px] text-dim">
                    Next class: <span className="text-ink font-medium">{hudState.tomorrowFirst.course_code ? `${hudState.tomorrowFirst.course_code}: ` : ""}{hudState.tomorrowFirst.course_name || hudState.tomorrowFirst.title}</span> at {formatTime(new Date(hudState.tomorrowFirst.start_at))} in {hudState.tomorrowFirst.classroom || "Academic Block"}
                  </p>
                )}
              </div>
            </div>

            {onNavigateToTimetable && (
              <button
                type="button"
                onClick={onNavigateToTimetable}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 font-mono text-[10px] text-dim hover:text-ink hover:border-cyan/40 transition-all cursor-pointer"
              >
                Full Schedule <ChevronRight className="size-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {hudState.type === "no_classes_today" && (
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-surface/80 p-3 sm:p-3.5 shadow-xs backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-cyan shrink-0" />
              <div>
                <span className="text-xs font-semibold text-ink">
                  No lectures scheduled for today
                </span>
                {hudState.nextFutureSession && (
                  <p className="text-[11px] text-dim">
                    Upcoming: <span className="text-ink font-medium">{hudState.nextFutureSession.course_name || hudState.nextFutureSession.title}</span> on {new Date(hudState.nextFutureSession.start_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at {formatTime(new Date(hudState.nextFutureSession.start_at))}
                  </p>
                )}
              </div>
            </div>

            {onNavigateToTimetable && (
              <button
                type="button"
                onClick={onNavigateToTimetable}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 font-mono text-[10px] text-dim hover:text-ink hover:border-cyan/40 transition-all cursor-pointer"
              >
                Open Timetable <ChevronRight className="size-3" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
