import { Fragment, useEffect, useId, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertTriangle, ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { db as supabase } from "@/lib/backend";
import { useAuth } from "@/hooks/use-auth";
import { useBatch } from "@/hooks/use-batch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  KIND_LABEL,
  PASS_LINE,
  buildCourseRows,
  componentMarksQuery,
  courseComponentsQuery,
  earnedPoints,
  round1,
  type CourseComponent,
  type CourseRow,
} from "@/lib/grading";

const KINDS = Object.keys(KIND_LABEL);

/** Per-course grading breakdown: what each piece of work is worth, what you
 *  scored on it, and where the course as a whole is heading. */
export function GradingPanel() {
  const { batchId, isMember, canManage } = useBatch();
  const { user } = useAuth();
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<CourseComponent> | null>(null);

  const { data: components = [], isLoading } = useQuery(courseComponentsQuery(batchId));
  const { data: marks = [] } = useQuery(componentMarksQuery(batchId, user?.id));

  const rows = useMemo(() => buildCourseRows(components, marks), [components, marks]);

  if (!isMember)
    return (
      <p className="mt-10 text-center font-mono text-xs text-faint">
        Grading is visible to approved batch members.
      </p>
    );

  return (
    <section className="mt-4">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">My marks</p>
        {canManage && (
          <button
            onClick={() =>
              setEditing({ batch_id: batchId!, weightage: 10, kind: "quiz", sequence: 0 })
            }
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-surface2 px-2.5 py-1.5 font-mono text-[11px] text-dim ring-1 ring-border hover:text-ink"
          >
            <Plus className="size-3.5" /> Add component
          </button>
        )}
      </div>

      {isLoading && (
        <p className="mt-6 text-center font-mono text-xs text-faint">Loading courses…</p>
      )}

      {!isLoading && rows.length === 0 && (
        <p className="mt-6 text-center font-mono text-xs text-faint">No assessments added yet.</p>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {rows.map((row) => (
          <CourseCard
            key={`${user?.id ?? "guest"}:${batchId}:${row.code}`}
            row={row}
            open={open === row.code}
            onToggle={() => setOpen(open === row.code ? null : row.code)}
            canManage={canManage}
            onEdit={(c) => setEditing(c)}
            batchId={batchId!}
            userId={user?.id}
          />
        ))}
      </div>

      {editing && canManage && (
        <ComponentDialog
          draft={editing}
          courses={rows}
          onClose={() => setEditing(null)}
          batchId={batchId!}
        />
      )}
    </section>
  );
}

function CourseCard({
  row,
  open,
  onToggle,
  canManage,
  onEdit,
  batchId,
  userId,
}: {
  row: CourseRow;
  open: boolean;
  onToggle: () => void;
  canManage: boolean;
  onEdit: (c: Partial<CourseComponent>) => void;
  batchId: string;
  userId: string | undefined;
}) {
  const detailsId = useId();
  const storageKey = userId ? `zenith.grade-plan:${userId}:${batchId}:${row.code}` : null;
  const [plan, setPlan] = useState<{
    key: string | null;
    expected: Record<string, number>;
    target: number;
  }>({ key: null, expected: {}, target: 70 });
  const { expected, target } = plan;

  useEffect(() => {
    const defaults = { key: storageKey, expected: {}, target: 70 };
    try {
      const stored: unknown = storageKey
        ? JSON.parse(sessionStorage.getItem(storageKey) ?? "null")
        : null;
      if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
        setPlan(defaults);
        return;
      }
      const draft = stored as { expected?: unknown; target?: unknown };
      const validPercent = (value: unknown): value is number =>
        typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
      const values = draft.expected;
      const restored =
        values && typeof values === "object" && !Array.isArray(values)
          ? Object.fromEntries(Object.entries(values).filter(([, value]) => validPercent(value)))
          : {};
      setPlan({
        key: storageKey,
        expected: restored,
        target: validPercent(draft.target) ? draft.target : 70,
      });
    } catch {
      setPlan(defaults);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || plan.key !== storageKey) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ expected, target }));
    } catch {
      // Planning still works when browser storage is unavailable.
    }
  }, [storageKey, plan.key, expected, target]);
  const planned =
    row.banked +
    row.components.reduce(
      (sum, c) =>
        sum +
        (c.mark ? 0 : ((expected[c.component.id] ?? 0) * Number(c.component.weightage)) / 100),
      0,
    );
  const headline = row.gradedWeight > 0 ? row.banked : null;
  const tone =
    (row.overallAtRisk && row.gradedWeight >= 100) || row.endTermAtRisk
      ? "text-rose"
      : headline === null
        ? "text-faint"
        : headline >= 70
          ? "text-evt-present"
          : "text-amber";

  return (
    <div className="overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
      <button
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={open ? detailsId : undefined}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface2/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="break-words font-display text-base font-semibold">{row.name}</span>
            {batchId === "ee4a435d-4003-4a22-940b-0ee0e676b6f5" && row.code === "HRM 1103" && (
              <span className="rounded-md bg-surface2 px-2 py-1 text-xs text-dim">Finished</span>
            )}

            <span className="rounded-md px-1.5 py-0.5 font-mono text-xs text-dim ring-1 ring-border">
              {row.credits} {row.credits === 1 ? "credit" : "credits"}
            </span>
            {row.isMlc && (
              <span className="rounded-md bg-violet/12 px-1.5 py-0.5 font-mono text-xs text-violet ring-1 ring-violet/30">
                Pass / fail
              </span>
            )}
            {row.isProvisional && (
              <span className="rounded-md bg-amber/12 px-1.5 py-0.5 font-mono text-xs text-amber ring-1 ring-amber/30">
                Weights unconfirmed
              </span>
            )}
          </span>
          <span className="mt-1 block font-mono text-xs text-dim">
            {row.gradedWeight > 0 ? `${row.gradedWeight}% graded` : "Add marks"}
          </span>
        </span>

        <span className="shrink-0 text-right">
          <span className={`block font-display text-lg font-semibold leading-none ${tone}`}>
            {headline === null ? "—" : `${headline}`}
          </span>
          <span className="mt-1 block font-mono text-xs text-dim">
            {headline === null ? "no marks yet" : "earned / 100"}
          </span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-faint transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {((row.overallAtRisk && row.gradedWeight >= 100) ||
        row.endTermAtRisk ||
        round1(row.weightSum) !== 100) && (
        <div className="flex flex-col gap-1 border-t border-border px-4 py-2">
          {row.endTermAtRisk && (
            <Warning>
              End-term below {PASS_LINE}%: course fail, regardless of overall score.
            </Warning>
          )}
          {row.overallAtRisk && row.gradedWeight >= 100 && (
            <Warning>Overall below {PASS_LINE}%: course fail.</Warning>
          )}
          {round1(row.weightSum) !== 100 && (
            <Warning>Weights total {row.weightSum}% · should be 100%.</Warning>
          )}
        </div>
      )}

      <div
        className="mx-4 mb-3 h-1.5 overflow-hidden rounded-full bg-surface2"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, row.gradedWeight)}
        aria-label={`${row.gradedWeight}% of course graded`}
      >
        <motion.div
          initial={false}
          animate={{ width: `${Math.min(100, row.gradedWeight)}%` }}
          className="h-full rounded-full bg-cyan"
        />
      </div>
      {open && (
        <div id={detailsId} className="border-t border-border">
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-dim">Saved marks</p>
              <p className="text-2xl font-bold">
                {row.banked}
                <span className="text-xs text-dim"> / 100</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-dim">Predicted total</p>
              <p
                className={`text-2xl font-bold ${planned >= target ? "text-emerald-400" : "text-cyan"}`}
              >
                {round1(planned)}
                <span className="text-xs text-dim"> / 100</span>
              </p>
            </div>
            <label className="col-span-2 text-xs text-dim sm:col-span-1">
              Your target
              <input
                aria-label={`Target for ${row.name}`}
                type="number"
                min={0}
                max={100}
                value={target}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (Number.isFinite(value))
                    setPlan((current) => ({
                      ...current,
                      target: Math.min(100, Math.max(0, value)),
                    }));
                }}
                className="mt-1 block w-full max-w-24 rounded-lg border border-border bg-surface2 px-2 py-1 text-lg font-bold text-ink"
              />
            </label>
          </div>
          <div
            className="mx-4 mb-4 h-2 rounded-full bg-surface2 overflow-hidden"
            role="meter"
            aria-label={`Predicted total for ${row.name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, planned)}
          >
            <motion.div
              initial={false}
              animate={{ width: `${Math.min(100, planned)}%` }}
              className="h-full rounded-full bg-cyan"
            />
          </div>
          <p className="px-4 pb-3 text-xs text-dim">
            Saved marks + predictions = predicted total. Final grades are relative.
          </p>
          {row.components.map((c) => (
            <Fragment key={c.component.id}>
              <ComponentRow
                component={c.component}
                pct={c.pct}
                earned={c.earned}
                markId={c.mark?.id ?? null}
                score={c.mark ? Number(c.mark.score) : null}
                total={c.mark ? Number(c.mark.total) : null}
                canManage={canManage}
                onEdit={() => onEdit(c.component)}
                batchId={batchId}
                userId={userId}
                expected={expected[c.component.id] ?? 0}
                onExpected={(value) =>
                  setPlan((current) => ({
                    ...current,
                    expected: { ...current.expected, [c.component.id]: value },
                  }))
                }
              />
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-xs leading-relaxed text-rose">
      <AlertTriangle className="mt-px size-3 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

function ComponentRow({
  component,
  pct,
  earned,
  markId,
  score,
  total,
  canManage,
  onEdit,
  batchId,
  userId,
  expected,
  onExpected,
}: {
  component: CourseComponent;
  pct: number | null;
  earned: number | null;
  markId: string | null;
  score: number | null;
  total: number | null;
  canManage: boolean;
  onEdit: () => void;
  batchId: string;
  userId: string | undefined;
  expected: number;
  onExpected: (value: number) => void;
}) {
  const queryClient = useQueryClient();
  const [s, setS] = useState(score === null ? "" : String(score));
  const [t, setT] = useState(total === null ? "" : String(total));

  useEffect(() => {
    setS(score === null ? "" : String(score));
    setT(total === null ? "" : String(total));
  }, [score, total, markId]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["component-marks", batchId, userId] });

  const save = useMutation({
    mutationFn: async () => {
      const ns = Number(s);
      const nt = Number(t);
      if (!s.trim() || !t.trim() || !Number.isFinite(ns) || !Number.isFinite(nt) || nt <= 0)
        throw new Error("Enter your score and the total it was marked out of.");
      if (ns < 0 || ns > nt) throw new Error("Score has to be between 0 and the total.");
      const { error } = await supabase
        .from("component_marks")
        .upsert(
          { component_id: component.id, batch_id: batchId, user_id: userId!, score: ns, total: nt },
          { onConflict: "component_id,user_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Marks saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clear = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("component_marks").delete().eq("id", markId!);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Marks cleared");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const weightage = Number(component.weightage);
  const preview =
    s.trim() &&
    Number(t) > 0 &&
    Number.isFinite(Number(s)) &&
    Number(s) >= 0 &&
    Number(s) <= Number(t)
      ? earnedPoints(Number(s), Number(t), weightage)
      : null;

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 break-words font-display text-sm font-semibold">
          {component.name}
          <span className="rounded-md bg-cyan/15 px-2 py-0.5 font-mono text-sm text-cyan">
            {weightage}%
          </span>
        </span>
      </span>

      {Number(t) > 0 && (
        <input
          type="range"
          aria-label={`Score for ${component.name}`}
          min="0"
          max={Number(t)}
          step="0.5"
          value={Math.min(Number(t), Math.max(0, Number(s) || 0))}
          onChange={(e) => setS(e.target.value)}
          className="w-full accent-cyan sm:w-28"
        />
      )}
      <span className="flex min-w-0 flex-wrap items-center gap-1.5">
        <input
          value={s}
          aria-label={`My marks for ${component.name}`}
          onChange={(e) => setS(e.target.value)}
          placeholder="score"
          inputMode="decimal"
          className="w-16 rounded-lg bg-surface2 px-2 py-1 text-center font-mono text-sm text-ink ring-1 ring-border outline-none focus:ring-cyan"
        />
        <span className="font-mono text-xs text-dim">/</span>
        <input
          value={t}
          aria-label={`Maximum marks for ${component.name}`}
          onChange={(e) => setT(e.target.value)}
          placeholder="out of"
          inputMode="decimal"
          className="w-16 rounded-lg bg-surface2 px-2 py-1 text-center font-mono text-sm text-ink ring-1 ring-border outline-none focus:ring-cyan"
        />
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending || clear.isPending}
          className="rounded-lg bg-cyan px-2.5 py-1 font-mono text-[11px] text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          Save
        </button>
        {markId && (
          <button
            onClick={() => clear.mutate()}
            title="Clear my marks"
            aria-label={`Clear my marks for ${component.name}`}
            disabled={save.isPending || clear.isPending}
            className="rounded-lg p-1.5 text-faint ring-1 ring-border hover:text-rose disabled:opacity-50"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
        {canManage && (
          <button
            onClick={onEdit}
            title="Edit this component"
            aria-label={`Edit ${component.name}`}
            className="rounded-lg p-1.5 text-faint ring-1 ring-border hover:text-ink"
          >
            <Pencil className="size-3.5" />
          </button>
        )}
      </span>

      <span className="w-full font-mono text-xs text-dim sm:w-auto sm:min-w-[140px] sm:text-right">
        <span className="block text-xs">Contribution</span>
        {pct === null && preview === null ? "—" : `${preview ?? earned} / ${weightage}`}
      </span>
      {!markId && (
        <div className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg bg-cyan/5 px-3 py-2">
          <label className="text-xs text-cyan shrink-0" htmlFor={`expected-${component.id}`}>
            Predict
          </label>
          <input
            id={`expected-${component.id}`}
            type="range"
            min={0}
            max={100}
            step={0.5}
            value={expected}
            onChange={(e) => onExpected(Number(e.target.value))}
            className="min-w-0 flex-1 accent-cyan"
          />
          <span className="w-12 text-right text-sm tabular-nums">{expected}%</span>
          <span className="col-start-2 col-span-2 text-right text-sm tabular-nums text-cyan">
            {round1((expected * weightage) / 100)} / {weightage}
          </span>
        </div>
      )}
    </div>
  );
}

/** Moderator editor for one grading component. */
function ComponentDialog({
  draft,
  courses,
  onClose,
  batchId,
}: {
  draft: Partial<CourseComponent>;
  courses: CourseRow[];
  onClose: () => void;
  batchId: string;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    course_code: draft.course_code ?? courses[0]?.code ?? "",
    course_name: draft.course_name ?? courses[0]?.name ?? "",
    credits: String(draft.credits ?? courses[0]?.credits ?? 3),
    name: draft.name ?? "",
    weightage: String(draft.weightage ?? 10),
    kind: draft.kind ?? "quiz",
    sequence: String(draft.sequence ?? 0),
    timing_note: draft.timing_note ?? "",
    work_mode: draft.work_mode ?? "individual",
    is_mlc: draft.is_mlc ?? false,
    is_provisional: draft.is_provisional ?? false,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["course-components", batchId] });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.course_code.trim() || !form.course_name.trim() || !form.name.trim())
        throw new Error("Course code, course name and component name are all required.");
      const payload = {
        batch_id: batchId,
        course_code: form.course_code.trim(),
        course_name: form.course_name.trim(),
        credits: Number(form.credits) || 0,
        name: form.name.trim(),
        weightage: Number(form.weightage) || 0,
        kind: form.kind as CourseComponent["kind"],
        sequence: Number(form.sequence) || 0,
        timing_note: form.timing_note.trim() || null,
        work_mode: form.work_mode as CourseComponent["work_mode"],
        is_mlc: form.is_mlc,
        is_provisional: form.is_provisional,
      };
      const { error } = draft.id
        ? await supabase.from("course_components").update(payload).eq("id", draft.id)
        : await supabase.from("course_components").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Saved");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("course_components").delete().eq("id", draft.id!);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Component removed");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const field =
    "w-full rounded-lg bg-surface2 px-2.5 py-1.5 font-mono text-sm text-ink ring-1 ring-border outline-none focus:ring-cyan";

  return (
    <Dialog open onOpenChange={(value) => !value && onClose()}>
      <DialogContent
        aria-describedby={undefined}
        className="max-w-lg gap-0 rounded-2xl bg-surface p-4 ring-1 ring-border"
      >
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="font-display text-base font-semibold text-ink">
            {draft.id ? "Edit component" : "Add component"}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="font-mono text-xs text-dim">Course code</span>
            <input
              className={field}
              value={form.course_code}
              onChange={(e) => setForm({ ...form, course_code: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-xs text-dim">Course name</span>
            <input
              className={field}
              value={form.course_name}
              onChange={(e) => setForm({ ...form, course_name: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-xs text-dim">Credits</span>
            <input
              className={field}
              value={form.credits}
              onChange={(e) => setForm({ ...form, credits: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-xs text-dim">Component name</span>
            <input
              className={field}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-xs text-dim">Weightage %</span>
            <input
              className={field}
              value={form.weightage}
              onChange={(e) => setForm({ ...form, weightage: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-xs text-dim">Type</span>
            <select
              className={field}
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as typeof form.kind })}
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-xs text-dim">Individual or group</span>
            <select
              className={field}
              value={form.work_mode}
              onChange={(e) =>
                setForm({ ...form, work_mode: e.target.value as typeof form.work_mode })
              }
            >
              <option value="individual">Individual</option>
              <option value="group">Group</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-xs text-dim">Order</span>
            <input
              className={field}
              value={form.sequence}
              onChange={(e) => setForm({ ...form, sequence: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="font-mono text-xs text-dim">When it happens</span>
            <input
              className={field}
              value={form.timing_note}
              onChange={(e) => setForm({ ...form, timing_note: e.target.value })}
              placeholder="e.g. after session 10"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 font-mono text-xs text-dim">
            <input
              type="checkbox"
              checked={form.is_mlc}
              onChange={(e) => setForm({ ...form, is_mlc: e.target.checked })}
            />
            Pass / fail course, no CGPA
          </label>
          <label className="flex items-center gap-1.5 font-mono text-xs text-dim">
            <input
              type="checkbox"
              checked={form.is_provisional}
              onChange={(e) => setForm({ ...form, is_provisional: e.target.checked })}
            />
            Weights unconfirmed
          </label>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || remove.isPending}
            className="rounded-lg bg-cyan px-3 py-1.5 font-mono text-[11px] text-primary-foreground hover:opacity-90"
          >
            {save.isPending ? "Saving…" : "Save"}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 font-mono text-[11px] text-dim ring-1 ring-border hover:text-ink"
          >
            Cancel
          </button>
          {draft.id && (
            <button
              onClick={() => remove.mutate()}
              disabled={save.isPending || remove.isPending}
              className="ml-auto rounded-lg px-3 py-1.5 font-mono text-[11px] text-rose ring-1 ring-rose/30 hover:bg-rose/10"
            >
              Delete
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
