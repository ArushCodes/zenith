import { useEffect, useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { db as supabase } from "@/lib/backend";
import { useAuth } from "@/hooks/use-auth";
import { useBatch } from "@/hooks/use-batch";
import { examMarksQuery, fmtNum, scorePct, weightedPoints } from "@/lib/marks";
import { componentMarksQuery, courseComponentsQuery } from "@/lib/grading";
import {
  assessmentCandidates,
  isCombinedComponent,
  suggestedComponent,
} from "@/lib/assessment-link";
import type { Deadline } from "@/lib/deadlines";

/** One personal score, reused by a confirmed grading-component link. */
export function ExamMarks({
  deadline,
  inline = false,
}: {
  deadline: Deadline;
  defaultWeight?: number;
  inline?: boolean;
}) {
  const { batchId, isMember } = useBatch();
  const { user } = useAuth();
  const client = useQueryClient();
  const inputId = useId();
  const marksQuery = useQuery(examMarksQuery(batchId, user?.id));
  const componentsQuery = useQuery(courseComponentsQuery(batchId));
  const gradesQuery = useQuery(componentMarksQuery(batchId, user?.id));
  const marks = marksQuery.data ?? [];
  const components = componentsQuery.data ?? [];
  const mine = marks.find((m) => m.deadline_id === deadline.id);
  const candidates = assessmentCandidates(deadline, components);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const suggestion = suggestedComponent(deadline, components);
  const suggestedAvailable =
    suggestion &&
    !marks.some((m) => m.component_id === suggestion.id && m.deadline_id !== deadline.id);
  const componentId = selectedId ?? mine?.component_id ?? (suggestedAvailable ? suggestion.id : "");
  const component = components.find((c) => c.id === componentId);
  const grade = (gradesQuery.data ?? []).find((m) => m.component_id === componentId);
  const [open, setOpen] = useState(inline);
  const [score, setScore] = useState("");
  const [total, setTotal] = useState("");
  const [combinedConfirmed, setCombinedConfirmed] = useState(false);
  const source = component && grade ? grade : mine;
  const sourceId = source?.id;
  const sourceScore = source?.score;
  const sourceTotal = source?.total;
  const storedComponent = mine?.component_id;
  useEffect(() => {
    setScore(sourceId ? String(sourceScore) : "");
    setTotal(sourceId ? String(sourceTotal) : "");
    setCombinedConfirmed(Boolean(storedComponent && storedComponent === componentId));
  }, [sourceId, sourceScore, sourceTotal, componentId, storedComponent]);
  const loading = marksQuery.isPending || componentsQuery.isPending || gradesQuery.isPending;
  const failed = marksQuery.isError || componentsQuery.isError || gradesQuery.isError;
  const pending = loading || failed;
  const valid =
    score.trim() !== "" &&
    total.trim() !== "" &&
    Number.isFinite(Number(score)) &&
    Number.isFinite(Number(total)) &&
    Number(total) > 0 &&
    Number(score) >= 0 &&
    Number(score) <= Number(total);
  const combined = Boolean(component && isCombinedComponent(component));
  const weight = component ? Number(component.weightage) : null;
  const invalidate = () => {
    void client.invalidateQueries({ queryKey: ["exam-marks", batchId, user?.id] });
    void client.invalidateQueries({ queryKey: ["component-marks", batchId, user?.id] });
  };
  const save = useMutation({
    mutationFn: async () => {
      if (!user || !valid || pending) throw new Error("Enter a valid score and maximum marks.");
      if (combined && !combinedConfirmed)
        throw new Error("Confirm that this is the combined result.");
      if (
        marks.some(
          (m) => componentId && m.component_id === componentId && m.deadline_id !== deadline.id,
        )
      )
        throw new Error("That component is linked to another assessment.");
      const { error } = await supabase.from("exam_marks").upsert(
        {
          deadline_id: deadline.id,
          batch_id: deadline.batch_id,
          user_id: user.id,
          score: Number(score),
          total: Number(total),
          weightage: weight ?? 0,
          component_id: componentId || null,
        },
        { onConflict: "deadline_id,user_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success(
        component
          ? "Score saved in assessment and Grading"
          : "Score saved; grading component not linked",
      );
      if (!inline) setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async () => {
      if (!mine) return;
      const { error } = await supabase.from("exam_marks").delete().eq("id", mine.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setScore("");
      setTotal("");
      toast.success("Score removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  if (!isMember || !user) return null;
  if (pending)
    return (
      <div className="mt-3 rounded-xl border border-border p-3 text-sm text-dim">
        {failed ? (
          <>
            <span>Couldn't load scores.</span>
            <button
              className="ml-3 text-cyan"
              onClick={() => {
                void marksQuery.refetch();
                void componentsQuery.refetch();
                void gradesQuery.refetch();
              }}
            >
              Retry
            </button>
          </>
        ) : (
          "Loading scores…"
        )}
      </div>
    );
  const busy = save.isPending || remove.isPending;
  const pct = valid ? scorePct(Number(score), Number(total)) : null;
  const points =
    valid && weight !== null ? weightedPoints(Number(score), Number(total), weight) : null;
  const field = "w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-ink";
  return (
    <div className="mt-3 rounded-xl border border-border bg-surface2/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-ink">
          My score{" "}
          {source && (
            <span className="font-mono text-cyan">
              {fmtNum(Number(source.score))}/{fmtNum(Number(source.total))}
            </span>
          )}
        </span>
        {!inline && (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={open ? inputId : undefined}
            onClick={() => setOpen(!open)}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm"
          >
            {open ? "Close" : source ? "Edit score" : "Add score"}
            {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        )}
      </div>
      {open && (
        <div id={inputId} className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-dim" htmlFor={`${inputId}-score`}>
              Score
              <input
                id={`${inputId}-score`}
                inputMode="decimal"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                disabled={busy}
                className={field}
              />
            </label>
            <label className="text-xs text-dim" htmlFor={`${inputId}-total`}>
              Out of
              <input
                id={`${inputId}-total`}
                inputMode="decimal"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                disabled={busy}
                className={field}
              />
            </label>
          </div>
          {Number(total) > 0 && (
            <input
              type="range"
              aria-label={`Score for ${deadline.title}`}
              min={0}
              max={Number(total)}
              step={0.5}
              value={Math.min(Number(total), Math.max(0, Number(score) || 0))}
              disabled={busy}
              onChange={(e) => setScore(e.target.value)}
              className="w-full accent-cyan"
            />
          )}
          <label className="block text-xs text-dim" htmlFor={`${inputId}-component`}>
            Counts towards
            <select
              id={`${inputId}-component`}
              value={componentId}
              disabled={busy}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setCombinedConfirmed(false);
              }}
              className={field}
            >
              <option value="">Score only — not linked</option>
              {candidates.map((c) => (
                <option
                  key={c.id}
                  value={c.id}
                  disabled={marks.some(
                    (m) => m.component_id === c.id && m.deadline_id !== deadline.id,
                  )}
                >
                  {c.name} · {c.weightage}%
                  {marks.some((m) => m.component_id === c.id && m.deadline_id !== deadline.id)
                    ? " · already linked"
                    : ""}
                </option>
              ))}
            </select>
          </label>
          {combined && (
            <label className="flex items-start gap-2 text-sm text-amber">
              <input
                type="checkbox"
                checked={combinedConfirmed}
                onChange={(e) => setCombinedConfirmed(e.target.checked)}
                disabled={busy}
                className="mt-1"
              />
              This score combines all work in {component?.name}.
            </label>
          )}
          {!component && <p className="text-xs text-dim">Choose where this counts in Grading.</p>}
          {pct !== null && (
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <span className="font-mono text-cyan">{pct}%</span>
              {points !== null && (
                <span>
                  {points} / {weight} course points
                </span>
              )}
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            {mine && (
              <button
                type="button"
                disabled={busy}
                aria-label={`Remove score for ${deadline.title}`}
                onClick={() => {
                  if (
                    window.confirm(
                      "Remove this score from the assessment and its linked grading component?",
                    )
                  )
                    remove.mutate();
                }}
                className="mr-auto rounded-lg border border-rose/30 px-3 py-2 text-rose"
              >
                <Trash2 className="size-4" />
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setScore(source ? String(source.score) : "");
                setTotal(source ? String(source.total) : "");
                if (!inline) setOpen(false);
              }}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              {inline ? "Reset" : "Cancel"}
            </button>
            <button
              type="button"
              disabled={busy || !valid || (combined && !combinedConfirmed)}
              onClick={() => save.mutate()}
              className="rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-ground disabled:opacity-50"
            >
              {save.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
