import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, GraduationCap, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useBatch } from "@/hooks/use-batch";
import { NewBatchDialog } from "@/components/board/NewBatchDialog";
import { formatBatchLabel, type BatchNode } from "@/lib/batches";

/** University → institution → programme → batch, built from the batch tree so
 *  every batch (and any future one) slots into the right branch on its own. */
type Tree = {
  name: string;
  institutions: { name: string; programmes: { name: string; batches: BatchNode[] }[] }[];
}[];

function buildTree(batches: BatchNode[]): Tree {
  const out: Tree = [];
  for (const b of batches) {
    // The top level is the university (MAHE); schools inside it are the
    // institutions (TAPMI), and programmes (IPM) hold the year batches.
    const uniName = b.institution_name;
    let uni = out.find((u) => u.name === uniName);
    if (!uni) {
      uni = { name: uniName, institutions: [] };
      out.push(uni);
    }
    let inst = uni.institutions.find((i) => i.name === b.school_name);
    if (!inst) {
      inst = { name: b.school_name, programmes: [] };
      uni.institutions.push(inst);
    }
    let prog = inst.programmes.find((p) => p.name === b.programme_name);
    if (!prog) {
      prog = { name: b.programme_name, batches: [] };
      inst.programmes.push(prog);
    }
    prog.batches.push(b);
  }
  for (const u of out)
    for (const i of u.institutions)
      for (const p of i.programmes)
        p.batches.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

function years(b: BatchNode) {
  if (b.start_year && b.end_year) return `${b.start_year}–${b.end_year}`;
  if (b.start_year) return `${b.start_year}`;
  return "";
}

export function BatchSelector() {
  const { isAdmin } = useAuth();
  const { batches, batch, batchId, setBatchId } = useBatch();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const activeInfo = batch ? formatBatchLabel(batch) : null;

  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-xl bg-surface2 px-2.5 sm:px-3 py-1.5 text-left ring-1 ring-border transition-colors hover:ring-cyan/40 cursor-pointer"
        >
          <GraduationCap className="size-3.5 sm:size-4 shrink-0 text-cyan" />
          <span className="min-w-0">
            <span className="block truncate font-display text-xs sm:text-sm font-bold leading-tight text-ink">
              {activeInfo ? activeInfo.code : "Batch"}
            </span>
            {activeInfo?.years && (
              <span className="hidden sm:block truncate font-mono text-[10px] text-faint">
                {activeInfo.years}
              </span>
            )}
          </span>
          <ChevronDown className="size-3 sm:size-3.5 shrink-0 text-dim" />
        </button>

        <AnimatePresence>
          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                className="absolute right-0 z-50 mt-2 max-h-[70vh] w-64 overflow-auto rounded-xl bg-surface p-2 shadow-2xl shadow-black/20 ring-1 ring-border"
              >
                <div className="px-2.5 py-1.5 border-b border-border/60 mb-1">
                  <p className="font-mono text-[9px] uppercase tracking-wider text-dim">
                    Select Academic Cohort
                  </p>
                </div>

                {batches.length === 0 ? (
                  <p className="px-3 py-4 text-center font-mono text-[11px] text-faint">
                    No batches found.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {batches.map((b) => {
                      const bInfo = formatBatchLabel(b);
                      const isSelected = b.id === batchId;
                      return (
                        <button
                          key={b.id}
                          onClick={() => {
                            setBatchId(b.id);
                            setOpen(false);
                          }}
                          className={`flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-cyan/12 text-cyan font-bold"
                              : "hover:bg-surface2 text-ink font-medium"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold leading-tight">{bInfo.code}</p>
                            <p className="truncate font-mono text-[10px] text-dim">{bInfo.years || years(b)}</p>
                          </div>
                          {isSelected && <Check className="size-3.5 shrink-0 text-cyan" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {isAdmin && (
                  <button
                    onClick={() => {
                      setOpen(false);
                      setCreating(true);
                    }}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-border px-3 py-2 text-left font-mono text-[11px] uppercase tracking-wide text-cyan transition-colors hover:bg-surface2 cursor-pointer"
                  >
                    <Plus className="size-3.5" /> New batch
                  </button>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {creating && <NewBatchDialog onClose={() => setCreating(false)} />}
    </div>
  );
}
