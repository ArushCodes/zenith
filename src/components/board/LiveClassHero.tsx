import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
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
  X,
} from "lucide-react";
import { toast } from "sonner";
import { db as supabase } from "@/lib/backend";
import { useAuth } from "@/hooks/use-auth";
import { useBatch } from "@/hooks/use-batch";
import {
  attendanceQuery,
  coursesQuery,
  sessionsQuery,
  type ClassSession,
} from "@/lib/batches";
import {
  autoColor,
  buildColorMap,
  isAcademicEvent,
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

type Props = {
  now: number;
  onSeeFullTimetable?: () => void;
  onSeeExams?: () => void;
  deadlines?: Deadline[];
  canManage?: boolean;
};

const clockTimeFmt = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

const shortDayFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

export function LiveClassHero({
  now,
  onSeeFullTimetable,
  onSeeExams,
  deadlines = [],
  canManage = false,
}: Props) {
  const { batchId, batch, isMember } = useBatch();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [syllabusExam, setSyllabusExam] = useState<Deadline | null>(null);

  const { data: sessions = [] } = useQuery(sessionsQuery(batchId));
  const { data: courses = [] } = useQuery(coursesQuery(batchId));
  const { data: marks = [] } = useQuery(attendanceQuery(batchId, isMember));

  const colorMap = useMemo(
    () => buildColorMap(courses, sessions),
    [courses, sessions],
  );

  // Self attendance marks mapped by session ID
  const myMarks = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of marks) {
      if (m.user_id === user?.id && m.mark_source === "self") {
        map.set(m.session_id, m.status);
      }
    }
    return map;
  }, [marks, user?.id]);

  // Attendance toggle mutation
  const toggleAbsent = useMutation({
    mutationFn: async (session: ClassSession) => {
      if (!user) throw new Error("Not logged in");
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
    onError: (err: any) => {
      toast.error(err.message || "Failed to update attendance");
    },
  });

  const [offset, setOffset] = useState(0);

  const selectedDate = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    return d;
  }, [now, offset]);

  const targetDayKey = useMemo(() => dayKey(selectedDate), [selectedDate]);

  const daySessions = useMemo(() => {
    return sessions
      .filter((s) => dayKey(new Date(s.start_at)) === targetDayKey)
      .sort(
        (a, b) =>
          new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
      );
  }, [sessions, targetDayKey]);

  const classes = useMemo(
    () => daySessions.filter(isTeachingClass),
    [daySessions],
  );

  const isWeekendOff = useMemo(() => isDayOff(selectedDate), [selectedDate]);
  const isHoliday = useMemo(
    () => daySessions.some(isAcademicEvent),
    [daySessions],
  );

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
    if (offset !== 0 || liveClass) return null;
    return (
      classes.find((s) => new Date(s.start_at).getTime() > now) || null
    );
  }, [classes, liveClass, now, offset]);

  const nextUpcomingAnyDay = useMemo(() => {
    return (
      sessions
        .filter((s) => isTeachingClass(s) && new Date(s.start_at).getTime() > now)
        .sort(
          (a, b) =>
            new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
        )[0] || null
    );
  }, [sessions, now]);

  const liveProgress = useMemo(() => {
    if (!liveClass) return { pct: 0, remainingMin: 0 };
    const a = new Date(liveClass.start_at).getTime();
    const b = new Date(liveClass.end_at).getTime();
    const totalMs = Math.max(1, b - a);
    const elapsedMs = Math.max(0, now - a);
    const remainingMs = Math.max(0, b - now);
    const pct = Math.min(100, Math.round((elapsedMs / totalMs) * 100));
    return {
      pct,
      remainingMin: Math.round(remainingMs / 60000),
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
    ? sessionColor(liveClass, colorMap) ?? "#22D3EE"
    : nextClassToday
    ? sessionColor(nextClassToday, colorMap) ?? "#F59E0B"
    : "#22D3EE";

  return (
    <section className="relative mb-6 sm:mb-8 overflow-hidden rounded-[28px] sm:rounded-[36px] border border-border/80 bg-surface/95 p-6 sm:p-8 md:p-10 shadow-2xl backdrop-blur-2xl transition-all duration-300">
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
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-2xl bg-surface2/80 p-1 border border-border/80 shadow-xs">
            <button
              type="button"
              onClick={() => setOffset((o) => o - 1)}
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
            {offset !== 0 && (
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
              onClick={() => setOffset((o) => o + 1)}
              aria-label="Next day"
              className="flex size-8 items-center justify-center rounded-xl text-dim transition-colors hover:bg-surface hover:text-ink cursor-pointer"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          {liveClass ? (
            <span className="inline-flex items-center gap-2 rounded-xl bg-rose/15 px-3 py-1 text-xs font-bold text-rose border border-rose/30 shadow-xs shadow-rose/20">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-rose" />
              </span>
              Live Class in Session
            </span>
          ) : nextClassToday ? (
            <span className="inline-flex items-center gap-2 rounded-xl bg-amber/15 px-3 py-1 text-xs font-bold text-amber border border-amber/30">
              <Clock className="size-3.5 text-amber" />
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
          )}
        </div>

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
              <span className="hidden sm:inline">Full Timetable</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Centerpiece: Massive Animated Tracker ── */}
      <AnimatePresence mode="wait">
        {liveClass ? (
          <motion.div
            key="live-class"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 py-4 sm:py-6 space-y-4"
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
                    {clockTimeFmt.format(new Date(liveClass.start_at))} – {clockTimeFmt.format(new Date(liveClass.end_at))}
                  </span>
                </div>

                {/* Massive Headline Title: Full course name, never clipped */}
                <h2 className="font-display text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-ink break-words leading-tight">
                  {subjectFullName(liveClass.course_name || liveClass.course_code || liveClass.title) || sessionFullName(liveClass)}
                </h2>

                <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-dim pt-1">
                  {liveClass.classroom && (
                    <span className="font-semibold text-ink flex items-center gap-1.5 bg-surface2/60 border border-border px-3 py-1 rounded-xl">
                      <MapPin className="size-4 text-cyan" />
                      Room {liveClass.classroom}
                    </span>
                  )}
                  {liveClass.faculty_name && (
                    <span className="flex items-center gap-1.5 bg-surface2/60 border border-border px-3 py-1 rounded-xl">
                      <User className="size-4 text-amber" />
                      {liveClass.faculty_name}
                    </span>
                  )}
                </div>
              </div>

              {/* Attendance Toggle Button */}
              <div className="shrink-0 pt-2 lg:pt-0">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={() => toggleAbsent.mutate(liveClass)}
                  disabled={toggleAbsent.isPending}
                  className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-extrabold shadow-lg transition-all cursor-pointer ${
                    myMarks.get(liveClass.id) === "absent"
                      ? "bg-rose text-white shadow-rose/25 hover:bg-rose/90"
                      : "bg-emerald-500 text-white shadow-emerald-500/25 hover:bg-emerald-500/90"
                  }`}
                >
                  {myMarks.get(liveClass.id) === "absent" ? (
                    <>
                      <X className="size-4 stroke-[3]" /> Marked Absent (Tap to mark present)
                    </>
                  ) : (
                    <>
                      <Check className="size-4 stroke-[3]" /> Attending Now (Self-Marked)
                    </>
                  )}
                </motion.button>
              </div>
            </div>

            {/* Progress Bar & Countdown */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs font-mono font-bold text-dim">
                <span>{liveProgress.remainingMin} mins remaining in this period</span>
                <span>{liveProgress.pct}% completed</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface2 border border-border">
                <motion.div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${liveProgress.pct}%`,
                    backgroundColor: activeThemeColor,
                  }}
                />
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
            className="relative z-10 py-4 sm:py-6 space-y-3"
          >
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className="size-2.5 rounded-full shrink-0"
                style={{ backgroundColor: activeThemeColor }}
              />
              <span className="font-mono text-xs font-bold text-dim bg-surface2 px-2.5 py-1 rounded-lg border border-border">
                {clockTimeFmt.format(new Date(nextClassToday.start_at))} – {clockTimeFmt.format(new Date(nextClassToday.end_at))}
              </span>
              <span className="rounded-xl bg-amber/15 px-3 py-1 font-mono text-xs font-bold text-amber border border-amber/30">
                Starts in {timeLeft(nextClassToday.start_at, now)}
              </span>
              {nextClassToday.classroom && (
                <span className="font-semibold text-xs text-ink flex items-center gap-1 bg-surface2 px-2.5 py-1 rounded-lg border border-border">
                  <MapPin className="size-3 text-cyan" /> Room {nextClassToday.classroom}
                </span>
              )}
            </div>

            {/* Huge Headline Title: Full course name, never clipped */}
            <h2 className="font-display text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-ink break-words leading-tight">
              {subjectFullName(nextClassToday.course_name || nextClassToday.course_code || nextClassToday.title) || sessionFullName(nextClassToday)}
            </h2>

            {nextClassToday.faculty_name && (
              <p className="font-sans text-xs sm:text-sm text-dim flex items-center gap-1.5">
                <User className="size-4 text-dim" />
                Faculty: <strong className="text-ink font-semibold">{nextClassToday.faculty_name}</strong>
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
            className="relative z-10 py-6 sm:py-8 text-center space-y-2"
          >
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-cyan/10 text-cyan mb-2">
              <Sparkles className="size-7" />
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
              {classes.length > 0 ? "All classes wrapped for today" : "No classes scheduled today"}
            </h2>
            {nextUpcomingAnyDay && (
              <p className="font-sans text-xs sm:text-sm text-dim">
                Next scheduled class: <strong className="text-ink font-semibold">{subjectFullName(nextUpcomingAnyDay.course_name || nextUpcomingAnyDay.course_code) || sessionFullName(nextUpcomingAnyDay)}</strong> ({shortDayFmt.format(new Date(nextUpcomingAnyDay.start_at))})
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Today's Schedule Glance (Roster of Periods) — Zero Clipping ── */}
      {classes.length > 0 && (
        <div className="relative z-10 border-t border-border/60 pt-5 mt-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-dim">
              Today's Schedule ({classes.length} Period{classes.length === 1 ? "" : "s"})
            </span>
          </div>

          <div className="flex items-stretch gap-3 overflow-x-auto pb-2 scrollbar-none">
            {classes.map((s) => {
              const color = sessionColor(s, colorMap) ?? FALLBACK_COURSE_COLOR;
              const isLive = liveClass?.id === s.id;
              const isPast = new Date(s.end_at).getTime() <= now;
              const periodSubject = sessionPeriodLabel(s);
              const mark = myMarks.get(s.id);

              return (
                <div
                  key={s.id}
                  className={`relative flex flex-col justify-between rounded-2xl p-4 min-w-[210px] sm:min-w-[240px] shrink-0 border transition-all ${
                    isLive
                      ? "border-cyan/80 bg-cyan/[0.08] shadow-lg shadow-cyan/10 ring-1 ring-cyan/40"
                      : isPast
                      ? "border-border/60 bg-surface2/30 opacity-75"
                      : "border-border bg-surface hover:border-border/90 hover:shadow-xs"
                  }`}
                >
                  <span
                    className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl"
                    style={{ backgroundColor: color }}
                  />

                  <div className="space-y-1 pl-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-dim">
                        {clockTimeFmt.format(new Date(s.start_at))}
                      </span>
                      {isLive ? (
                        <span className="rounded-md bg-cyan/15 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan">
                          Active
                        </span>
                      ) : isPast ? (
                        <span className="font-mono text-[10px] text-faint">
                          Done
                        </span>
                      ) : null}
                    </div>

                    <p className="font-display text-sm font-bold text-ink whitespace-nowrap pt-0.5">
                      {periodSubject}
                    </p>

                    <div className="flex items-center gap-2 text-[11px] text-dim pt-1">
                      {s.classroom && <span>Room {s.classroom}</span>}
                      {s.faculty_name && <span>· {s.faculty_name}</span>}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                    <span className="font-mono text-[10px] text-faint">
                      {s.course_code || "Class"}
                    </span>
                    {mark === "absent" ? (
                      <span className="font-mono text-[10px] font-bold text-rose">Absent</span>
                    ) : mark === "present" ? (
                      <span className="font-mono text-[10px] font-bold text-emerald-500">Present</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Upcoming Examinations & Verified Syllabus Scope Section ── */}
      <div className="relative z-10 border-t border-border/70 pt-6 mt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-xl bg-cyan/15 text-cyan border border-cyan/30">
              <GraduationCap className="size-4" />
            </span>
            <div>
              <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
                <span>Upcoming Examinations & Verified Syllabus</span>
                {upcomingExams.length > 0 && (
                  <span className="rounded-full bg-cyan/15 border border-cyan/30 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan">
                    {upcomingExams.length} Scheduled
                  </span>
                )}
              </h3>
              <p className="font-sans text-xs text-dim">
                Curriculum coverage, test venue, and revision syllabus scope
              </p>
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
                          <span className="text-[10px] font-medium text-amber">
                            Pending
                          </span>
                        )}
                      </div>
                      <p className="font-sans text-xs text-ink/90 line-clamp-2 leading-relaxed">
                        {hasSyllabus
                          ? exam.notes
                          : "No syllabus details posted yet. Course Reps can add syllabus below."}
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

      {/* ── Bottom Status Strip: Term & Timetable Shortcut ── */}
      <div className="relative z-10 mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-5 text-xs text-dim">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink">
            {batch ? `${batch.programme_name} · ${batch.name}` : "Trimester 1 (2026)"}
          </span>
          <span className="text-dim">· Verified Academic Tracker</span>
        </div>

        {onSeeFullTimetable && (
          <button
            type="button"
            onClick={onSeeFullTimetable}
            className="flex items-center gap-1 font-sans text-xs font-semibold text-cyan hover:underline cursor-pointer"
          >
            <span>Open Interactive Timetable</span>
            <ArrowRight className="size-3.5" />
          </button>
        )}
      </div>

      {/* ── Syllabus Dialog ── */}
      <SyllabusDialog
        deadline={syllabusExam}
        isOpen={Boolean(syllabusExam)}
        onClose={() => setSyllabusExam(null)}
        canManage={Boolean(canManage)}
      />
    </section>
  );
}
