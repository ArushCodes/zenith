import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Award, Check, ChevronDown, ChevronUp, Pencil, Percent, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { db as supabase } from "@/lib/backend";
import { useAuth } from "@/hooks/use-auth";
import { useBatch } from "@/hooks/use-batch";
import { examMarksQuery, fmtNum, scorePct, weightedPoints } from "@/lib/marks";
import type { Deadline } from "@/lib/deadlines";

/** Personal marks entry & display for an exam: score / total / weightage → percentage. */
export function ExamMarks({
  deadline,
  defaultWeight = 20,
}: {
  deadline: Deadline;
  defaultWeight?: number;
}) {
  const { batchId, isMember } = useBatch();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: marks = [] } = useQuery(examMarksQuery(batchId, user?.id));
  const mine = marks.find((m) => m.deadline_id === deadline.id) ?? null;

  const [isOpen, setIsOpen] = useState(false);
  const [score, setScore] = useState("");
  const [total, setTotal] = useState("");
  const [weightage, setWeightage] = useState(String(defaultWeight));

  useEffect(() => {
    if (mine) {
      setScore(fmtNum(Number(mine.score)));
      setTotal(fmtNum(Number(mine.total)));
      setWeightage(fmtNum(Number(mine.weightage)) || String(defaultWeight));
    } else {
      setWeightage(String(defaultWeight));
    }
  }, [mine?.id, mine?.score, mine?.total, mine?.weightage, defaultWeight]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["exam-marks", batchId, user?.id] });

  const save = useMutation({
    mutationFn: async () => {
      const s = Number(score);
      const t = Number(total);
      const w = weightage === "" ? defaultWeight : Number(weightage);
      if (!Number.isFinite(s) || !Number.isFinite(t) || t <= 0)
        throw new Error("Enter a valid score and the total marks.");
      if (s < 0 || s > t) throw new Error("Score must be between 0 and the total marks.");
      const { error } = await supabase.from("exam_marks").upsert(
        {
          deadline_id: deadline.id,
          batch_id: deadline.batch_id,
          user_id: user!.id,
          score: s,
          total: t,
          weightage: w,
        },
        { onConflict: "deadline_id,user_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setIsOpen(false);
      toast.success("Marks saved successfully");
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
      setIsOpen(false);
      toast.success("Marks removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isMember || !user) return null;

  const s = Number(score);
  const t = Number(total);
  const w = weightage === "" ? defaultWeight : Number(weightage);
  const valid = Number.isFinite(s) && Number.isFinite(t) && t > 0 && s >= 0 && s <= t;
  const pct = valid ? scorePct(s, t) : null;
  const points = valid && w > 0 ? weightedPoints(s, t, w) : null;

  const savedS = mine ? Number(mine.score) : null;
  const savedT = mine ? Number(mine.total) : null;
  const savedW = mine ? Number(mine.weightage) : null;
  const savedPct = savedS !== null && savedT !== null ? scorePct(savedS, savedT) : null;
  const savedPoints =
    savedS !== null && savedT !== null && savedW !== null
      ? weightedPoints(savedS, savedT, savedW)
      : null;

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-border/70 bg-surface2/30 transition-all">
      {/* Header Bar / Summary Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:px-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-lg bg-cyan/12 text-cyan">
            <Percent className="size-3.5" />
          </span>
          <div>
            <p className="font-sans text-xs font-bold uppercase tracking-wider text-dim">
              Score & Marks Tracker
            </p>
            <p className="font-sans text-[11px] text-faint">Private to your account</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {mine && !isOpen && (
            <div className="flex items-center gap-2 rounded-xl border border-cyan/30 bg-cyan/10 px-3 py-1.5 shadow-xs">
              <span className="font-mono text-xs font-extrabold text-cyan">{savedPct}%</span>
              <span className="font-mono text-xs text-dim">
                ({savedS}/{savedT} marks · {savedPoints}/{savedW} pts)
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 font-sans text-xs font-semibold text-dim hover:bg-surface2 hover:text-ink transition-colors cursor-pointer"
          >
            {mine ? (
              <>
                <Pencil className="size-3 text-amber" />
                <span>{isOpen ? "Close" : "Edit Marks"}</span>
              </>
            ) : (
              <>
                <Award className="size-3 text-cyan" />
                <span>{isOpen ? "Cancel" : "Record Score"}</span>
              </>
            )}
            {isOpen ? <ChevronUp className="size-3.5 ml-0.5" /> : <ChevronDown className="size-3.5 ml-0.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Form Box */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border/60 bg-surface/80 p-4 sm:p-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block font-sans text-xs font-semibold text-dim mb-1">
                  Marks Scored
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={score}
                  onChange={(e) => setScore(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="e.g. 18"
                  className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 font-mono text-sm font-bold text-ink outline-none focus:border-cyan/70 focus:ring-2 focus:ring-cyan/20 transition-all placeholder:text-faint"
                />
              </div>

              <div>
                <label className="block font-sans text-xs font-semibold text-dim mb-1">
                  Total Marks
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={total}
                  onChange={(e) => setTotal(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="e.g. 20"
                  className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 font-mono text-sm font-bold text-ink outline-none focus:border-cyan/70 focus:ring-2 focus:ring-cyan/20 transition-all placeholder:text-faint"
                />
              </div>

              <div>
                <label className="block font-sans text-xs font-semibold text-dim mb-1">
                  Course Weight %
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={weightage}
                  onChange={(e) => setWeightage(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="20"
                  className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 font-mono text-sm font-bold text-ink outline-none focus:border-cyan/70 focus:ring-2 focus:ring-cyan/20 transition-all placeholder:text-faint"
                />
              </div>
            </div>

            {/* Real-time Calculation Result */}
            {valid && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan/30 bg-cyan/8 p-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-extrabold text-cyan">{pct}%</span>
                  <span className="font-sans text-xs text-dim">
                    ({s} of {t} marks)
                  </span>
                </div>
                {points !== null && (
                  <div className="font-mono text-xs font-bold text-ink">
                    Earned: <span className="text-cyan font-extrabold">{points}</span> / {fmtNum(w)} course points
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-4 flex items-center justify-end gap-2.5">
              {mine && (
                <button
                  type="button"
                  onClick={() => remove.mutate()}
                  disabled={remove.isPending}
                  className="flex items-center gap-1.5 rounded-xl border border-rose/30 bg-rose/10 px-3.5 py-2 font-sans text-xs font-semibold text-rose hover:bg-rose/20 transition-colors disabled:opacity-40 cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                  <span>Remove</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl border border-border bg-surface2 px-3.5 py-2 font-sans text-xs font-semibold text-dim hover:text-ink transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => save.mutate()}
                disabled={!valid || save.isPending}
                className="flex items-center gap-1.5 rounded-xl bg-cyan px-4 py-2 font-sans text-xs font-bold text-white shadow-sm hover:brightness-105 transition-all disabled:opacity-40 cursor-pointer"
              >
                <Check className="size-4" />
                <span>{save.isPending ? "Saving…" : "Save Marks"}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
