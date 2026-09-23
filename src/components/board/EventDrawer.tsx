import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarPlus,
  Clock,
  Download,
  ExternalLink,
  MapPin,
  Pencil,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  cleanExamTitle,
  downloadIcs,
  eventMeta,
  formatDeadlineWhen,
  googleCalendarUrl,
  timeLeft,
  urgencyOf,
  type Deadline,
  displayTitle,
} from "@/lib/deadlines";
import { autoColor } from "@/lib/courses";
import { ExamMarks } from "@/components/board/ExamMarks";

type Props = {
  deadline: Deadline | null;
  now: number;
  canManage: boolean;
  onClose: () => void;
  onEdit: (d: Deadline) => void;
  onDelete: (d: Deadline) => void;
};

const countdownColor: Record<string, string> = {
  past: "text-faint",
  critical: "text-evt-exam",
  soon: "text-amber",
  later: "text-cyan",
};

export function EventDrawer({ deadline, now, canManage, onClose, onEdit, onDelete }: Props) {
  return (
    <AnimatePresence>
      {deadline && (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-ground/70 backdrop-blur-sm"
          />
          <motion.aside
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-label={displayTitle(deadline.subject, deadline.title)}
            initial={{ x: "100%", opacity: 0.4 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.2 }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[460px] flex-col gap-5 overflow-y-auto border-l border-border bg-surface p-6 shadow-2xl"
          >
            <Body
              deadline={deadline}
              now={now}
              canManage={canManage}
              onClose={onClose}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Body({ deadline, now, canManage, onClose, onEdit, onDelete }: Props & { deadline: Deadline }) {
  const m = eventMeta(deadline.type);
  const u = urgencyOf(deadline.due_at, now);
  const pulsing = u === "critical";

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className={`inline-block size-2 rounded-full ${m.dot} ${pulsing ? "pulse-dot" : ""}`} />
          <span className={`rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-wide ${m.chip}`}>
            {m.label}
          </span>
          {deadline.is_major && (
            <span className="rounded-md bg-evt-exam/12 px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-evt-exam ring-1 ring-evt-exam/30">
              Major
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close details"
          className="rounded-md p-1.5 text-dim ring-1 ring-border transition-colors hover:text-ink"
        >
          <X className="size-4" />
        </button>
      </div>

      <div>
        <div className="flex items-center gap-2">
          {deadline.subject_code && (
            <span
              className="rounded-lg px-2.5 py-0.5 font-mono text-xs font-bold"
              style={{
                color: autoColor(deadline.subject || deadline.title),
                backgroundColor: `${autoColor(deadline.subject || deadline.title)}18`,
                border: `1px solid ${autoColor(deadline.subject || deadline.title)}40`,
              }}
            >
              {deadline.subject_code}
            </span>
          )}
          {deadline.subject && (
            <p
              className="font-mono text-xs font-bold uppercase tracking-wider"
              style={{ color: autoColor(deadline.subject || deadline.title) }}
            >
              {deadline.subject}
            </p>
          )}
        </div>
        <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink text-balance">
          {deadline.type === "midterm" || deadline.type === "endterm"
            ? cleanExamTitle(deadline.title, deadline.subject)
            : displayTitle(deadline.subject, deadline.title)}
        </h2>
      </div>

      <div className="grid gap-2 rounded-2xl bg-surface2/60 p-4 ring-1 ring-border">
        <Line icon={<Clock className="size-4 text-cyan" />} label={formatDeadlineWhen(deadline)} />
        <Line
          icon={<Users className="size-4 text-amber" />}
          label={
            deadline.work_mode === "group"
              ? `Group work${deadline.group_size ? ` · teams of ${deadline.group_size}` : ""}${
                  deadline.working_group ? ` · ${deadline.working_group}` : ""
                }`
              : `Individual${deadline.working_group ? ` · ${deadline.working_group}` : ""}`
          }
        />
        {deadline.location && <Line icon={<MapPin className="size-4 text-rose" />} label={deadline.location} />}
        <div className="mt-2 flex items-baseline justify-between border-t border-border/50 pt-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">Time left</span>
          <span className={`font-mono text-base font-bold ${countdownColor[u]} ${pulsing ? "blink" : ""}`}>
            {timeLeft(deadline.due_at, now)}
          </span>
        </div>
      </div>

      {deadline.notes && (
        <div className="rounded-xl border border-border bg-surface2/40 p-3 text-xs leading-relaxed text-dim">
          <p className="font-sans text-[11px] font-bold uppercase tracking-wider text-dim mb-1">Notes & Scope</p>
          <p className="text-ink font-sans text-xs sm:text-sm">{deadline.notes}</p>
        </div>
      )}

      {(deadline.type === "midterm" || deadline.type === "endterm") && (
        <ExamMarks deadline={deadline} />
      )}

      <div className="grid gap-2">
        {deadline.submission_link && (
          <a
            href={deadline.submission_link}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg bg-cyan px-3 py-2.5 text-sm font-semibold text-ground transition-transform hover:-translate-y-0.5"
          >
            <ExternalLink className="size-4" /> Open submission portal
          </a>
        )}
        <div className="grid grid-cols-2 gap-2">
          <a
            href={googleCalendarUrl(deadline)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg bg-surface2 px-3 py-2 font-mono text-[11px] text-dim ring-1 ring-border transition-colors hover:text-ink hover:ring-cyan/40"
          >
            <CalendarPlus className="size-3.5" /> Google Calendar
          </a>
          <button
            onClick={() => downloadIcs(deadline)}
            className="flex items-center justify-center gap-2 rounded-lg bg-surface2 px-3 py-2 font-mono text-[11px] text-dim ring-1 ring-border transition-colors hover:text-ink hover:ring-cyan/40"
          >
            <Download className="size-3.5" /> Export .ics
          </button>
        </div>
      </div>

      {canManage && (
        <div className="mt-auto grid grid-cols-2 gap-2 border-t border-border pt-4">
          <button
            onClick={() => onEdit(deadline)}
            className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 font-mono text-[11px] text-dim ring-1 ring-border transition-colors hover:text-amber hover:ring-amber/40"
          >
            <Pencil className="size-3.5" /> Edit event
          </button>
          <button
            onClick={() => onDelete(deadline)}
            className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 font-mono text-[11px] text-dim ring-1 ring-border transition-colors hover:text-rose hover:ring-rose/40"
          >
            <Trash2 className="size-3.5" /> Delete
          </button>
        </div>
      )}
    </>
  );
}

function Line({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-dim">
      <span className="text-faint">{icon}</span>
      <span className="font-mono text-[12px]">{label}</span>
    </div>
  );
}
