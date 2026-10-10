import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useMotionValue,
  useMotionTemplate,
} from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  GraduationCap,
  MapPin,
  Pencil,
  Sparkles,
  Sun,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { db as supabase } from "@/lib/backend";
import { useAuth } from "@/hooks/use-auth";
import { useBatch } from "@/hooks/use-batch";
import { attendanceQuery, coursesQuery, sessionsQuery, type ClassSession } from "@/lib/batches";
import {
  autoColor,
  buildColorMap,
  isDayOff,
  isTeachingClass,
  sessionColor,
  sessionFullName,
  sessionPeriodLabel,
  subjectFullName,
  FALLBACK_COURSE_COLOR,
} from "@/lib/courses";
import { cleanExamTitle, dayKey, eventMeta, timeLeft, type Deadline } from "@/lib/deadlines";

import { SyllabusDialog } from "@/components/board/SyllabusDialog";
import { courseAttendance, defaultClassDay } from "@/lib/course-attendance";
import { courseComponentsQuery } from "@/lib/grading";
import { creditCatalog, resolveMarks, sessionCredits, sessionSubject } from "@/lib/attendance";
import { IPM1_BATCH_ID } from "@/lib/roster.data";
import { MissAllowance } from "@/components/attendance/MissAllowance";
import { IPM_CLASS_SLOTS, classSlotIndex } from "@/lib/class-slots";
import { classProgress } from "@/lib/class-progress";
import { nextDayBrief } from "@/lib/next-day-brief";
import { AttendanceChoice } from "@/components/attendance/AttendanceChoice";

type Props = {
  now: number;
  onSeeFullTimetable?: () => void;
  onSeeAttendance?: () => void;
  onSeeExams?: () => void;
  deadlines?: Deadline[];
  canManage?: boolean;
  minimal?: boolean;
};

function durationLabel(minutes: number) {
  const whole = Math.max(0, Math.ceil(minutes));
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;
  return hours ? `${hours}h${rest ? ` ${rest}m` : ""}` : `${rest}m`;
}

const clockTimeFmt = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
});

const shortDayFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Asia/Kolkata",
});

export function LiveClassHero({
  now,
  onSeeFullTimetable,
  onSeeExams,
  deadlines = [],
  canManage = false,
  minimal = false,
}: Props) {
  const { batchId, batch, isMember } = useBatch();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [syllabusExam, setSyllabusExam] = useState<Deadline | null>(null);

  const { data: sessions = [], isPending: sessionsLoading } = useQuery(sessionsQuery(batchId));
  const { data: courses = [] } = useQuery(coursesQuery(batchId));
  const { data: components = [] } = useQuery(courseComponentsQuery(batchId));
  const catalog = useMemo(() => creditCatalog(courses, components), [courses, components]);
  const {
    data: marks = [],
    isPending: attendanceLoading,
    isError: attendanceError,
  } = useQuery(attendanceQuery(batchId, isMember || canManage, user?.id, canManage));

  const colorMap = useMemo(() => buildColorMap(courses, sessions), [courses, sessions]);

  const resolvedMine = useMemo(() => resolveMarks(marks, user?.id), [marks, user?.id]);
  const myMarks = useMemo(
    () => new Map([...resolvedMine].map(([id, mark]) => [id, mark.status])),
    [resolvedMine],
  );

  // Attendance toggle mutation
  const toggleAbsent = useMutation({
    mutationFn: async (session: ClassSession) => {
      if (!user) throw new Error("Not logged in");
      if (resolvedMine.get(session.id)?.mark_source === "rep")
        throw new Error("Representative record takes priority");
      const current = myMarks.get(session.id);
      const nextStatus = current === "absent" ? "present" : "absent";

      const { error } = await supabase.from("attendance_marks").upsert(
        {
          session_id: session.id,
          batch_id: session.batch_id,
          user_id: user.id,
          status: nextStatus,
          mark_source: "self",
          marked_by: user.id,
        },
        { onConflict: "session_id,user_id,mark_source" },
      );
      if (error) throw error;
      return { id: session.id, status: nextStatus };
    },
    onSuccess: ({ status }) => {
      queryClient.invalidateQueries({ queryKey: ["attendance", batchId] });
      queryClient.invalidateQueries({ queryKey: ["batch-attendance"] });
      toast.success(status === "absent" ? "Marked as Absent" : "Marked as Present");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update attendance");
    },
  });

  const [manualDay, setManualDay] = useState<{ day: string; offset: number } | null>(null);
  const todayKey = dayKey(new Date(now));
  const offset =
    manualDay?.day === todayKey ? manualDay.offset : minimal ? 0 : defaultClassDay(sessions, now);
  const setOffset = (value: number | ((current: number) => number)) =>
    setManualDay({ day: todayKey, offset: typeof value === "function" ? value(offset) : value });
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const attendanceByCourse = useMemo(
    () => courseAttendance(sessions, marks, user?.id, now),
    [sessions, marks, user?.id, now],
  );
  const reducedMotion = useReducedMotion();
  const pointerX = useMotionValue(50);
  const pointerY = useMotionValue(50);
  const spotlight = useMotionTemplate`radial-gradient(500px circle at ${pointerX}% ${pointerY}%, #65d8ac20, transparent 70%)`;

  const selectedDate = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    return d;
  }, [now, offset]);

  const targetDayKey = useMemo(() => dayKey(selectedDate), [selectedDate]);

  const daySessions = useMemo(() => {
    return sessions
      .filter((s) => dayKey(new Date(s.start_at)) === targetDayKey)
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  }, [sessions, targetDayKey]);

  const classes = useMemo(() => daySessions.filter(isTeachingClass), [daySessions]);
  const dayProgress = classProgress(classes, now);
  const nextBrief = nextDayBrief(sessions, deadlines, now);

  const isWeekendOff = useMemo(() => isDayOff(selectedDate), [selectedDate]);
  const isHoliday = useMemo(() => daySessions.some((s) => s.is_holiday), [daySessions]);

  const liveClass = useMemo(() => {
    if (offset !== 0) return null;
    return (
      classes.find((s) => {
        const a = new Date(s.start_at).getTime();
        const b = new Date(s.end_at).getTime();
        return now >= a && now < b;
      }) || null
    );
  }, [classes, now, offset]);

  const nextClassToday = useMemo(() => {
    if (liveClass) return null;
    return classes.find((s) => new Date(s.start_at).getTime() > now) || null;
  }, [classes, liveClass, now]);

  const nextUpcomingAnyDay = useMemo(() => {
    return (
      sessions
        .filter((s) => isTeachingClass(s) && new Date(s.start_at).getTime() > now)
        .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())[0] || null
    );
  }, [sessions, now]);

  const liveProgress = useMemo(() => {
    if (!liveClass) return { pct: 0, remainingMin: 0 };
    const a = new Date(liveClass.start_at).getTime();
    const b = new Date(liveClass.end_at).getTime();
    const totalMs = Math.max(1, b - a);
    const remainingMs = Math.max(0, b - now);
    const pct = Math.min(100, (remainingMs / totalMs) * 100);
    return {
      pct,
      remainingMin: Math.ceil(remainingMs / 60000),
    };
  }, [liveClass, now]);

  // All upcoming major exams sorted by recency
  const upcomingExams = useMemo(() => {
    return deadlines
      .filter(
        (d) =>
          (d.type === "midterm" || d.type === "endterm" || (d.type === "quiz" && d.is_major)) &&
          new Date(d.due_at).getTime() > now,
      )
      .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());
  }, [deadlines, now]);

  const activeThemeColor = liveClass
    ? (sessionColor(liveClass, colorMap) ?? "#22D3EE")
    : nextClassToday
      ? (sessionColor(nextClassToday, colorMap) ?? "#F59E0B")
      : "#22D3EE";

  const inspected = classes.find((s) => s.id === inspectedId);
  const visibleClasses = classes;
  const slotCards =
    batchId === IPM1_BATCH_ID
      ? [
          ...IPM_CLASS_SLOTS.flatMap<{ session: ClassSession | null; slot: number; time: string }>(
            (slot, index) => {
              const matches = visibleClasses.filter((s) => classSlotIndex(s.start_at) === index);
              return matches.length
                ? matches.map((session) => ({
                    session,
                    slot: index,
                    time: `${slot.start}–${slot.end}`,
                  }))
                : [{ session: null, slot: index, time: `${slot.start}–${slot.end}` }];
            },
          ),
          ...visibleClasses
            .filter((s) => classSlotIndex(s.start_at) === -1)
            .map((session) => ({ session, slot: -1, time: "" })),
        ]
      : visibleClasses.map((session) => ({ session, slot: -1, time: "" }));
  return (
    <motion.section
      aria-label="Current class tracker"
      data-state={liveClass ? "live" : nextClassToday ? "next" : "idle"}
      className={`class-tracker ${minimal ? "class-tracker-minimal" : ""} relative overflow-hidden rounded-2xl border border-border/80 bg-surface/95 p-4 sm:p-5`}
      onPointerMove={(event) => {
        if (reducedMotion || event.pointerType !== "mouse") return;
        const rect = event.currentTarget.getBoundingClientRect();
        pointerX.set(((event.clientX - rect.left) / rect.width) * 100);
        pointerY.set(((event.clientY - rect.top) / rect.height) * 100);
      }}
    >
      {liveClass && (
        <div className="live-class-signal" style={{ color: activeThemeColor }} aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      )}
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ background: spotlight }}
      />
      {/* ── Ambient Radial Glows ── */}
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full blur-[130px] opacity-25 transition-colors duration-700"
        style={{ backgroundColor: activeThemeColor }}
      />
      <div
        className="pointer-events-none absolute -left-24 -bottom-24 h-96 w-96 rounded-full blur-[130px] opacity-15 transition-colors duration-700"
        style={{ backgroundColor: activeThemeColor }}
      />

      {/* ── Top Bar: Day Selector & Live Clock ── */}
      <div className="class-tracker-toolbar relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-4 mb-4">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <div className="flex items-center rounded-2xl bg-surface2/80 p-1 border border-border/80 shadow-xs">
            <button
              type="button"
              onClick={() => {
                setOffset((o) => o - 1);
                setInspectedId(null);
              }}
              aria-label="Previous day"
              className="flex size-8 items-center justify-center rounded-xl text-dim transition-colors hover:bg-surface hover:text-ink cursor-pointer"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="px-3 font-sans text-xs sm:text-sm font-bold text-ink">
              {offset === 0
                ? "Today"
                : offset === 1
                  ? "Tomorrow"
                  : offset === -1
                    ? "Yesterday"
                    : shortDayFmt.format(selectedDate)}
            </span>
            {sessionsLoading
              ? "Loading classes…"
              : offset !== 0 && (
                  <button
                    type="button"
                    onClick={() => setOffset(0)}
                    className="rounded-lg bg-cyan/15 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan hover:bg-cyan/25 cursor-pointer"
                  >
                    Today
                  </button>
                )}
            <button
              type="button"
              onClick={() => {
                setOffset((o) => o + 1);
                setInspectedId(null);
              }}
              aria-label="Next day"
              className="flex size-8 items-center justify-center rounded-xl text-dim transition-colors hover:bg-surface hover:text-ink cursor-pointer"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          {!minimal && offset !== 1 && (
            <button
              type="button"
              onClick={() => {
                setOffset(1);
                setInspectedId(null);
              }}
              className="rounded-lg px-2 py-1 text-xs text-cyan hover:bg-cyan/10"
            >
              Tomorrow
            </button>
          )}
          {!minimal &&
            (liveClass ? (
              <span className="inline-flex items-center gap-2 rounded-xl bg-rose/15 px-3 py-1 text-xs font-bold text-rose border border-rose/30 shadow-xs shadow-rose/20">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-rose" />
                </span>
                Live now
              </span>
            ) : nextClassToday ? (
              <span className="inline-flex items-center gap-2 rounded-xl bg-cyan/15 px-3 py-1 text-xs font-bold text-cyan border border-cyan/30">
                <Clock className="size-3.5 text-cyan" />
                Next Class at {clockTimeFmt.format(new Date(nextClassToday.start_at))}
              </span>
            ) : isWeekendOff ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-cyan/10 px-3 py-1 text-xs font-semibold text-cyan">
                <Sun className="size-3.5" /> Weekend Off
              </span>
            ) : isHoliday ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-violet/15 px-3 py-1 text-xs font-semibold text-violet">
                <Sparkles className="size-3.5" /> Institute Holiday
              </span>
            ) : (
              <span className="rounded-xl bg-surface2 px-3 py-1 text-xs font-medium text-dim border border-border">
                {classes.length} period{classes.length === 1 ? "" : "s"} scheduled
              </span>
            ))}
        </div>

        {!minimal && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 font-mono text-xs font-semibold text-dim bg-surface2/60 border border-border px-3 py-1.5 rounded-xl">
              <Clock className="size-3.5 text-cyan" />
              <span>{clockTimeFmt.format(new Date(now))}</span>
            </div>
            {onSeeFullTimetable && (
              <button
                type="button"
                onClick={onSeeFullTimetable}
                className="inline-flex items-center gap-1.5 rounded-xl bg-cyan/12 border border-cyan/30 px-3.5 py-1.5 text-xs font-bold text-cyan hover:bg-cyan/20 transition-all cursor-pointer"
              >
                <CalendarClock className="size-4" />
                <span>Timetable</span>
              </button>
            )}
          </div>
        )}
        {minimal && !sessionsLoading && (
          <span className="text-sm font-semibold text-dim">
            {dayProgress.done} done · {dayProgress.remaining} to go
          </span>
        )}
      </div>

      {/* ── Centerpiece: Massive Animated Tracker ── */}
      {minimal ? (
        <div className="class-tracker-feature relative z-10 space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display font-bold text-ink">
              {sessionsLoading
                ? "Loading classes…"
                : dayProgress.state === "class"
                  ? sessionPeriodLabel(dayProgress.session!)
                  : dayProgress.state === "break"
                    ? "Break"
                    : dayProgress.state === "over"
                      ? "Day over"
                      : dayProgress.state === "upcoming"
                        ? sessionPeriodLabel(dayProgress.session!)
                        : "No classes scheduled"}
            </h2>
            {dayProgress.session && (
              <span className="font-mono text-sm font-semibold text-cyan">
                {durationLabel(dayProgress.minutesLeft)}{" "}
                {dayProgress.state === "class" || dayProgress.state === "break" ? "left" : "to go"}
              </span>
            )}
            {offset === 0 &&
              !sessionsLoading &&
              (dayProgress.state === "over" || dayProgress.state === "empty") && (
                <div className="min-w-0 rounded-xl border border-cyan/20 bg-cyan/5 px-3 py-2 text-sm sm:max-w-lg">
                  <div className="flex flex-wrap items-center gap-2 font-semibold text-cyan">
                    <span>
                      {nextBrief.day === nextBrief.tomorrow
                        ? "Tomorrow"
                        : `Tomorrow clear · ${shortDayFmt.format(new Date(`${nextBrief.day}T12:00:00+05:30`))}`}
                    </span>
                    {nextBrief.classes.length > 0 && (
                      <span className="text-ink">
                        {nextBrief.classes.length}{" "}
                        {nextBrief.classes.length === 1 ? "class" : "classes"} ·{" "}
                        {clockTimeFmt.format(new Date(nextBrief.classes[0]!.start_at))}–
                        {clockTimeFmt.format(new Date(nextBrief.classes.at(-1)!.end_at))}
                      </span>
                    )}
                  </div>
                  {nextBrief.classes.length > 0 && (
                    <p className="mt-1 break-words text-dim">
                      {nextBrief.classes.map(sessionPeriodLabel).join(" → ")}
                    </p>
                  )}
                  {nextBrief.events.slice(0, 2).map((event) => (
                    <p key={event.id} className="mt-1 text-ink">
                      <span className={eventMeta(event.type).text}>
                        {eventMeta(event.type).label}
                      </span>{" "}
                      · {subjectFullName(event.subject || event.title)}
                    </p>
                  ))}
                  {nextBrief.classes.length === 0 && nextBrief.events.length === 0 && (
                    <p className="mt-1 text-dim">No classes or deadlines scheduled.</p>
                  )}
                </div>
              )}
          </div>
          {dayProgress.state === "break" && (
            <p className="text-sm text-dim">Next: {sessionPeriodLabel(dayProgress.session!)}</p>
          )}
          {(dayProgress.state === "class" || dayProgress.state === "break") && (
            <div
              role="progressbar"
              aria-label={dayProgress.state === "class" ? "Class progress" : "Break progress"}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(dayProgress.elapsed)}
              aria-valuetext={`${durationLabel(dayProgress.minutesLeft)} left`}
              className="relative h-2.5 rounded-full bg-surface2"
            >
              <motion.div
                initial={false}
                animate={{ width: `${dayProgress.elapsed}%` }}
                transition={{ duration: reducedMotion ? 0 : 0.8, ease: "linear" }}
                className="class-time-remaining relative h-full rounded-full bg-cyan"
              >
                <span className="class-time-shimmer rounded-full" aria-hidden="true" />
                <span className="absolute -right-1 top-1/2 size-3 -translate-y-1/2 rounded-full bg-cyan ring-2 ring-surface shadow-[0_0_12px_var(--cyan)]" />
              </motion.div>
            </div>
          )}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {liveClass ? (
            <motion.div
              key="live-class"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="class-tracker-feature relative z-10 py-4 sm:py-6 space-y-4"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span
                      className="size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: activeThemeColor }}
                    />
                    {liveClass.course_code && (
                      <span
                        className="rounded-lg px-2.5 py-1 font-mono text-xs font-extrabold tracking-wider"
                        style={{
                          backgroundColor: `${activeThemeColor}20`,
                          color: activeThemeColor,
                          border: `1px solid ${activeThemeColor}40`,
                        }}
                      >
                        {liveClass.course_code}
                      </span>
                    )}
                    <span className="font-mono text-xs font-bold text-dim bg-surface2 px-2.5 py-1 rounded-lg border border-border">
                      {clockTimeFmt.format(new Date(liveClass.start_at))} –{" "}
                      {clockTimeFmt.format(new Date(liveClass.end_at))}
                    </span>
                  </div>

                  {/* Massive Headline Title: Full course name, never clipped */}
                  <h2 className="font-display text-xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-ink break-words leading-tight">
                    {subjectFullName(
                      liveClass.course_name || liveClass.course_code || liveClass.title,
                    ) || sessionFullName(liveClass)}
                  </h2>

                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-dim pt-1">
                    {liveClass.classroom && (
                      <span className="font-semibold text-ink flex items-center gap-1.5 bg-surface2/60 border border-border px-2.5 sm:px-3 py-1 rounded-xl">
                        <MapPin className="size-3.5 sm:size-4 text-cyan shrink-0" />
                        Room {liveClass.classroom}
                      </span>
                    )}
                    {liveClass.faculty_name && (
                      <span className="flex items-center gap-1.5 bg-surface2/60 border border-border px-2.5 sm:px-3 py-1 rounded-xl">
                        <User className="size-3.5 sm:size-4 text-cyan shrink-0" />
                        {liveClass.faculty_name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Attendance Toggle Button */}
                <div className="shrink-0 pt-2 lg:pt-0">
                  <AttendanceChoice
                    absent={myMarks.get(liveClass.id) === "absent"}
                    authoritative={resolvedMine.get(liveClass.id)?.mark_source === "rep"}
                    label={sessionPeriodLabel(liveClass)}
                    disabled={
                      toggleAbsent.isPending ||
                      attendanceLoading ||
                      attendanceError ||
                      !user ||
                      !isMember
                    }
                    onChange={() => toggleAbsent.mutate(liveClass)}
                  />
                </div>
              </div>

              {/* Progress Bar & Countdown */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs font-mono font-bold text-dim">
                  <span>{durationLabel(liveProgress.remainingMin)} left</span>
                  <span>Ends {clockTimeFmt.format(new Date(liveClass.end_at))}</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface2 border border-border">
                  <motion.div
                    className="class-time-remaining relative h-full overflow-hidden rounded-full transition-all duration-700"
                    style={{
                      width: `${liveProgress.pct}%`,
                      backgroundColor: activeThemeColor,
                    }}
                  >
                    <span className="class-time-shimmer" aria-hidden="true" />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          ) : nextClassToday ? (
            <motion.div
              key="next-class"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="class-tracker-feature relative z-10 py-4 sm:py-6 space-y-3"
            >
              <div className="flex flex-wrap items-center gap-2.5">
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: activeThemeColor }}
                />
                <span className="font-mono text-xs font-bold text-dim bg-surface2 px-2.5 py-1 rounded-lg border border-border">
                  {clockTimeFmt.format(new Date(nextClassToday.start_at))} –{" "}
                  {clockTimeFmt.format(new Date(nextClassToday.end_at))}
                </span>
                <span className="rounded-xl bg-cyan/15 px-3 py-1 font-mono text-xs font-bold text-cyan border border-cyan/30">
                  Starts in {timeLeft(nextClassToday.start_at, now)}
                </span>
                {nextClassToday.classroom && (
                  <span className="font-semibold text-xs text-ink flex items-center gap-1 bg-surface2 px-2.5 py-1 rounded-lg border border-border">
                    <MapPin className="size-3 text-cyan" /> Room {nextClassToday.classroom}
                  </span>
                )}
              </div>

              {/* Huge Headline Title: Full course name, never clipped */}
              <h2 className="font-display text-xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-ink break-words leading-tight">
                {subjectFullName(
                  nextClassToday.course_name || nextClassToday.course_code || nextClassToday.title,
                ) || sessionFullName(nextClassToday)}
              </h2>

              {nextClassToday.faculty_name && (
                <p className="font-sans text-xs sm:text-sm text-dim flex items-center gap-1.5">
                  <User className="size-4 text-dim" />
                  Faculty:{" "}
                  <strong className="text-ink font-semibold">{nextClassToday.faculty_name}</strong>
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="no-classes"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="class-tracker-feature relative z-10 py-6 sm:py-8 text-center space-y-2"
            >
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-cyan/10 text-cyan mb-2">
                <Sparkles className="size-7" />
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
                {sessionsLoading
                  ? "Loading classes…"
                  : offset !== 0
                    ? `${classes.length} classes · ${shortDayFmt.format(selectedDate)}`
                    : classes.length > 0
                      ? classes.every((s) => new Date(s.end_at).getTime() <= now)
                        ? "Done for today"
                        : "Today's classes"
                      : "No classes today"}
              </h2>
              {nextUpcomingAnyDay && (
                <p className="font-sans text-xs sm:text-sm text-dim">
                  Next scheduled class:{" "}
                  <strong className="text-ink font-semibold">
                    {subjectFullName(
                      nextUpcomingAnyDay.course_name || nextUpcomingAnyDay.course_code,
                    ) || sessionFullName(nextUpcomingAnyDay)}
                  </strong>{" "}
                  ({shortDayFmt.format(new Date(nextUpcomingAnyDay.start_at))})
                  <span className="block mt-2 font-semibold text-cyan">
                    Starts in {timeLeft(nextUpcomingAnyDay.start_at, now)}
                  </span>
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Today's remaining classes stay visible; completed periods are optional. */}
      {classes.length > 0 && (
        <div className="class-tracker-schedule relative z-10 border-t border-border/60 pt-5 mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-dim">
              {classes.length} classes
            </span>
          </div>

          <div className="class-card-grid grid grid-cols-1 gap-3 pt-2 pb-1">
            {slotCards.map(({ session: s, slot, time }) => {
              if (!s)
                return (
                  <div
                    key={`empty-${slot}`}
                    className="class-slot-empty rounded-xl border border-dashed border-border p-3 text-dim"
                  >
                    <span className="text-xs font-semibold">
                      Slot {slot + 1} · {time}
                    </span>
                    <p className="mt-2 text-sm">No class</p>
                  </div>
                );
              const color = sessionColor(s, colorMap) ?? FALLBACK_COURSE_COLOR;
              const isLive = liveClass?.id === s.id;
              const isPast = new Date(s.end_at).getTime() <= now;
              const periodSubject = sessionPeriodLabel(s);
              const mark = myMarks.get(s.id);
              const record = attendanceByCourse.get(sessionSubject(s));

              return (
                <motion.article
                  key={s.id}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.97 }}
                  className={`relative flex flex-col justify-between rounded-xl sm:rounded-2xl p-3 sm:p-4 min-w-0 border transition-all ${
                    isLive
                      ? "border-cyan/80 bg-cyan/[0.08] shadow-lg shadow-cyan/10 ring-1 ring-cyan/40"
                      : isPast
                        ? "border-border/60 bg-surface2/30 opacity-60 grayscale"
                        : "border-border bg-surface hover:border-border/90 hover:shadow-xs"
                  }`}
                >
                  <span
                    className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl"
                    style={{ backgroundColor: color }}
                  />

                  <div className="space-y-1 pl-1">
                    {slot >= 0 && (
                      <div className="text-xs font-semibold text-dim">Slot {slot + 1}</div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-dim">
                        {clockTimeFmt.format(new Date(s.start_at))}
                      </span>
                      {isLive ? (
                        <span className="rounded-md bg-cyan/15 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan">
                          Active
                        </span>
                      ) : isPast ? (
                        <span className="font-mono text-[10px] text-faint">Done</span>
                      ) : (
                        <span className="font-mono text-xs text-dim">
                          in {timeLeft(s.start_at, now)}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      aria-expanded={inspectedId === s.id}
                      onClick={() => setInspectedId((id) => (id === s.id ? null : s.id))}
                      className="min-w-0 text-left font-display text-base font-bold text-ink break-words pt-0.5 hover:text-cyan"
                    >
                      {periodSubject}
                    </button>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-dim pt-1">
                      {s.classroom && <span>Room {s.classroom}</span>}
                      {s.faculty_name && <span>· {s.faculty_name}</span>}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    {isLive ? (
                      <svg
                        className="size-8 shrink-0 -rotate-90"
                        viewBox="0 0 36 36"
                        aria-hidden="true"
                      >
                        <circle
                          cx="18"
                          cy="18"
                          r="15"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          className="text-border"
                        />
                        <motion.circle
                          cx="18"
                          cy="18"
                          r="15"
                          fill="none"
                          stroke={color}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray="94.25"
                          initial={false}
                          animate={{
                            strokeDashoffset:
                              94.25 *
                              (1 -
                                (isPast
                                  ? 0
                                  : isLive
                                    ? Math.max(
                                        0,
                                        (new Date(s.end_at).getTime() - now) /
                                          (new Date(s.end_at).getTime() -
                                            new Date(s.start_at).getTime()),
                                      )
                                    : 1)),
                          }}
                        />
                      </svg>
                    ) : !isPast ? (
                      <span className="countdown-beat" style={{ color }} aria-hidden="true">
                        <i />
                        <i />
                        <i />
                        <i />
                      </span>
                    ) : (
                      <Check className="size-5 text-dim" />
                    )}
                    <span className="text-sm font-semibold tabular-nums">
                      {isPast
                        ? "Finished"
                        : isLive
                          ? `${durationLabel(Math.ceil((new Date(s.end_at).getTime() - now) / 60000))} left`
                          : `Starts in ${timeLeft(s.start_at, now)}`}
                    </span>
                  </div>
                  {isLive && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface2">
                      <motion.div
                        className="class-time-remaining relative h-full overflow-hidden rounded-full"
                        style={{ backgroundColor: color }}
                        initial={false}
                        animate={{ width: `${liveProgress.pct}%` }}
                      >
                        <span className="class-time-shimmer" aria-hidden="true" />
                      </motion.div>
                    </div>
                  )}
                  <div className="mt-3 pt-2 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-mono text-[10px] text-faint">
                      {minimal &&
                      (isMember || canManage) &&
                      user &&
                      !attendanceLoading &&
                      !attendanceError
                        ? `${record?.absent ?? 0} missed${mark === "absent" && !isPast ? " · 1 pending" : ""}`
                        : "Class"}
                    </span>
                    {(isMember || canManage) && user && (
                      <AttendanceChoice
                        authoritative={resolvedMine.get(s.id)?.mark_source === "rep"}
                        muted={isPast}
                        absent={mark === "absent"}
                        label={periodSubject}
                        disabled={toggleAbsent.isPending || attendanceLoading || attendanceError}
                        onChange={() => toggleAbsent.mutate(s)}
                      />
                    )}
                  </div>
                  {batchId === IPM1_BATCH_ID && !attendanceLoading && !attendanceError && (
                    <div className="mt-2">
                      <MissAllowance
                        course={sessionSubject(s)}
                        credits={sessionCredits(s, catalog)}
                        missed={record?.absent ?? 0}
                      />
                    </div>
                  )}
                </motion.article>
              );
            })}
          </div>
        </div>
      )}

      <AnimatePresence>
        {inspected && (
          <motion.div
            className="class-inspected"
            key={inspected.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <strong>{sessionFullName(inspected)}</strong>
            <span>
              {clockTimeFmt.format(new Date(inspected.start_at))} –{" "}
              {clockTimeFmt.format(new Date(inspected.end_at))}
              {inspected.classroom && ` · ${inspected.classroom}`}
              {inspected.faculty_name && ` · ${inspected.faculty_name}`}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Upcoming Examinations & Verified Syllabus Scope Section ── */}
      {!minimal && (
        <div className="relative z-10 border-t border-border/70 pt-6 mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-xl bg-cyan/15 text-cyan border border-cyan/30">
                <GraduationCap className="size-4" />
              </span>
              <div>
                <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
                  <span>Upcoming Exams</span>
                  {upcomingExams.length > 0 && (
                    <span className="rounded-full bg-cyan/15 border border-cyan/30 px-2 py-0.5 text-[10px] font-bold text-cyan">
                      {upcomingExams.length} Scheduled
                    </span>
                  )}
                </h3>
              </div>
            </div>

            {onSeeExams && (
              <button
                type="button"
                onClick={onSeeExams}
                className="font-sans text-xs font-semibold text-cyan hover:underline flex items-center gap-1 cursor-pointer"
              >
                View all exams <ArrowRight className="size-3" />
              </button>
            )}
          </div>

          {upcomingExams.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-surface2/30 p-5 text-center">
              <p className="font-sans text-xs text-dim">
                No upcoming midterms or major exams scheduled at this moment.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
              {upcomingExams.slice(0, 3).map((exam) => {
                const examColor = autoColor(exam.subject || exam.title);
                const hasSyllabus = Boolean(exam.notes && exam.notes.trim());

                return (
                  <div
                    key={exam.id}
                    className="flex flex-col justify-between rounded-2xl border border-border/80 bg-surface/90 p-4 shadow-xs hover:border-cyan/40 transition-all space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="rounded-lg px-2.5 py-0.5 font-mono text-[11px] font-bold"
                          style={{
                            color: examColor,
                            backgroundColor: `${examColor}15`,
                            border: `1px solid ${examColor}30`,
                          }}
                        >
                          {exam.subject_code || exam.subject}
                        </span>
                        <span className="rounded-md bg-surface2 px-2 py-0.5 font-sans text-[11px] font-bold text-cyan border border-border">
                          {timeLeft(exam.due_at, now)}
                        </span>
                      </div>

                      <h4 className="font-display text-sm font-bold text-ink break-words">
                        {cleanExamTitle(exam.title, exam.subject)}
                      </h4>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-dim pt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3 text-cyan" />
                          {shortDayFmt.format(new Date(exam.due_at))}
                        </span>
                        {exam.location && (
                          <span className="flex items-center gap-1 text-ink font-medium">
                            <MapPin className="size-3 text-rose" />
                            {exam.location}
                          </span>
                        )}
                      </div>

                      {/* Syllabus Scope Preview */}
                      <div className="rounded-xl border border-border/70 bg-surface2/40 p-2.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-display text-[10px] font-bold uppercase tracking-wider text-dim flex items-center gap-1">
                            <BookOpen className="size-3 text-cyan" />
                            <span>Syllabus & Scope</span>
                          </span>
                          {hasSyllabus ? (
                            <span className="text-[10px] font-semibold text-emerald-500">
                              ✓ Verified
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-amber">Pending</span>
                          )}
                        </div>
                        <p className="font-sans text-xs text-ink/90 line-clamp-2 leading-relaxed">
                          {hasSyllabus ? exam.notes : "Syllabus not added yet."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                      <button
                        type="button"
                        onClick={() => setSyllabusExam(exam)}
                        className="inline-flex items-center gap-1.5 font-sans text-xs font-semibold text-cyan hover:underline cursor-pointer"
                      >
                        <BookOpen className="size-3.5" />
                        <span>{hasSyllabus ? "Read Syllabus" : "View Details"}</span>
                      </button>

                      {canManage && (
                        <button
                          type="button"
                          onClick={() => setSyllabusExam(exam)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface2 px-2 py-1 font-sans text-[11px] font-medium text-dim hover:text-ink hover:border-cyan/40 transition-colors cursor-pointer"
                        >
                          <Pencil className="size-3" />
                          <span>{hasSyllabus ? "Edit Syllabus" : "+ Add Syllabus"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Bottom Timetable Shortcut ── */}
      {!minimal && onSeeFullTimetable && (
        <div className="relative z-10 mt-4 flex items-center justify-end border-t border-border/50 pt-3 text-xs">
          <button
            type="button"
            onClick={onSeeFullTimetable}
            className="flex items-center gap-1.5 font-semibold text-cyan hover:text-cyan/80 transition-colors cursor-pointer"
          >
            <span>Open Interactive Timetable</span>
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      )}

      {/* ── Syllabus Dialog ── */}
      <SyllabusDialog
        deadline={syllabusExam}
        isOpen={Boolean(syllabusExam)}
        onClose={() => setSyllabusExam(null)}
        canManage={Boolean(canManage)}
      />
    </motion.section>
  );
}
