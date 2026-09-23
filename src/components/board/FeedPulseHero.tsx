import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Award,
  BookOpen,
  Calendar,
  ChevronRight,
  Clock,
  GraduationCap,
  Sparkles,
  Sun,
  Timer,
} from "lucide-react";
import {
  cleanExamTitle,
  phaseOf,
  timeLeft,
  type Deadline,
} from "@/lib/deadlines";
import { autoColor } from "@/lib/courses";
import type { ClassSession } from "@/lib/batches";

type Props = {
  deadlines: Deadline[];
  sessions: ClassSession[];
  now: number;
  onSelectDeadline?: (d: Deadline) => void;
  onSeeAllExams?: () => void;
};

const fullDateFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const timeFmt = new Intl.DateTimeFormat("en-GB", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export function FeedPulseHero({
  deadlines,
  sessions,
  now,
  onSelectDeadline,
  onSeeAllExams,
}: Props) {
  // Find upcoming midterms & deliverables
  const upcomingMidterms = useMemo(() => {
    return deadlines
      .filter((d) => (d.type === "midterm" || d.type === "endterm") && phaseOf(d, now) !== "completed")
      .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());
  }, [deadlines, now]);

  const upcomingAssignments = useMemo(() => {
    return deadlines
      .filter((d) => (d.type === "assignment" || d.type === "presentation") && phaseOf(d, now) !== "completed")
      .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());
  }, [deadlines, now]);

  const nextExam = upcomingMidterms[0] ?? null;

  const nextExamTimeInfo = useMemo(() => {
    if (!nextExam) return null;
    const start = new Date(nextExam.due_at);
    const end = nextExam.end_at ? new Date(nextExam.end_at) : new Date(start.getTime() + 60 * 60_000);
    const diffMin = Math.round((end.getTime() - start.getTime()) / 60_000);
    return {
      date: fullDateFmt.format(start),
      time: `${timeFmt.format(start)} – ${timeFmt.format(end)}`,
      dur: `${diffMin} mins`,
    };
  }, [nextExam]);

  const nextExamColor = nextExam ? autoColor(nextExam.subject || nextExam.title) : "var(--cyan)";

  return (
    <div className="overflow-hidden rounded-3xl border border-border/80 bg-surface p-6 sm:p-8 shadow-xs">
      {/* Top Welcome & Date Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2 text-cyan">
            <Sparkles className="size-4" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider">
              Academic Pulse & Overview
            </span>
          </div>
          <h2 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink">
            {fullDateFmt.format(new Date(now))}
          </h2>
          <p className="mt-1 font-sans text-xs sm:text-sm text-dim">
            Term 1 Schedule · Keep track of upcoming examinations, assignments, and milestones.
          </p>
        </div>

        {upcomingMidterms.length > 0 && (
          <div className="flex items-center gap-2 rounded-2xl bg-surface2/80 px-4 py-2 ring-1 ring-border">
            <GraduationCap className="size-4 text-cyan" />
            <span className="font-mono text-xs font-bold text-ink">
              {upcomingMidterms.length} Exams Ahead
            </span>
          </div>
        )}
      </div>

      {/* Featured Spotlight: Immediate Next Exam */}
      {nextExam && nextExamTimeInfo && (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-sans text-xs font-bold uppercase tracking-wider text-dim">
              Next Upcoming Examination
            </span>
            {onSeeAllExams && (
              <button
                type="button"
                onClick={onSeeAllExams}
                className="flex items-center gap-1 font-sans text-xs font-semibold text-cyan hover:underline cursor-pointer"
              >
                <span>View all exams schedule</span>
                <ChevronRight className="size-3.5" />
              </button>
            )}
          </div>

          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
            onClick={() => onSelectDeadline?.(nextExam)}
            className="group relative cursor-pointer overflow-hidden rounded-2xl border p-5 sm:p-6 transition-all"
            style={{
              borderColor: `${nextExamColor}60`,
              backgroundColor: `${nextExamColor}0a`,
            }}
          >
            <span
              className="absolute left-0 top-0 bottom-0 w-1.5"
              style={{ backgroundColor: nextExamColor }}
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="rounded-lg px-2.5 py-1 font-mono text-xs font-extrabold tracking-wider"
                  style={{
                    backgroundColor: `${nextExamColor}20`,
                    color: nextExamColor,
                    border: `1px solid ${nextExamColor}40`,
                  }}
                >
                  {nextExam.subject_code || nextExam.subject}
                </span>

                <span className="rounded-lg bg-surface px-2.5 py-1 font-mono text-xs font-bold text-dim ring-1 ring-border">
                  Mid-Term Exam
                </span>

                {nextExam.is_major && (
                  <span className="rounded-lg bg-amber/15 px-2.5 py-1 font-mono text-xs font-bold text-amber ring-1 ring-amber/30">
                    20% Weightage
                  </span>
                )}
              </div>

              {/* Countdown */}
              <div className="flex items-center gap-1.5 font-mono text-xs font-extrabold text-cyan bg-surface px-3 py-1 rounded-xl ring-1 ring-border shadow-xs">
                <Timer className="size-3.5" />
                <span>Starts in {timeLeft(nextExam.due_at, now)}</span>
              </div>
            </div>

            <div className="mt-3">
              <h3 className="font-display text-xl sm:text-2xl font-bold text-ink group-hover:text-cyan transition-colors">
                {cleanExamTitle(nextExam.title, nextExam.subject)}
              </h3>

              <div className="mt-3 flex flex-wrap items-center gap-3 font-sans text-xs sm:text-sm text-dim">
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-4 text-cyan" />
                  <span className="font-semibold text-ink">{nextExamTimeInfo.date}</span>
                </div>
                <span className="text-border">·</span>
                <div className="flex items-center gap-1.5">
                  <Clock className="size-4 text-amber" />
                  <span className="font-semibold text-ink">{nextExamTimeInfo.time}</span>
                  <span className="text-dim">({nextExamTimeInfo.dur})</span>
                </div>
              </div>

              {nextExam.notes && (
                <p className="mt-3 rounded-xl bg-surface/80 border border-border/70 p-3 text-xs text-dim leading-relaxed">
                  <strong className="text-ink">Format: </strong>
                  {nextExam.notes}
                </p>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* 3 Spacious Metrics Grid */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="flex flex-col justify-between rounded-2xl border border-border/70 bg-surface2/40 p-4">
          <div className="flex items-center gap-2 text-cyan mb-2">
            <GraduationCap className="size-4" />
            <span className="font-sans text-xs font-bold uppercase tracking-wider text-dim">
              Midterm Series
            </span>
          </div>
          <div>
            <p className="font-display text-2xl font-bold text-ink">{upcomingMidterms.length} Exams</p>
            <p className="mt-0.5 font-sans text-xs text-dim">
              {upcomingMidterms.length > 0 ? "Sept 15 – Sept 18, 2026" : "All completed"}
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-border/70 bg-surface2/40 p-4">
          <div className="flex items-center gap-2 text-amber mb-2">
            <BookOpen className="size-4" />
            <span className="font-sans text-xs font-bold uppercase tracking-wider text-dim">
              Deliverables
            </span>
          </div>
          <div>
            <p className="font-display text-2xl font-bold text-ink">
              {upcomingAssignments.length} Assignment{upcomingAssignments.length === 1 ? "" : "s"}
            </p>
            <p className="mt-0.5 font-sans text-xs text-dim truncate">
              {upcomingAssignments[0] ? upcomingAssignments[0].title : "Nothing pending"}
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-border/70 bg-surface2/40 p-4">
          <div className="flex items-center gap-2 text-emerald-500 mb-2">
            <Sun className="size-4" />
            <span className="font-sans text-xs font-bold uppercase tracking-wider text-dim">
              Daily Classes
            </span>
          </div>
          <div>
            <p className="font-display text-2xl font-bold text-ink">Free Day</p>
            <p className="mt-0.5 font-sans text-xs text-dim">
              No classes today · Dedicated prep time
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
