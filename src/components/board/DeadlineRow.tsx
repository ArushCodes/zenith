import { motion } from "framer-motion";
import { Pencil, Trash2 } from "lucide-react";
import {
  eventMeta,
  fullDeadlineLabel,
  formatDeadlineWhen,
  phaseOf,
  timeLeft,
  typeLabel,
  urgencyOf,
  type Deadline,
} from "@/lib/deadlines";
import { autoColor } from "@/lib/courses";


const accent: Record<string, string> = {
  past: "bg-faint",
  critical: "bg-rose blink",
  soon: "bg-amber",
  later: "bg-cyan/60",
};

const countdownColor: Record<string, string> = {
  past: "text-faint",
  critical: "text-rose blink",
  soon: "text-amber",
  later: "text-cyan",
};

const hoverRing: Record<string, string> = {
  past: "hover:ring-border",
  critical: "hover:ring-rose/40",
  soon: "hover:ring-amber/40",
  later: "hover:ring-cyan/40",
};

type Props = {
  deadline: Deadline;
  now: number;
  canManage: boolean;
  onEdit: (d: Deadline) => void;
  onDelete: (d: Deadline) => void;
  onOpen?: (d: Deadline) => void;
};

export function DeadlineRow({ deadline, now, canManage, onEdit, onDelete, onOpen }: Props) {
  const phase = phaseOf(deadline, now);
  const u = phase === "completed" ? "past" : urgencyOf(deadline.due_at, now);
  const meta = eventMeta(deadline.type);


  return (
    <motion.div
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className={`group relative grid grid-cols-[1fr_auto] items-center gap-4 rounded-2xl bg-surface p-4 sm:p-5 ring-1 ring-border shadow-sm transition-all duration-200 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] ${hoverRing[u]}`}
    >
      <span className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${accent[u]}`} />
      <button
        type="button"
        onClick={() => onOpen?.(deadline)}
        className="min-w-0 pl-2 text-left"
      >
        <p className="truncate font-display text-base sm:text-lg font-bold tracking-tight text-ink group-hover:text-cyan transition-colors">
          {fullDeadlineLabel(deadline)}
        </p>
        <p className="truncate font-mono text-xs text-dim mt-0.5">
          {[formatDeadlineWhen(deadline), deadline.location].filter(Boolean).join(" · ")}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 mt-1 sm:hidden">
          <span className={`rounded-md px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider ${meta.chip}`}>
            {typeLabel(deadline.type)}
          </span>
          {deadline.subject && (
            <span
              className="rounded-md px-1.5 py-0.5 font-mono text-[9px] font-semibold"
              style={{
                color: autoColor(deadline.subject),
                backgroundColor: `${autoColor(deadline.subject)}18`,
                border: `1px solid ${autoColor(deadline.subject)}40`,
              }}
            >
              {deadline.subject}
            </span>
          )}
        </div>
      </button>

      <span className={`hidden rounded-lg px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider sm:inline-block shadow-sm ${meta.chip}`}>
        {typeLabel(deadline.type)}
      </span>

      {deadline.subject && (
        <span
          className="hidden rounded-md px-2.5 py-1 font-mono text-[11px] font-semibold sm:inline-block"
          style={{
            color: autoColor(deadline.subject),
            backgroundColor: `${autoColor(deadline.subject)}18`,
            border: `1px solid ${autoColor(deadline.subject)}40`,
          }}
        >
          {deadline.subject}
        </span>
      )}

      <span
        className={
          deadline.work_mode === "group"
            ? "hidden rounded-md bg-violet/10 px-2 py-1 font-mono text-[10px] text-violet ring-1 ring-violet/25 sm:block"
            : "hidden rounded-md bg-surface2 px-2 py-1 font-mono text-[10px] text-dim ring-1 ring-border sm:block"
        }
      >
        {deadline.work_mode === "group"
          ? `Group${deadline.group_size ? ` · ${deadline.group_size}` : ""}`
          : "Individual"}
      </span>

      <div className="flex items-center gap-3 justify-self-end">
        <p
          className={`font-mono text-sm font-semibold ${
            phase === "completed"
              ? "text-evt-present"
              : phase === "ongoing"
                ? "text-cyan blink"
                : countdownColor[u]
          }`}
        >
          {phase === "completed"
            ? "Done"
            : phase === "ongoing"
              ? "Live"
              : timeLeft(deadline.due_at, now)}
        </p>

        <div className="flex items-center gap-1.5">
          {deadline.submission_link && (
            <a
              href={deadline.submission_link}
              target="_blank"
              rel="noreferrer"
              className="hidden rounded-lg bg-surface2 px-2.5 py-1 font-mono text-[11px] text-dim ring-1 ring-border transition-colors hover:text-cyan hover:ring-cyan/40 sm:block"
            >
              Open
            </a>
          )}
          {canManage && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(deadline);
                }}
                className="flex items-center gap-1 rounded-lg bg-surface2 px-2 sm:px-2.5 py-1 font-mono text-[11px] font-semibold text-amber ring-1 ring-amber/30 transition-colors hover:bg-amber/15 hover:ring-amber/50"
                title="Edit event"
              >
                <Pencil className="size-3" />
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Are you sure you want to delete "${deadline.title}"?`)) {
                    onDelete(deadline);
                  }
                }}
                className="flex items-center gap-1 rounded-lg bg-surface2 px-2 sm:px-2.5 py-1 font-mono text-[11px] font-semibold text-rose ring-1 ring-rose/30 transition-colors hover:bg-rose/15 hover:ring-rose/50"
                title="Delete event"
              >
                <Trash2 className="size-3" />
                <span className="hidden sm:inline">Del</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
