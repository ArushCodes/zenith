import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useBatch } from "@/hooks/use-batch";
import { buildCourseRows, componentMarksQuery, courseComponentsQuery } from "@/lib/grading";
import { autoColor } from "@/lib/courses";

export function ScoreTargets() {
  const { batchId } = useBatch();
  const { user } = useAuth();
  const reduced = useReducedMotion();
  const { data: components = [], isLoading } = useQuery(courseComponentsQuery(batchId));
  const { data: marks = [] } = useQuery(componentMarksQuery(batchId, user?.id));
  const rows = useMemo(() => buildCourseRows(components, marks), [components, marks]);
  const [selected, setSelected] = useState("");
  const [plans, setPlans] = useState<Record<string, number>>({});
  const [target, setTarget] = useState(70);
  const row = rows.find((r) => r.code === selected) ?? rows[0];
  if (isLoading) return <p className="p-4 text-dim">Loading courses…</p>;
  if (!row) return <p className="p-4 text-dim">No assessment weights added yet.</p>;
  const parts = row.components.map((c) => {
    const pct = plans[c.component.id] ?? c.pct ?? 0;
    return { ...c, pct, weighted: (pct * Number(c.component.weightage)) / 100 };
  });
  const total = parts.reduce((sum, c) => sum + c.weighted, 0);
  const remaining = Math.max(0, row.weightSum - row.gradedWeight);
  const needed = remaining > 0 ? Math.max(0, ((target - row.banked) / remaining) * 100) : null;
  const inputClass =
    "w-20 rounded-lg border border-border bg-surface2 px-2 py-2 text-center text-sm text-ink";
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label="Target course"
          value={row.code}
          onChange={(e) => setSelected(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-border bg-surface2 p-3 text-sm font-semibold"
        >
          {rows.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => setPlans({})}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
        >
          <RotateCcw className="size-4" />
          Reset
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-dim">Planned score</p>
          <p className="mt-1 text-3xl font-bold text-cyan">
            {total.toFixed(1)}
            <span className="text-sm text-dim"> / 100</span>
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <label className="flex items-center justify-between gap-2 text-sm">
            Target
            <input
              aria-label="Course target"
              type="number"
              min={0}
              max={100}
              value={target}
              onChange={(e) => setTarget(Math.min(100, Math.max(0, Number(e.target.value))))}
              className={inputClass}
            />
          </label>
          <input
            aria-label="Target score slider"
            type="range"
            min={0}
            max={100}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            className="mt-4 w-full accent-cyan"
          />
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-dim">Needed on ungraded work</p>
          <p className="mt-1 text-2xl font-bold">
            {needed === null
              ? row.banked >= target
                ? "Target reached"
                : "No work left"
              : needed > 100
                ? "Out of reach"
                : `${needed.toFixed(1)}%`}
          </p>
        </div>
      </div>
      {(row.isProvisional || row.weightSum !== 100) && (
        <p className="text-sm text-amber">
          {row.isProvisional ? "Weights unconfirmed" : `Weights total ${row.weightSum}%`}
        </p>
      )}
      <div
        className="flex h-3 overflow-hidden rounded-full bg-surface2"
        aria-label={`Planned course score ${total.toFixed(1)} out of 100`}
      >
        {parts.map((c) => (
          <motion.div
            key={c.component.id}
            initial={false}
            animate={{ width: `${c.weighted}%` }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            style={{ background: autoColor(c.component.name) }}
          />
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="grid grid-cols-[1fr_auto] bg-surface2 px-4 py-3 text-sm text-dim">
          <span>Component · weight</span>
          <span>Weighted score</span>
        </div>
        {parts.map((c) => {
          const color = autoColor(c.component.name);
          return (
            <div key={c.component.id} className="border-t border-border bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">
                  {c.component.name} <span style={{ color }}>{c.component.weightage}%</span>
                </span>
                <span className="font-mono text-sm">
                  {c.weighted.toFixed(1)} / {c.component.weightage}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <input
                  aria-label={`Planned score for ${c.component.name}`}
                  type="range"
                  min={0}
                  max={100}
                  step={0.5}
                  value={c.pct}
                  onChange={(e) => setPlans({ ...plans, [c.component.id]: Number(e.target.value) })}
                  style={{ accentColor: color }}
                  className="min-w-0 flex-1"
                />
                <input
                  aria-label={`Planned percentage for ${c.component.name}`}
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={Number(c.pct.toFixed(2))}
                  onChange={(e) =>
                    setPlans({
                      ...plans,
                      [c.component.id]: Math.min(100, Math.max(0, Number(e.target.value))),
                    })
                  }
                  className={inputClass}
                />
                <span className="text-sm text-dim">%</span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-dim">
        What-if scores · saved marks stay unchanged. Final grades are relative.
      </p>
    </section>
  );
}
