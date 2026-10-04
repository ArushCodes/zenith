import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useBatch } from "@/hooks/use-batch";
import { examMarksQuery } from "@/lib/marks";
import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Pencil, Search, Trash2 } from "lucide-react";
import { formatDeadlineWhen, phaseOf, typeLabel, type Deadline } from "@/lib/deadlines";
import { autoColor } from "@/lib/courses";
import { ExamMarks } from "./ExamMarks";

export function AssessmentAgenda({
  items,
  now,
  canManage,
  onEdit,
  onDelete,
  onOpen,
}: {
  items: Deadline[];
  now: number;
  canManage: boolean;
  onEdit: (d: Deadline) => void;
  onDelete: (d: Deadline) => void;
  onOpen?: (d: Deadline) => void;
}) {
  const { user } = useAuth();
  const { batchId } = useBatch();
  const { data: marks = [] } = useQuery(examMarksQuery(batchId, user?.id));
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const shown = useMemo(
    () =>
      items
        .filter((d) =>
          `${d.subject} ${d.title} ${d.notes ?? ""}`.toLowerCase().includes(search.toLowerCase()),
        )
        .sort((a, b) => Date.parse(a.due_at) - Date.parse(b.due_at)),
    [items, search],
  );
  const upcoming = shown.filter((d) => phaseOf(d, now) !== "completed");
  const past = shown.filter((d) => phaseOf(d, now) === "completed").reverse();
  const renderRow = (d: Deadline) => (
    <motion.article
      key={d.id}
      layout={!reduced}
      initial={false}
      className="overflow-hidden rounded-xl border border-border bg-surface"
    >
      <button
        type="button"
        aria-expanded={open === d.id}
        onClick={() => setOpen(open === d.id ? null : d.id)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface2/50"
      >
        <span
          className="h-9 w-1 shrink-0 rounded-full"
          style={{ backgroundColor: autoColor(d.subject) }}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">{d.title}</span>
          <span className="mt-1 block text-xs text-dim">
            {d.subject} · {typeLabel(d.type)}
            {d.working_group ? ` · ${d.working_group}` : ""}
          </span>
        </span>
        <span className="max-w-36 text-right text-xs text-dim sm:max-w-none">
          {formatDeadlineWhen(d)}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-dim transition-transform ${open === d.id ? "rotate-180" : ""}`}
        />
      </button>
      {open === d.id && (
        <motion.div
          initial={reduced ? false : { y: 4 }}
          animate={{ y: 0 }}
          className="space-y-3 border-t border-border px-4 py-3"
        >
          {d.notes && (
            <p className="whitespace-pre-line text-xs leading-relaxed text-dim">{d.notes}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {d.location && <span className="text-dim">{d.location}</span>}
            <button type="button" onClick={() => onOpen?.(d)} className="text-cyan">
              Details & calendar
            </button>
            {d.submission_link && (
              <a href={d.submission_link} target="_blank" rel="noreferrer" className="text-cyan">
                Open submission
              </a>
            )}
            {canManage && (
              <>
                <button
                  type="button"
                  aria-label={`Edit ${d.title}`}
                  onClick={() => onEdit(d)}
                  className="ml-auto text-dim"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${d.title}`}
                  onClick={() => onDelete(d)}
                  className="text-rose"
                >
                  <Trash2 className="size-4" />
                </button>
              </>
            )}
          </div>
          <ExamMarks deadline={d} defaultWeight={0} inline />
        </motion.div>
      )}
    </motion.article>
  );
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-dim">
          {upcoming.length} upcoming · {past.length} past
        </p>
        <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
          <Search className="size-3.5 text-dim" />
          <input
            aria-label="Search assessments"
            placeholder="Subject or assessment…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-44 bg-transparent text-xs outline-none"
          />
        </label>
      </div>
      {upcoming.map(renderRow)}
      {!upcoming.length && (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-dim">
          {search ? "No upcoming matches." : "No upcoming assessments announced."}
        </p>
      )}
      {past.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer py-3 text-xs text-dim">
            Past assessments · {past.length}
          </summary>
          <div className="space-y-2">{past.map(renderRow)}</div>
        </details>
      )}
    </section>
  );
}
