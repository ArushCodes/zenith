import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Award,
  BookOpen,
  Calendar,
  Clock,
  FileText,
  MapPin,
  Pencil,
  Sparkles,
  Trash2,
  UserCheck,
} from "lucide-react";
import {
  cleanExamTitle,
  eventMeta,
  phaseOf,
  timeLeft,
  type Deadline,
  urgencyOf,
} from "@/lib/deadlines";
import { autoColor } from "@/lib/courses";
import { ExamMarks } from "@/components/board/ExamMarks";

type Props = {
  deadline: Deadline;
  now: number;
  canManage: boolean;
  onEdit: (d: Deadline) => void;
  onDelete: (d: Deadline) => void;
  onOpen?: (d: Deadline) => void;
};

const urgencyColor: Record<string, string> = {
  past: "text-dim",
  critical: "text-rose font-bold",
  soon: "text-amber font-bold",
  later: "text-cyan font-semibold",
};

const dayFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export function ExamCard({ deadline, now, canManage, onEdit, onDelete, onOpen }: Props) {
  const phase = phaseOf(deadline, now);
  const u = phase === "completed" ? "past" : urgencyOf(deadline.due_at, now);
  const subjectColor = autoColor(deadline.subject || deadline.title);

  // Compute clean timings
  const { dateStr, timeStr, durationStr } = useMemo(() => {
    const start = new Date(deadline.due_at);
    const end = deadline.end_at ? new Date(deadline.end_at) : new Date(start.getTime() + 60 * 60_000);
    const diffMin = Math.round((end.getTime() - start.getTime()) / 60_000);

    const hrs = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    let dur = `${diffMin} mins`;
    if (hrs > 0 && mins === 0) dur = `${hrs} hr${hrs > 1 ? "s" : ""}`;
    else if (hrs > 0) dur = `${hrs} hr ${mins}m`;

    return {
      dateStr: dayFormatter.format(start),
      timeStr: `${timeFormatter.format(start)} – ${timeFormatter.format(end)}`,
      durationStr: dur,
    };
  }, [deadline.due_at, deadline.end_at]);

  // Extract weightage from notes if present
  const weightage = useMemo(() => {
    if (deadline.notes) {
      const match = deadline.notes.match(/(\d+)%\s*weightage/i);
      if (match) return Number(match[1]);
    }
    return deadline.type === "midterm" ? 20 : 40;
  }, [deadline.notes, deadline.type]);

  const cleanTitle = cleanExamTitle(deadline.title, deadline.subject);
  const isLab = (deadline.notes && deadline.notes.toLowerCase().includes("lab")) || cleanTitle.toLowerCase().includes("lab");

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="group relative overflow-hidden rounded-3xl border border-border/80 bg-surface p-3.5 sm:p-6 shadow-xs hover:border-border hover:shadow-md transition-all"
    >
      {/* Accent left indicator with canonical subject color */}
      <span
        className="absolute left-0 top-0 bottom-0 w-1.5"
        style={{ backgroundColor: subjectColor }}
      />

      {/* Top Meta Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {deadline.subject_code && (
            <span
              className="rounded-lg px-2.5 py-1 font-mono text-xs font-bold tracking-wider"
              style={{
                backgroundColor: `${subjectColor}15`,
                color: subjectColor,
                border: `1px solid ${subjectColor}40`,
              }}
            >
              {deadline.subject_code}
            </span>
          )}

          {deadline.subject && (
            <span
              className="rounded-lg px-2.5 py-1 font-sans text-xs font-bold"
              style={{
                backgroundColor: `${subjectColor}18`,
                color: subjectColor,
              }}
            >
              {deadline.subject}
            </span>
          )}

          <span className="rounded-lg bg-surface2 px-2.5 py-1 font-mono text-[11px] font-semibold text-dim ring-1 ring-border">
            {deadline.type === "midterm" ? "Mid-Term Exam" : "End-Term Exam"}
          </span>

          {deadline.is_major && (
            <span className="flex items-center gap-1 rounded-lg bg-amber/12 px-2.5 py-1 font-sans text-[11px] font-bold text-amber ring-1 ring-amber/30">
              <Sparkles className="size-3" />
              Major Assessment
            </span>
          )}
        </div>

        {/* Urgency / Countdown Status */}
        <div className="flex items-center gap-2">
          {phase === "ongoing" && (
            <span className="flex items-center gap-1.5 rounded-full bg-cyan/15 px-3 py-1 font-mono text-xs font-bold text-cyan animate-pulse ring-1 ring-cyan/30">
              <span className="size-2 rounded-full bg-cyan" />
              Live Now
            </span>
          )}

          {phase === "completed" && (
            <span className="rounded-full bg-emerald-500/12 px-3 py-1 font-mono text-xs font-bold text-emerald-500 ring-1 ring-emerald-500/30">
              Completed
            </span>
          )}

          {phase === "upcoming" && (
            <span className={`font-mono text-xs ${urgencyColor[u]}`}>
              Starts in {timeLeft(deadline.due_at, now)}
            </span>
          )}
        </div>
      </div>

      {/* Title & Headline */}
      <div className="mt-4">
        <h3
          onClick={() => onOpen?.(deadline)}
          className="font-display text-xl sm:text-2xl font-bold tracking-tight text-ink cursor-pointer hover:text-cyan transition-colors"
        >
          {cleanTitle}
        </h3>
        <p className="mt-0.5 font-sans text-xs text-dim">
          {deadline.type === "midterm" ? "Mid-Term Examination" : "End-Term Examination"} · Term 1 Schedule
        </p>
      </div>

      {/* Structured Info Boxes Grid */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Info Box 1: Schedule */}
        <div className="flex flex-col justify-between rounded-2xl border border-border/70 bg-surface2/40 p-3.5">
          <div className="flex items-center gap-2 text-dim mb-2">
            <Calendar className="size-4 text-cyan" />
            <span className="font-sans text-xs font-bold uppercase tracking-wider text-dim">
              Date & Schedule
            </span>
          </div>
          <div>
            <p className="font-sans text-sm font-bold text-ink">{dateStr}</p>
            <div className="mt-1 flex items-center gap-1.5 font-mono text-xs text-dim">
              <Clock className="size-3 text-faint" />
              <span>{timeStr}</span>
            </div>
            <span className="mt-2 inline-block rounded-md bg-surface px-2 py-0.5 font-mono text-[10px] font-semibold text-dim ring-1 ring-border">
              Duration: {durationStr}
            </span>
          </div>
        </div>

        {/* Info Box 2: Mode & Format */}
        <div className="flex flex-col justify-between rounded-2xl border border-border/70 bg-surface2/40 p-3.5">
          <div className="flex items-center gap-2 text-dim mb-2">
            <BookOpen className="size-4 text-amber" />
            <span className="font-sans text-xs font-bold uppercase tracking-wider text-dim">
              Exam Format
            </span>
          </div>
          <div>
            <p className="font-sans text-sm font-bold text-ink">
              {isLab ? "Lab Practical Exam" : "Closed Book Exam"}
            </p>
            <div className="mt-1 flex items-center gap-1.5 font-mono text-xs text-dim">
              <UserCheck className="size-3 text-faint" />
              <span>Individual Assessment</span>
            </div>
            {deadline.location ? (
              <div className="mt-2 flex items-center gap-1 font-mono text-xs text-cyan">
                <MapPin className="size-3" />
                <span>{deadline.location}</span>
              </div>
            ) : (
              <span className="mt-2 inline-block rounded-md bg-surface px-2 py-0.5 font-mono text-[10px] font-semibold text-dim ring-1 ring-border">
                {isLab ? "Computer Lab" : "Designated Exam Hall"}
              </span>
            )}
          </div>
        </div>

        {/* Info Box 3: Weightage */}
        <div className="flex flex-col justify-between rounded-2xl border border-border/70 bg-surface2/40 p-3.5">
          <div className="flex items-center gap-2 text-dim mb-2">
            <Award className="size-4 text-emerald-400" />
            <span className="font-sans text-xs font-bold uppercase tracking-wider text-dim">
              Weightage
            </span>
          </div>
          <div>
            <p className="font-mono text-lg font-extrabold text-ink">
              {weightage}% <span className="text-xs font-normal text-dim">of Course Grade</span>
            </p>
            <p className="mt-1 font-sans text-xs text-dim leading-relaxed">
              Relative Grading (10 PT CGPA scale)
            </p>
            <span className="mt-2 inline-block rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-500 ring-1 ring-emerald-500/25">
              Grade Point Impact
            </span>
          </div>
        </div>
      </div>

      {/* Notes / Syllabus Callout Banner */}
      {deadline.notes && (
        <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-border/70 bg-surface2/30 p-3 sm:px-4">
          <FileText className="size-4 shrink-0 text-cyan mt-0.5" />
          <div className="min-w-0">
            <span className="font-sans text-xs font-bold uppercase tracking-wider text-dim block mb-0.5">
              Examination Notes & Coverage
            </span>
            <p className="font-sans text-xs sm:text-sm text-ink leading-relaxed">
              {deadline.notes}
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 border-t border-border/60 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onOpen?.(deadline)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-cyan/12 border border-cyan/30 px-3 py-1.5 font-sans text-xs font-bold text-cyan hover:bg-cyan/20 transition-all cursor-pointer"
          >
            <span>View Details</span>
          </button>
        </div>

        {/* Mod Controls */}
        {canManage && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(deadline)}
              className="flex items-center gap-1.5 rounded-xl border border-amber/30 bg-amber/10 px-3 py-1.5 font-sans text-xs font-semibold text-amber hover:bg-amber/20 transition-colors cursor-pointer"
            >
              <Pencil className="size-3" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete "${cleanTitle}" exam?`)) {
                  onDelete(deadline);
                }
              }}
              className="flex items-center gap-1.5 rounded-xl border border-rose/30 bg-rose/10 px-3 py-1.5 font-sans text-xs font-semibold text-rose hover:bg-rose/20 transition-colors cursor-pointer"
            >
              <Trash2 className="size-3" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Integrated My Marks Tracker Info Box */}
      <ExamMarks deadline={deadline} defaultWeight={weightage} />
    </motion.div>
  );
}
