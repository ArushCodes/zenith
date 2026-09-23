import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileQuestion,
  GraduationCap,
  MapPin,
  Pencil,
  Presentation,
  Radio,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
} from "lucide-react";
import {
  cleanExamTitle,
  displayTitle,
  eventMeta,
  phaseOf,
  timeLeft,
  type Deadline,
  type DeadlineType,
  typeLabel,
  urgencyOf,
} from "@/lib/deadlines";
import { autoColor, subjectShortName, subjectFullName } from "@/lib/courses";

export type FeedCardProps = {
  deadline: Deadline;
  now: number;
  canManage: boolean;
  onEdit: (d: Deadline) => void;
  onDelete: (d: Deadline) => void;
  onOpen?: (d: Deadline) => void;
  isDone?: boolean;
  onToggleDone?: (id: string, e: React.MouseEvent) => void;
  isSelected?: boolean;
};

const urgencyColor: Record<string, string> = {
  past: "text-faint",
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

const compactDayFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export function getTypeIcon(type: DeadlineType, className: string = "size-3.5") {
  switch (type) {
    case "quiz":
      return <FileQuestion className={className} />;
    case "midterm":
    case "endterm":
      return <GraduationCap className={className} />;
    case "assignment":
      return <BookOpen className={className} />;
    case "presentation":
      return <Presentation className={className} />;
    case "guest_lecture":
      return <Radio className={className} />;
    default:
      return <Sparkles className={className} />;
  }
}

/**
 * 1. COMFORTABLE CARD VIEW:
 * Full-fidelity, immersive event card with subject accent glow,
 * personal checklist checkbox, scope notes, time badges, and action buttons.
 */
export function FeedCard({
  deadline,
  now,
  canManage,
  onEdit,
  onDelete,
  onOpen,
  isDone = false,
  onToggleDone,
  isSelected = false,
}: FeedCardProps) {
  const phase = phaseOf(deadline, now);
  const u = phase === "completed" ? "past" : urgencyOf(deadline.due_at, now);
  const meta = eventMeta(deadline.type);
  const subjectColor = autoColor(deadline.subject || deadline.title);

  const isExam = deadline.type === "midterm" || deadline.type === "endterm";
  const fullCourse = subjectFullName(deadline.subject || deadline.title);
  const shortSubject = subjectShortName(deadline.subject || deadline.subject_code);

  // Intelligent title: uses full formal course name for exams/classes without clipping
  const title = isExam
    ? (deadline.title && !/[-–—:]?\s*(mid[\s-]*term|end[\s-]*term)(\s*exam)?/i.test(deadline.title)
        ? `${fullCourse} — ${cleanExamTitle(deadline.title, deadline.subject)}`
        : `${fullCourse} — ${typeLabel(deadline.type)}`)
    : displayTitle(deadline.subject, deadline.title);

  // Time calculations
  const { dateStr, timeStr, durationStr, isCriticalUrgent } = useMemo(() => {
    const start = new Date(deadline.due_at);
    const end = deadline.end_at ? new Date(deadline.end_at) : new Date(start.getTime() + 60 * 60_000);
    const diffMin = Math.round((end.getTime() - start.getTime()) / 60_000);

    const hrs = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    let dur = `${diffMin} mins`;
    if (hrs > 0 && mins === 0) dur = `${hrs} hr${hrs > 1 ? "s" : ""}`;
    else if (hrs > 0) dur = `${hrs} hr ${mins}m`;

    const remainingMs = start.getTime() - now;
    const isCritical = remainingMs > 0 && remainingMs <= 24 * 3600_000;

    return {
      dateStr: dayFormatter.format(start),
      timeStr: `${timeFormatter.format(start)} – ${timeFormatter.format(end)}`,
      durationStr: dur,
      isCriticalUrgent: isCritical,
    };
  }, [deadline.due_at, deadline.end_at, now]);

  return (
    <motion.article
      layout="position"
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 380, damping: 24 }}
      onClick={() => onOpen?.(deadline)}
      className={`group relative overflow-hidden rounded-2xl border bg-surface p-3.5 sm:p-6 transition-all cursor-pointer ${
        isDone
          ? "border-border/60 bg-surface/50 opacity-75"
          : isSelected
          ? "border-cyan ring-1 ring-cyan/40 shadow-md shadow-cyan/10"
          : phase === "ongoing"
          ? "border-cyan/50 ring-1 ring-cyan/30 shadow-md shadow-cyan/10"
          : isCriticalUrgent
          ? "border-rose/40 ring-1 ring-rose/20 shadow-md shadow-rose/10"
          : "border-border/80 hover:border-border hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/20"
      }`}
    >
      {/* Accent left indicator with canonical subject color */}
      <span
        className="absolute left-0 top-0 bottom-0 w-1.5 transition-all group-hover:w-2"
        style={{ backgroundColor: subjectColor }}
      />

      {/* Top Meta Line: Checkbox, Course code, Short Subject, Type, Urgency */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Personal Student Done Toggle Button */}
          {onToggleDone && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleDone(deadline.id, e);
              }}
              title={isDone ? "Completed" : "Mark done"}
              className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold transition-all cursor-pointer ${
                isDone
                  ? "bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/30"
                  : "bg-surface2 text-dim hover:text-ink ring-1 ring-border"
              }`}
            >
              <span
                className={`grid size-3.5 place-items-center rounded-xs border transition-all ${
                  isDone
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-border bg-surface"
                }`}
              >
                {isDone && <Check className="size-2.5 stroke-[3]" />}
              </span>
              <span className="font-mono text-[10px]">{isDone ? "Done" : "Mark done"}</span>
            </button>
          )}

          {deadline.subject_code && (
            <span
              className="rounded-md px-2 py-0.5 font-mono text-[11px] font-bold tracking-wider"
              style={{
                backgroundColor: `${subjectColor}15`,
                color: subjectColor,
                border: `1px solid ${subjectColor}35`,
              }}
            >
              {deadline.subject_code}
            </span>
          )}

          {shortSubject && (
            <span
              className="rounded-md px-2 py-0.5 font-sans text-xs font-bold"
              style={{
                backgroundColor: `${subjectColor}15`,
                color: subjectColor,
              }}
            >
              {shortSubject}
            </span>
          )}

          <span
            className={`flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${meta.chip}`}
          >
            {getTypeIcon(deadline.type, "size-3")}
            {typeLabel(deadline.type)}
          </span>

          {deadline.is_major && (
            <span className="rounded-md bg-amber/12 px-2 py-0.5 font-mono text-[10px] font-bold text-amber border border-amber/30">
              Major
            </span>
          )}
        </div>

        {/* Status / Urgency Countdown */}
        <div className="flex items-center gap-2 shrink-0">
          {phase === "ongoing" && (
            <span className="flex items-center gap-1 rounded-md bg-cyan/15 px-2.5 py-0.5 font-mono text-xs font-bold text-cyan ring-1 ring-cyan/40">
              <span className="size-1.5 rounded-full bg-cyan animate-ping" />
              Live
            </span>
          )}

          {phase === "completed" && (
            <span className="rounded-md bg-emerald-500/12 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-500 ring-1 ring-emerald-500/30">
              Completed
            </span>
          )}

          {phase === "upcoming" && (
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 font-mono text-xs ${
                isCriticalUrgent
                  ? "bg-rose/12 text-rose font-bold ring-1 ring-rose/30 shadow-xs shadow-rose/20"
                  : u === "soon"
                  ? "bg-amber/12 text-amber font-bold ring-1 ring-amber/30"
                  : "bg-surface2 text-dim font-medium"
              }`}
            >
              {isCriticalUrgent && (
                <span className="size-1.5 rounded-full bg-rose animate-ping" />
              )}
              {timeLeft(deadline.due_at, now)}
            </span>
          )}
        </div>
      </div>

      {/* Main Content: Title & Structured Data — Zero Clipping */}
      <div className="mt-3">
        <h3
          className={`font-display text-lg sm:text-xl font-bold tracking-tight break-words transition-colors ${
            isDone ? "line-through text-dim" : "text-ink group-hover:text-cyan"
          }`}
        >
          {title}
        </h3>

        {/* Structured Info Row */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-surface2/50 px-2.5 py-1 font-sans font-medium text-ink">
            <Calendar className="size-3.5 text-cyan" />
            <span>{dateStr}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-surface2/50 px-2.5 py-1 font-sans font-medium text-ink">
            <Clock className="size-3.5 text-amber" />
            <span>{timeStr}</span>
            <span className="font-mono text-[10px] text-faint ml-0.5">({durationStr})</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-surface2/50 px-2.5 py-1 font-sans font-medium text-dim">
            <UserCheck className="size-3.5 text-dim" />
            <span>{deadline.work_mode === "group" ? "Group Work" : "Individual"}</span>
          </div>

          {deadline.location && (
            <div className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-surface2/50 px-2.5 py-1 font-sans font-medium text-dim">
              <MapPin className="size-3.5 text-rose" />
              <span>{deadline.location}</span>
            </div>
          )}
        </div>

        {/* Verified Syllabus/Notes - Rendered cleanly when present */}
        {deadline.notes && (
          <div className="mt-3 rounded-xl bg-surface2/40 border border-border/70 p-3 text-xs text-ink leading-relaxed space-y-1">
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-cyan">
              <BookOpen className="size-3" />
              <span>
                {deadline.type === "midterm" || deadline.type === "endterm"
                  ? "Exam Syllabus"
                  : "Scope & Guidelines"}
              </span>
            </div>
            <p className="text-ink font-sans text-xs whitespace-pre-wrap">{deadline.notes}</p>
          </div>
        )}
      </div>

      {/* Action Toolbar: Clean, well-spaced, zero clipping */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 border-t border-border/50 pt-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen?.(deadline);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-cyan/12 border border-cyan/30 px-3 py-1.5 font-sans text-xs font-bold text-cyan hover:bg-cyan/20 transition-all cursor-pointer"
          >
            <span>View Details</span>
          </button>

          {deadline.submission_link && (
            <a
              href={deadline.submission_link}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Open Submission Link"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface2/60 px-3 py-1.5 font-sans text-xs font-semibold text-dim hover:text-cyan transition-colors"
            >
              <ExternalLink className="size-3.5" />
              <span>Submission</span>
            </a>
          )}

        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[10px] text-faint">
            <ShieldCheck className="size-3 text-cyan" /> Verified
          </span>

          {canManage && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(deadline);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-amber/30 bg-amber/10 px-2.5 py-1 font-sans text-xs font-semibold text-amber hover:bg-amber/20 transition-colors cursor-pointer"
              >
                <Pencil className="size-3" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
                    onDelete(deadline);
                  }
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-rose/30 bg-rose/10 px-2.5 py-1 font-sans text-xs font-semibold text-rose hover:bg-rose/20 transition-colors cursor-pointer"
              >
                <Trash2 className="size-3" />
                <span>Delete</span>
              </button>
            </>
          )}
        </div>
      </div>
    </motion.article>
  );
}

/**
 * 2. COMPACT LINEAR ROW VIEW:
 * Sleek, high-density row with fast scanability, personal checklist,
 * short subject badge, title, countdown, and hover-triggered quick actions.
 */
export function FeedCompactRow({
  deadline,
  now,
  canManage,
  onEdit,
  onDelete,
  onOpen,
  isDone = false,
  onToggleDone,
  isSelected = false,
}: FeedCardProps) {
  const phase = phaseOf(deadline, now);
  const u = phase === "completed" ? "past" : urgencyOf(deadline.due_at, now);
  const meta = eventMeta(deadline.type);
  const subjectColor = autoColor(deadline.subject || deadline.title);

  const isExam = deadline.type === "midterm" || deadline.type === "endterm";
  const fullCourse = subjectFullName(deadline.subject || deadline.title);
  const shortSubject = subjectShortName(deadline.subject || deadline.subject_code);

  const title = isExam
    ? `${fullCourse} — ${typeLabel(deadline.type)}`
    : displayTitle(deadline.subject, deadline.title);

  const { dateStr, isCriticalUrgent } = useMemo(() => {
    const start = new Date(deadline.due_at);
    const remainingMs = start.getTime() - now;
    const isCritical = remainingMs > 0 && remainingMs <= 24 * 3600_000;
    return {
      dateStr: compactDayFormatter.format(start),
      isCriticalUrgent: isCritical,
    };
  }, [deadline.due_at, now]);

  return (
    <motion.div
      layout="position"
      whileHover={{ x: 2 }}
      transition={{ duration: 0.15 }}
      onClick={() => onOpen?.(deadline)}
      className={`group relative flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-all cursor-pointer ${
        isDone
          ? "border-border/50 bg-surface/40 opacity-70"
          : isSelected
          ? "border-cyan bg-cyan/5 ring-1 ring-cyan/30"
          : phase === "ongoing"
          ? "border-cyan/40 bg-cyan/[0.04]"
          : isCriticalUrgent
          ? "border-rose/30 bg-rose/[0.03]"
          : "border-border/70 bg-surface hover:border-border hover:bg-surface2/50 hover:shadow-xs"
      }`}
    >
      {/* Left side: Checkbox, Short Subject Pill, Type Icon, Title */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {/* Personal Done Checkbox */}
        {onToggleDone && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleDone(deadline.id, e);
            }}
            title={isDone ? "Completed" : "Mark as done"}
            className={`grid size-5 shrink-0 place-items-center rounded-lg border transition-all cursor-pointer ${
              isDone
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-border bg-surface hover:border-cyan"
            }`}
          >
            {isDone && <Check className="size-3 stroke-[3]" />}
          </button>
        )}

        {/* Short Subject Pill */}
        <span
          className="rounded-md px-2 py-0.5 font-mono text-[11px] font-bold shrink-0"
          style={{
            backgroundColor: `${subjectColor}18`,
            color: subjectColor,
            border: `1px solid ${subjectColor}30`,
          }}
        >
          {deadline.subject_code || shortSubject}
        </span>

        {/* Type Icon */}
        <span className={`shrink-0 ${meta.text}`}>
          {getTypeIcon(deadline.type, "size-4")}
        </span>

        {/* Title — Takes available space, no aggressive clipping */}
        <span
          title={title}
          className={`font-display text-sm font-semibold truncate min-w-0 transition-colors group-hover:text-cyan ${
            isDone ? "line-through text-dim" : "text-ink"
          }`}
        >
          {title}
        </span>
      </div>

      {/* Right side: Date, Urgency Countdown, Quick Action Icons */}
      <div className="flex items-center gap-2.5 shrink-0 text-xs">
        <span className="font-mono text-[11px] text-dim hidden md:inline">
          {dateStr}
        </span>

        {phase === "ongoing" ? (
          <span className="flex items-center gap-1 rounded-md bg-cyan/15 px-2 py-0.5 font-mono text-[11px] font-bold text-cyan">
            <span className="size-1.5 rounded-full bg-cyan animate-ping" />
            Live
          </span>
        ) : phase === "completed" ? (
          <span className="rounded-md bg-surface2 px-2 py-0.5 font-mono text-[11px] text-faint">
            Completed
          </span>
        ) : (
          <span
            className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-bold ${
              isCriticalUrgent
                ? "bg-rose/12 text-rose ring-1 ring-rose/30"
                : u === "soon"
                ? "bg-amber/12 text-amber ring-1 ring-amber/30"
                : "bg-surface2 text-dim"
            }`}
          >
            {timeLeft(deadline.due_at, now)}
          </span>
        )}

        {canManage && (
          <div className="flex items-center gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(deadline);
              }}
              title="Edit event"
              className="p-1 rounded-md hover:bg-amber/20 text-dim hover:text-amber transition-colors"
            >
              <Pencil className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
