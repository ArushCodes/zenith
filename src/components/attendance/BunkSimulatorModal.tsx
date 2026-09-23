import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Moon,
  Palmtree,
  ShieldAlert,
  Sparkles,
  Sun,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  SAFE_LINE,
  HARD_LINE,
  CONTINUOUS_ABSENCE_DAYS,
  PENALTY_PER_SESSION,
  plannedFor,
  subjectKeyOf,
} from "@/lib/attendance";
import type { AttendanceMark, ClassSession } from "@/lib/batches";
import { isTeachingClass, autoColor } from "@/lib/courses";
import { trackActivity } from "@/lib/telemetry";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessions: ClassSession[];
  marks: AttendanceMark[];
  batchId?: string;
  onApplyPlannedLeave?: (sessionIds: string[]) => void;
};

type Preset = "tomorrow" | "friday" | "weekend" | "custom";

export function BunkSimulatorModal({
  open,
  onOpenChange,
  sessions,
  marks,
  batchId,
  onApplyPlannedLeave,
}: Props) {
  const [preset, setPreset] = useState<Preset>("tomorrow");
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });

  // Handle Preset Selection
  const applyPreset = (p: Preset) => {
    setPreset(p);
    const now = new Date();
    if (p === "tomorrow") {
      const tom = new Date(now);
      tom.setDate(tom.getDate() + 1);
      const str = tom.toISOString().slice(0, 10);
      setStartDate(str);
      setEndDate(str);
    } else if (p === "friday") {
      const fri = new Date(now);
      const day = fri.getDay();
      const diff = (5 - day + 7) % 7 || 7;
      fri.setDate(fri.getDate() + diff);
      const str = fri.toISOString().slice(0, 10);
      setStartDate(str);
      setEndDate(str);
    } else if (p === "weekend") {
      // Upcoming Friday to Monday
      const fri = new Date(now);
      const day = fri.getDay();
      const diff = (5 - day + 7) % 7 || 7;
      fri.setDate(fri.getDate() + diff);
      const mon = new Date(fri);
      mon.setDate(mon.getDate() + 3);
      setStartDate(fri.toISOString().slice(0, 10));
      setEndDate(mon.toISOString().slice(0, 10));
    }
  };

  // Find all teaching sessions falling within the simulated range
  const impactedSessions = useMemo(() => {
    const start = new Date(`${startDate}T00:00:00Z`).getTime();
    const end = new Date(`${endDate}T23:59:59Z`).getTime();

    return sessions.filter((s) => {
      if (!isTeachingClass(s)) return false;
      const t = new Date(s.starts_at).getTime();
      return t >= start && t <= end;
    });
  }, [sessions, startDate, endDate]);

  // Aggregate current attendance marks per subject
  const currentSubjectStats = useMemo(() => {
    const map = new Map<
      string,
      {
        subject: string;
        attended: number;
        scheduled: number;
        absent: number;
        plannedTotal: number;
      }
    >();

    // Index all sessions that have occurred so far or are scheduled
    for (const s of sessions) {
      if (!isTeachingClass(s)) return map;
      const key = subjectKeyOf(s.subject_name || "General");
      const existing = map.get(key) || {
        subject: s.subject_name || "General",
        attended: 0,
        scheduled: 0,
        absent: 0,
        plannedTotal: plannedFor(s.subject_name || "General", 24),
      };
      existing.scheduled += 1;
      map.set(key, existing);
    }

    // Now count actual attendance marks
    for (const m of marks) {
      const s = sessions.find((x) => x.id === m.session_id);
      if (!s) continue;
      const key = subjectKeyOf(s.subject_name || "General");
      const item = map.get(key);
      if (!item) continue;
      if (m.status === "attended") item.attended += 1;
      if (m.status === "absent" || m.status === "pl" || m.status === "il") item.absent += 1;
    }

    return map;
  }, [sessions, marks]);

  // Calculate course-by-course impact
  const simulationResults = useMemo(() => {
    const subjectMissCounts = new Map<string, number>();
    for (const s of impactedSessions) {
      const key = subjectKeyOf(s.subject_name || "General");
      subjectMissCounts.set(key, (subjectMissCounts.get(key) || 0) + 1);
    }

    const courses = Array.from(currentSubjectStats.entries()).map(([key, data]) => {
      const willMiss = subjectMissCounts.get(key) || 0;
      const planned = data.plannedTotal;
      // Current percentage (if no classes held yet, assume 100%)
      const currentMisses = data.absent;
      const currentPct = Math.max(
        0,
        Math.round(((planned - currentMisses) / planned) * 100)
      );

      // Projected percentage after simulated misses
      const projectedMisses = currentMisses + willMiss;
      const projectedPct = Math.max(
        0,
        Math.round(((planned - projectedMisses) / planned) * 100)
      );

      // Distance to safe line (85%)
      const safeMissAllowed = Math.floor(planned * (1 - SAFE_LINE / 100));
      const remainingSafeMisses = Math.max(0, safeMissAllowed - projectedMisses);

      // Penalty check
      const missesBelowSafe = Math.max(0, projectedMisses - safeMissAllowed);
      const gradePenaltyScore = missesBelowSafe * PENALTY_PER_SESSION;

      let status: "safe" | "warn" | "danger" = "safe";
      if (projectedPct < HARD_LINE) {
        status = "danger";
      } else if (projectedPct < SAFE_LINE) {
        status = "warn";
      }

      return {
        subject: data.subject,
        willMiss,
        currentPct,
        projectedPct,
        remainingSafeMisses,
        gradePenaltyScore,
        status,
      };
    });

    // Check consecutive days spanned
    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();
    const daysSpanned = Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
    const continuousAbsenceBreached = daysSpanned > CONTINUOUS_ABSENCE_DAYS;

    // Overall verdict
    const hasDanger = courses.some((c) => c.status === "danger") || continuousAbsenceBreached;
    const hasWarn = courses.some((c) => c.status === "warn");

    let verdict: "safe" | "warn" | "danger" = "safe";
    if (hasDanger) verdict = "danger";
    else if (hasWarn) verdict = "warn";

    return {
      courses: courses.filter((c) => c.willMiss > 0 || c.currentPct < 90),
      totalMissedClasses: impactedSessions.length,
      daysSpanned,
      continuousAbsenceBreached,
      verdict,
    };
  }, [currentSubjectStats, impactedSessions, startDate, endDate]);

  if (!open) return null;

  const handleSimulateTelemetry = () => {
    void trackActivity({
      action: "bunk_simulation",
      title: `Simulated Bunk: ${simulationResults.verdict.toUpperCase()}`,
      batchId,
      details: {
        startDate,
        endDate,
        totalClasses: simulationResults.totalMissedClasses,
        verdict: simulationResults.verdict,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-xl rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-cyan/12 text-cyan border border-cyan/25">
              <Palmtree className="size-5" />
            </span>
            <div>
              <h3 className="font-display text-base font-bold text-ink">
                Can I Sleep In? — Bunk & Trip Simulator
              </h3>
              <p className="text-[11px] text-dim">
                Simulate attendance impact under TAPMI's 85% safe line and continuous absence policy
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-1.5 text-dim hover:text-ink hover:bg-surface2"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => applyPreset("tomorrow")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
              preset === "tomorrow"
                ? "bg-cyan text-white shadow-xs"
                : "border border-border bg-surface2/50 text-dim hover:text-ink"
            }`}
          >
            Tomorrow Morning
          </button>
          <button
            onClick={() => applyPreset("friday")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
              preset === "friday"
                ? "bg-cyan text-white shadow-xs"
                : "border border-border bg-surface2/50 text-dim hover:text-ink"
            }`}
          >
            Upcoming Friday
          </button>
          <button
            onClick={() => applyPreset("weekend")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
              preset === "weekend"
                ? "bg-cyan text-white shadow-xs"
                : "border border-border bg-surface2/50 text-dim hover:text-ink"
            }`}
          >
            Long Weekend (Fri–Mon)
          </button>
          <button
            onClick={() => setPreset("custom")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
              preset === "custom"
                ? "bg-cyan text-white shadow-xs"
                : "border border-border bg-surface2/50 text-dim hover:text-ink"
            }`}
          >
            Custom Dates
          </button>
        </div>

        {/* Date Inputs */}
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/70 bg-surface2/30 p-3">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-dim mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPreset("custom");
              }}
              className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-cyan focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-dim mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPreset("custom");
              }}
              className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-cyan focus:outline-hidden"
            />
          </div>
        </div>

        {/* Big Verdict Card */}
        <div>
          {simulationResults.verdict === "safe" && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-800 dark:text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-emerald-500" />
                <h4 className="font-display text-sm font-bold">
                  Safe to Sleep In! 🌴
                </h4>
              </div>
              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                You will miss{" "}
                <span className="font-bold">{simulationResults.totalMissedClasses} session(s)</span>.
                All your courses stay safely above the 85% attendance mark with zero grade penalty.
              </p>
            </div>
          )}

          {simulationResults.verdict === "warn" && (
            <div className="rounded-xl border border-amber/30 bg-amber/10 p-4 text-amber-800 dark:text-amber-300">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-amber" />
                <h4 className="font-display text-sm font-bold">
                  Caution: Grade Point Penalty Warning ⚠️
                </h4>
              </div>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                Missing these classes will pull one or more courses into the 70%–85% bracket.
                TAPMI policy deducts 0.5 grade points per session missed below 85%.
              </p>
            </div>
          )}

          {simulationResults.verdict === "danger" && (
            <div className="rounded-xl border border-rose/30 bg-rose/10 p-4 text-rose-800 dark:text-rose-300">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-5 text-rose" />
                <h4 className="font-display text-sm font-bold">
                  High Risk: Do Not Bunk ⛔
                </h4>
              </div>
              <p className="mt-1 text-xs text-rose-700 dark:text-rose-400">
                {simulationResults.continuousAbsenceBreached
                  ? `Continuous absence limit of ${CONTINUOUS_ABSENCE_DAYS} days exceeded. Automatic course withdrawal required under institute guidelines.`
                  : "Attendance in one or more subjects will plunge below the critical 70% threshold, resulting in an Incomplete (I) grade."}
              </p>
            </div>
          )}
        </div>

        {/* Course By Course Impact */}
        <div className="space-y-2">
          <h5 className="font-display text-xs font-bold uppercase tracking-wider text-dim">
            Impacted Courses Breakdown
          </h5>

          {simulationResults.courses.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface2/30 p-4 text-center text-xs text-dim">
              No academic classes scheduled during this date range! Enjoy your break.
            </div>
          ) : (
            <div className="divide-y divide-border/60 rounded-xl border border-border bg-surface">
              {simulationResults.courses.map((c) => {
                const color = autoColor(c.subject);
                return (
                  <div key={c.subject} className="flex items-center justify-between p-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
                      <div>
                        <p className="font-display font-semibold text-ink">{c.subject}</p>
                        <p className="text-[10px] text-dim">
                          {c.willMiss > 0 ? `Missing ${c.willMiss} session(s)` : "No sessions missed"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="font-mono text-xs font-bold text-ink">
                          {c.currentPct}% →{" "}
                          <span
                            className={
                              c.status === "danger"
                                ? "text-rose"
                                : c.status === "warn"
                                ? "text-amber"
                                : "text-emerald-500"
                            }
                          >
                            {c.projectedPct}%
                          </span>
                        </span>
                        {c.gradePenaltyScore > 0 && (
                          <p className="font-mono text-[10px] text-rose">
                            -{c.gradePenaltyScore} grade pts
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border/60 pt-3">
          <button
            onClick={() => {
              handleSimulateTelemetry();
              toast.success("Simulation recorded to activity tracker");
              onOpenChange(false);
            }}
            className="rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-surface2 transition-colors"
          >
            Done
          </button>

          {onApplyPlannedLeave && impactedSessions.length > 0 && (
            <button
              onClick={() => {
                onApplyPlannedLeave(impactedSessions.map((s) => s.id));
                handleSimulateTelemetry();
                toast.success(`Marked ${impactedSessions.length} session(s) as Planned Leave`);
                onOpenChange(false);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-cyan px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-cyan/90 transition-all"
            >
              <Zap className="size-3.5" />
              <span>Mark as Planned Leave (PL)</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
