import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Award,
  Calculator,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  HelpCircle,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { IPM1_COURSES, type CourseGradingInfo } from "@/components/grading/GradingPanel";
import { autoColor } from "@/lib/courses";
import { trackActivity } from "@/lib/telemetry";

const GRADE_POINTS: Record<string, { gp: number; label: string; desc: string }> = {
  "A+": { gp: 10.0, label: "A+", desc: "Outstanding (10.0)" },
  A: { gp: 9.5, label: "A", desc: "Excellent (9.5)" },
  "A-": { gp: 9.0, label: "A-", desc: "Very Good (9.0)" },
  "B+": { gp: 8.5, label: "B+", desc: "Good (8.5)" },
  B: { gp: 8.0, label: "B", desc: "Above Average (8.0)" },
  "B-": { gp: 7.5, label: "B-", desc: "Average (7.5)" },
  "C+": { gp: 7.0, label: "C+", desc: "Satisfactory (7.0)" },
  C: { gp: 6.5, label: "C", desc: "Pass (6.5)" },
  "C-": { gp: 6.0, label: "C-", desc: "Marginal (6.0)" },
  D: { gp: 5.0, label: "D", desc: "Poor (5.0)" },
  F: { gp: 0.0, label: "F", desc: "Fail (0.0)" },
};

type Props = {
  courses?: CourseGradingInfo[];
  batchId?: string;
};

export function GpaSimulator({ courses = IPM1_COURSES, batchId }: Props) {
  // Course-specific grade selections
  const [grades, setGrades] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const c of courses) {
      init[c.code] = "A"; // Default to A (9.5)
    }
    return init;
  });

  // Cumulative CGPA inputs
  const [priorCredits, setPriorCredits] = useState<number>(0);
  const [priorCgpa, setPriorCgpa] = useState<string>("");
  const [targetCgpa, setTargetCgpa] = useState<string>("8.0");

  // Calculations
  const { totalCredits, totalQualityPoints, tgpa, standing } = useMemo(() => {
    let creds = 0;
    let qp = 0;

    for (const c of courses) {
      const gKey = grades[c.code] || "B";
      const gp = GRADE_POINTS[gKey]?.gp ?? 8.0;
      creds += c.credits;
      qp += c.credits * gp;
    }

    const calculatedTgpa = creds > 0 ? Number((qp / creds).toFixed(2)) : 0;

    let standingInfo = {
      label: "Good Academic Standing",
      badge: "bg-cyan/15 text-cyan border-cyan/30",
      icon: <Sparkles className="size-4" />,
    };

    if (calculatedTgpa >= 9.0) {
      standingInfo = {
        label: "Dean's Merit List / Distinction 🌟",
        badge: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
        icon: <Award className="size-4" />,
      };
    } else if (calculatedTgpa >= 8.0) {
      standingInfo = {
        label: "First Class with Honours ✨",
        badge: "bg-cyan/15 text-cyan border-cyan/30",
        icon: <Sparkles className="size-4" />,
      };
    } else if (calculatedTgpa < 6.0) {
      standingInfo = {
        label: "Academic Review / Warning ⚠️",
        badge: "bg-rose/15 text-rose border-rose/30",
        icon: <GraduationCap className="size-4" />,
      };
    }

    return {
      totalCredits: creds,
      totalQualityPoints: qp,
      tgpa: calculatedTgpa,
      standing: standingInfo,
    };
  }, [courses, grades]);

  // Projected Cumulative CGPA
  const projectedCumulative = useMemo(() => {
    const priorNum = parseFloat(priorCgpa);
    if (isNaN(priorNum) || priorCredits <= 0) return null;

    const priorQp = priorCredits * priorNum;
    const combinedCredits = priorCredits + totalCredits;
    const combinedQp = priorQp + totalQualityPoints;
    return Number((combinedQp / combinedCredits).toFixed(2));
  }, [priorCredits, priorCgpa, totalCredits, totalQualityPoints]);

  // Target CGPA Requirement
  const requiredTgpaForTarget = useMemo(() => {
    const target = parseFloat(targetCgpa);
    if (isNaN(target)) return null;

    const priorNum = parseFloat(priorCgpa);
    if (isNaN(priorNum) || priorCredits <= 0) {
      return target; // For Term 1, target is TGPA
    }

    const totalCombined = priorCredits + totalCredits;
    const neededCombinedQp = totalCombined * target;
    const neededTgpa = (neededCombinedQp - priorCredits * priorNum) / totalCredits;
    return Number(neededTgpa.toFixed(2));
  }, [targetCgpa, priorCredits, priorCgpa, totalCredits]);

  const handleGradeChange = (code: string, grade: string) => {
    const next = { ...grades, [code]: grade };
    setGrades(next);
  };

  const handleReset = () => {
    const reset: Record<string, string> = {};
    for (const c of courses) reset[c.code] = "A";
    setGrades(reset);
    toast.success("All grades reset to A (9.5)");
  };

  const logSimulation = () => {
    void trackActivity({
      action: "gpa_simulation",
      title: `Simulated TGPA: ${tgpa}`,
      batchId,
      details: {
        tgpa,
        totalCredits,
        projectedCumulative,
        grades,
      },
    });
    toast.success("GPA Simulation saved to activity tracker");
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Projected TGPA Hero */}
      <div className="rounded-2xl border border-border/80 bg-surface/90 p-5 sm:p-6 backdrop-blur-md shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan">
              Interactive "What-If" Calculator
            </span>
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-ink">
              Trimester GPA & Target CGPA Simulator
            </h2>
            <p className="text-xs text-dim">
              Adjust expected grades for each course to calculate your projected TGPA and check TAPMI honours standing.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-surface2 px-3 py-1.5 text-xs font-semibold text-dim hover:text-ink transition-colors"
            >
              <RotateCcw className="size-3.5" />
              <span>Reset</span>
            </button>
            <button
              onClick={logSimulation}
              className="flex items-center gap-1.5 rounded-xl bg-cyan px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-cyan/90 transition-all"
            >
              <Zap className="size-3.5" />
              <span>Save & Log</span>
            </button>
          </div>
        </div>

        {/* Big Score Cards */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* TGPA Card */}
          <div className="rounded-xl border border-border bg-surface2/50 p-4 space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
              Projected Trimester GPA (TGPA)
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl sm:text-4xl font-extrabold text-cyan">
                {tgpa.toFixed(2)}
              </span>
              <span className="font-mono text-xs text-dim">/ 10.0</span>
            </div>
            <div className="pt-1">
              <span
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold border ${standing.badge}`}
              >
                {standing.icon}
                <span>{standing.label}</span>
              </span>
            </div>
          </div>

          {/* Credits & Quality Points */}
          <div className="rounded-xl border border-border bg-surface2/50 p-4 space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
              Total Trimester Credits
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl sm:text-4xl font-extrabold text-ink">
                {totalCredits}
              </span>
              <span className="font-mono text-xs text-dim">Credits</span>
            </div>
            <p className="text-[11px] text-dim">
              Quality points: <strong className="text-ink">{totalQualityPoints.toFixed(1)}</strong>
            </p>
          </div>

          {/* Projected Cumulative CGPA */}
          <div className="rounded-xl border border-border bg-surface2/50 p-4 space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
              Projected Cumulative CGPA
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl sm:text-4xl font-extrabold text-emerald-500">
                {projectedCumulative ? projectedCumulative.toFixed(2) : tgpa.toFixed(2)}
              </span>
              <span className="font-mono text-xs text-dim">/ 10.0</span>
            </div>
            <p className="text-[11px] text-dim">
              {priorCredits > 0
                ? `Includes ${priorCredits} past credits`
                : "Term 1 (First Trimester baseline)"}
            </p>
          </div>
        </div>
      </div>

      {/* Course-By-Course Grade Sliders / Dropdowns */}
      <div className="rounded-2xl border border-border/80 bg-surface/90 p-5 sm:p-6 backdrop-blur-md shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-sm font-bold text-ink">
              Course Grade Predictions ({courses.length} Courses)
            </h3>
            <p className="text-xs text-dim">
              Select your expected grade for each course based on quizzes, midterms, and endterms.
            </p>
          </div>
          <span className="font-mono text-[11px] font-semibold text-cyan">
            {totalCredits} Credits Total
          </span>
        </div>

        <div className="divide-y divide-border/60 rounded-xl border border-border bg-surface">
          {courses.map((c) => {
            const currentGrade = grades[c.code] || "A";
            const gp = GRADE_POINTS[currentGrade]?.gp ?? 9.5;
            const courseColor = autoColor(c.name);

            return (
              <div
                key={c.code}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-surface2/30 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className="size-2.5 rounded-full shrink-0 mt-1.5"
                    style={{ backgroundColor: courseColor }}
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-cyan">{c.code}</span>
                      <h4 className="font-display text-sm font-bold text-ink truncate">{c.name}</h4>
                    </div>
                    <p className="text-[11px] text-dim">
                      {c.faculty} · <strong className="text-ink">{c.credits} Credits</strong> (
                      {c.sessions} sessions)
                    </p>
                  </div>
                </div>

                {/* Grade Selector */}
                <div className="flex items-center gap-3 self-end sm:self-center">
                  <div className="text-right">
                    <span className="font-mono text-xs font-bold text-ink">
                      {GRADE_POINTS[currentGrade]?.desc}
                    </span>
                    <p className="font-mono text-[10px] text-faint">
                      Contribution: {(c.credits * gp).toFixed(1)} pts
                    </p>
                  </div>

                  <select
                    value={currentGrade}
                    onChange={(e) => handleGradeChange(c.code, e.target.value)}
                    className="rounded-xl border border-border bg-surface2 px-3 py-1.5 text-xs font-bold text-ink focus:border-cyan focus:outline-hidden cursor-pointer"
                  >
                    {Object.entries(GRADE_POINTS).map(([k, val]) => (
                      <option key={k} value={k}>
                        {k} ({val.gp.toFixed(1)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cumulative CGPA & Goal Solver */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Past Trimester Carry-over */}
        <div className="rounded-2xl border border-border/80 bg-surface/90 p-5 backdrop-blur-md shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Calculator className="size-4 text-cyan" />
            <h4 className="font-display text-sm font-bold text-ink">
              Prior Trimesters Cumulative Carry-over
            </h4>
          </div>
          <p className="text-xs text-dim">
            If you are in IPM 2 or IPM 3 (or later trimesters), enter your past completed credits and CGPA.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-dim mb-1">
                Completed Credits
              </label>
              <input
                type="number"
                min="0"
                value={priorCredits || ""}
                onChange={(e) => setPriorCredits(Number(e.target.value) || 0)}
                placeholder="0 (Term 1)"
                className="w-full rounded-xl border border-border bg-surface px-3 py-1.5 text-xs text-ink focus:border-cyan focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-dim mb-1">
                Past CGPA
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={priorCgpa}
                onChange={(e) => setPriorCgpa(e.target.value)}
                placeholder="e.g. 8.25"
                className="w-full rounded-xl border border-border bg-surface px-3 py-1.5 text-xs text-ink focus:border-cyan focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Goal Solver */}
        <div className="rounded-2xl border border-border/80 bg-surface/90 p-5 backdrop-blur-md shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-emerald-500" />
            <h4 className="font-display text-sm font-bold text-ink">Target CGPA Goal Solver</h4>
          </div>
          <p className="text-xs text-dim">
            What average grade point do you need this trimester to hit your target CGPA?
          </p>

          <div className="flex items-center gap-3 pt-1">
            <div className="flex-1">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-dim mb-1">
                Desired Target CGPA
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={targetCgpa}
                onChange={(e) => setTargetCgpa(e.target.value)}
                placeholder="8.0"
                className="w-full rounded-xl border border-border bg-surface px-3 py-1.5 text-xs text-ink focus:border-cyan focus:outline-hidden"
              />
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center min-w-[120px]">
              <span className="font-mono text-[9px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Required TGPA
              </span>
              <p className="font-display text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {requiredTgpaForTarget !== null ? (
                  requiredTgpaForTarget > 10 ? (
                    <span className="text-rose text-xs">Exceeds 10.0</span>
                  ) : (
                    requiredTgpaForTarget.toFixed(2)
                  )
                ) : (
                  "—"
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
