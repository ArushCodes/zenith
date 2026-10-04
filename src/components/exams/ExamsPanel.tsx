import { useQuery } from "@tanstack/react-query";
import { useBatch } from "@/hooks/use-batch";
import { sessionsQuery } from "@/lib/batches";
import { useState } from "react";
import { type Deadline } from "@/lib/deadlines";
import { AssessmentAgenda } from "@/components/board/AssessmentAgenda";
export function ExamsPanel({
  deadlines,
  now,
  canManage,
  onEdit,
  onDelete,
  onOpen,
  onAddExam,
}: {
  deadlines: Deadline[];
  now: number;
  canManage: boolean;
  onEdit: (d: Deadline) => void;
  onDelete: (d: Deadline) => void;
  onOpen?: (d: Deadline) => void;
  onAddExam?: () => void;
  initialSubTab?: "midterm" | "endterm";
}) {
  const { batchId } = useBatch();
  const { data: sessions = [] } = useQuery(sessionsQuery(batchId));
  const periods = sessions
    .filter(
      (s) =>
        s.notes?.includes("academic-calendar") &&
        /exam|conceptual/i.test(s.course_name ?? "") &&
        Date.parse(s.end_at) >= now,
    )
    .sort((a, b) => Date.parse(a.start_at) - Date.parse(b.start_at));
  const first = periods[0];
  const nearby = first
    ? periods.filter((s) => Date.parse(s.start_at) - Date.parse(first.start_at) < 14 * 86400000)
    : [];
  const dateFmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
  });
  const [filter, setFilter] = useState("all");
  const exams = deadlines.filter(
    (d) =>
      (d.type === "midterm" || d.type === "endterm") && (filter === "all" || d.type === filter),
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {[
          ["all", "All exams"],
          ["midterm", "Midterms"],
          ["endterm", "Endterms"],
        ].map(([key, label]) => (
          <button
            type="button"
            key={key}
            aria-pressed={filter === key}
            onClick={() => setFilter(key!)}
            className={`rounded-lg px-3 py-2 text-xs transition-colors ${filter === key ? "bg-cyan/15 text-cyan" : "bg-surface text-dim"}`}
          >
            {label}
          </button>
        ))}
        {canManage && onAddExam && (
          <button
            type="button"
            onClick={onAddExam}
            className="ml-auto rounded-lg bg-cyan px-3 py-2 text-xs text-ground"
          >
            Add exam
          </button>
        )}
      </div>
      {first && (
        <p className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-dim">
          Exam period · {dateFmt.format(new Date(first.start_at))}–
          {dateFmt.format(new Date(nearby.at(-1)!.start_at))}. Subject dates appear below when
          announced.
        </p>
      )}
      <AssessmentAgenda
        items={exams}
        now={now}
        canManage={canManage}
        onEdit={onEdit}
        onDelete={onDelete}
        onOpen={onOpen}
      />
    </div>
  );
}
