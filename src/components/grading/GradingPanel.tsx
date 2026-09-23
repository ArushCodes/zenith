import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { BookOpen, Award, CheckCircle2, ChevronRight, FileText, UserCheck, ShieldAlert, GraduationCap, PieChart } from "lucide-react";
import { Donut } from "@/components/ui/donut";

import { autoColor } from "@/lib/courses";

function cleanDescription(text: string, val: number): string {
  if (!text || text === "—" || text === `${val}%`) return "";
  let cleaned = text.trim();
  const pctPrefixRegex = new RegExp(`^${val}%\\s*\\(?`, "i");
  if (pctPrefixRegex.test(cleaned)) {
    cleaned = cleaned.replace(pctPrefixRegex, "");
    if (cleaned.endsWith(")")) {
      cleaned = cleaned.slice(0, -1);
    }
  }
  return cleaned.trim();
}

export type CourseGradingInfo = {
  code: string;
  name: string;
  credits: number;
  sessions: number;
  faculty: string;
  midtermVal: number;
  midtermText: string;
  endtermVal: number;
  endtermText: string;
  quizzesVal: number;
  quizzesText: string;
  projectVal: number;
  projectText: string;
  assignmentsVal: number;
  assignmentsText: string;
  notes?: string[];
};

export const IPM1_COURSES: CourseGradingInfo[] = [
  {
    code: "ITS 1101",
    name: "Introduction to AI",
    credits: 2,
    sessions: 16,
    faculty: "Prof. Pallavi Upadhyaya",
    midtermVal: 40,
    midtermText: "Mid-Term Exam (Sept 17)",
    endtermVal: 0,
    endtermText: "—",
    quizzesVal: 0,
    quizzesText: "—",
    projectVal: 0,
    projectText: "—",
    assignmentsVal: 60,
    assignmentsText: "Conceptual & Practical Components",
    notes: ["Evaluated through conceptual & practical mid-term components."],
  },
  {
    code: "HRM 1102",
    name: "English Language & Literature – I",
    credits: 3,
    sessions: 24,
    faculty: "Prof. Aparna Bhat",
    midtermVal: 20,
    midtermText: "20%",
    endtermVal: 40,
    endtermText: "40%",
    quizzesVal: 10,
    quizzesText: "10% (Quiz 1 after Session 7: 5%, Quiz 2 after Session 19: 5%)",
    projectVal: 20,
    projectText: "20% (Presentation)",
    assignmentsVal: 10,
    assignmentsText: "10% (Written Assignment at Session 14)",
    notes: [
      "Quiz 1 (5%): Post Session 7; Quiz 2 (5%): Post Session 19.",
      "Written Assignment (10%): Session 14."
    ],
  },
  {
    code: "OPS 1101",
    name: "Basic Mathematics – I",
    credits: 3,
    sessions: 24,
    faculty: "Prof. Ritu Gupta",
    midtermVal: 20,
    midtermText: "20%",
    endtermVal: 40,
    endtermText: "40%",
    quizzesVal: 20,
    quizzesText: "20% (Quiz 1 at Session 7: 10%, Quiz 2 at Session 18: 10%)",
    projectVal: 20,
    projectText: "20% (Applied Project at Session 24)",
    assignmentsVal: 0,
    assignmentsText: "—",
    notes: ["Quiz 1 (10%): Session 7; Quiz 2 (10%): Session 18."],
  },
  {
    code: "HRM 1101",
    name: "Foundations of Psychology",
    credits: 3,
    sessions: 24,
    faculty: "Prof. Manoj Kumar Yadav",
    midtermVal: 20,
    midtermText: "20%",
    endtermVal: 40,
    endtermText: "40%",
    quizzesVal: 10,
    quizzesText: "10% (3 Quizzes after Sessions 6, 12 & 18)",
    projectVal: 20,
    projectText: "20% (Group Report + Presentation + Peer Feedback)",
    assignmentsVal: 10,
    assignmentsText: "10% (Class Participation)",
    notes: [
      "Group Project (20%): Written Submission (50%), Presentation (30%), Peer Feedback (20%).",
      "Quizzes (10%): Held post Session 6, 12, and 18."
    ],
  },
  {
    code: "MGT 1101",
    name: "Introduction to Sociology",
    credits: 3,
    sessions: 24,
    faculty: "Dr. Melvin Mathew Thomas",
    midtermVal: 20,
    midtermText: "20%",
    endtermVal: 40,
    endtermText: "40%",
    quizzesVal: 20,
    quizzesText: "20% (Quiz after Session 10)",
    projectVal: 20,
    projectText: "20% (Sociological Inquiry Project)",
    assignmentsVal: 0,
    assignmentsText: "—",
    notes: ["Quiz (20%): Session 10 covering Sessions 1 to 8."],
  },
  {
    code: "ANT 1101",
    name: "Working with Spreadsheets",
    credits: 2,
    sessions: 16,
    faculty: "Prof. Pratik Rai",
    midtermVal: 30,
    midtermText: "Lab Exam (Sept 18)",
    endtermVal: 0,
    endtermText: "—",
    quizzesVal: 0,
    quizzesText: "—",
    projectVal: 0,
    projectText: "—",
    assignmentsVal: 70,
    assignmentsText: "Practical & Lab Exercises",
    notes: ["Lab-based practical assessment held on Sept 18."],
  },
  {
    code: "OPS 1102",
    name: "Basics of Statistics",
    credits: 3,
    sessions: 24,
    faculty: "Prof. Sandhiya E",
    midtermVal: 20,
    midtermText: "20%",
    endtermVal: 40,
    endtermText: "40%",
    quizzesVal: 10,
    quizzesText: "10% (Quiz after Session 10)",
    projectVal: 20,
    projectText: "20% (Project Sessions 23–24)",
    assignmentsVal: 10,
    assignmentsText: "10% (Class Participation)",
    notes: ["Quiz (10%): Held post Session 10."],
  },
  {
    code: "HRM 1103",
    name: "Working in Groups & Team Building",
    credits: 1,
    sessions: 8,
    faculty: "Prof. Arunima K.V.",
    midtermVal: 0,
    midtermText: "—",
    endtermVal: 0,
    endtermText: "—",
    quizzesVal: 50,
    quizzesText: "Interactive Quiz",
    projectVal: 0,
    projectText: "—",
    assignmentsVal: 50,
    assignmentsText: "Self-Assessment Instruments (Ego State, Belbin, TKI)",
    notes: ["Interactive quiz & self-assessment instruments (Ego State, Belbin, TKI)."],
  },
];

export function GradingPanel() {
  const [selectedCode, setSelectedCode] = useState<string>(IPM1_COURSES[0]!.code);
  const [activeSegmentLabel, setActiveSegmentLabel] = useState<string | null>(null);

  const activeCourse = IPM1_COURSES.find((c) => c.code === selectedCode) ?? IPM1_COURSES[0]!;

  const evaluationItems = useMemo(() => {
    const items = [];
    if (activeCourse.endtermVal > 0) {
      items.push({
        label: "Endterm Exam",
        value: activeCourse.endtermVal,
        color: "#22D3EE",
        description: cleanDescription(activeCourse.endtermText, activeCourse.endtermVal),
      });
    }
    if (activeCourse.midtermVal > 0) {
      items.push({
        label: "Midterm Exam",
        value: activeCourse.midtermVal,
        color: "#FB7185",
        description: cleanDescription(activeCourse.midtermText, activeCourse.midtermVal),
      });
    }
    if (activeCourse.quizzesVal > 0) {
      items.push({
        label: "Quizzes",
        value: activeCourse.quizzesVal,
        color: "#C084FC",
        description: cleanDescription(activeCourse.quizzesText, activeCourse.quizzesVal),
      });
    }
    if (activeCourse.projectVal > 0) {
      items.push({
        label: "Group Project",
        value: activeCourse.projectVal,
        color: "#FBBF24",
        description: cleanDescription(activeCourse.projectText, activeCourse.projectVal),
      });
    }
    if (activeCourse.assignmentsVal > 0) {
      items.push({
        label: "Assignments / Other",
        value: activeCourse.assignmentsVal,
        color: "#34D399",
        description: cleanDescription(activeCourse.assignmentsText, activeCourse.assignmentsVal),
      });
    }
    return items;
  }, [activeCourse]);

  const donutSegments = useMemo(
    () => evaluationItems.map((item) => ({ label: item.label, value: item.value, color: item.color })),
    [evaluationItems]
  );

  const getCourseSegments = (c: CourseGradingInfo) => [
    { label: "Endterm Exam", value: c.endtermVal, color: "#22D3EE" },
    { label: "Midterm Exam", value: c.midtermVal, color: "#FB7185" },
    { label: "Quizzes", value: c.quizzesVal, color: "#C084FC" },
    { label: "Group Project", value: c.projectVal, color: "#FBBF24" },
    { label: "Assignments / Other", value: c.assignmentsVal, color: "#34D399" },
  ].filter((s) => s.value > 0);

  const handleCourseChange = (code: string) => {
    setSelectedCode(code);
    setActiveSegmentLabel(null);
  };

  return (
    <div className="flex flex-col gap-8 py-2">
      {/* Top Banner Overview */}
      <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-6 border-b border-border/60 pb-6">
          <div className="space-y-1">
            <span className="font-sans text-xs font-bold uppercase tracking-widest text-cyan">
              TAPMI IPM · BBA Phase
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
              Term 1 Course Weightages & Grading Policies
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-cyan/10 p-3 text-cyan">
              <Award className="size-6" />
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="rounded-2xl border border-border/60 bg-surface2/40 p-4">
            <div className="flex items-center gap-3 text-cyan mb-1">
              <BookOpen className="size-4" />
              <span className="font-mono text-xs font-bold uppercase">Total Term 1 Credits</span>
            </div>
            <p className="font-display text-xl font-bold text-ink">18 Credits (8 Courses)</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-surface2/40 p-4">
            <div className="flex items-center gap-3 text-emerald-400 mb-1">
              <UserCheck className="size-4" />
              <span className="font-mono text-xs font-bold uppercase">Attendance Rule</span>
            </div>
            <p className="font-display text-xl font-bold text-ink">85% Mandatory Minimum</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-surface2/40 p-4">
            <div className="flex items-center gap-3 text-purple-400 mb-1">
              <GraduationCap className="size-4" />
              <span className="font-mono text-xs font-bold uppercase">Grading System</span>
            </div>
            <p className="font-display text-xl font-bold text-ink">Relative Grading (10 PT CGPA)</p>
          </div>
        </div>
      </div>

      {/* Main Content: Course Selector & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Course Tabs List */}
        <div className="flex flex-col gap-2 lg:col-span-4">
          <p className="font-sans text-xs font-bold uppercase tracking-wider text-dim px-2 mb-1">
            Term 1 Subjects ({IPM1_COURSES.length})
          </p>
          {IPM1_COURSES.map((c) => {
            const isSel = c.code === activeCourse.code;
            const subjectClr = autoColor(c.name);
            return (
              <button
                key={c.code}
                onClick={() => handleCourseChange(c.code)}
                style={
                  isSel
                    ? {
                        borderColor: `${subjectClr}80`,
                        boxShadow: `0 0 16px ${subjectClr}1f`,
                        backgroundColor: `${subjectClr}0d`,
                      }
                    : undefined
                }
                className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all text-left ${
                  isSel
                    ? "shadow-md ring-1 ring-border"
                    : "bg-surface/60 border-border/60 hover:bg-surface2/60 text-dim hover:text-ink"
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Mini Donut Preview for every subject */}
                  <div className="shrink-0">
                    <Donut
                      size={36}
                      thickness={6}
                      segments={getCourseSegments(c)}
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold" style={{ color: subjectClr }}>
                        {c.code}
                      </span>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-surface2 text-dim ring-1 ring-border">
                        {c.credits} Cr
                      </span>
                    </div>
                    <p className="font-sans text-sm font-semibold mt-1 text-ink truncate">{c.name}</p>
                  </div>
                </div>
                <ChevronRight
                  className={`size-5 shrink-0 transition-transform ${isSel ? "translate-x-1" : "text-faint"}`}
                  style={{ color: isSel ? subjectClr : undefined }}
                />
              </button>
            );
          })}
        </div>

        {/* Right Side Detail Card with Donut Chart */}
        <div className="flex flex-col gap-6 lg:col-span-8">
          <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-6">
              <div className="space-y-1 min-w-0">
                <span className="font-mono text-sm font-bold" style={{ color: autoColor(activeCourse.name) }}>
                  {activeCourse.code}
                </span>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-ink">{activeCourse.name}</h3>
                <p className="font-mono text-sm text-dim">Instructor: {activeCourse.faculty}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <span className="rounded-xl bg-surface2 px-3 py-1.5 font-mono text-xs font-semibold text-dim ring-1 ring-border">
                  {activeCourse.credits} Credits
                </span>
                <span className="rounded-xl bg-surface2 px-3 py-1.5 font-mono text-xs font-semibold text-dim ring-1 ring-border">
                  {activeCourse.sessions} Sessions
                </span>
              </div>
            </div>

            {/* Donut Chart & Breakdown */}
            <div className="mt-8 flex flex-col items-center gap-8 lg:flex-row lg:items-start lg:gap-12">
              {/* Animated Geometric Donut Graph */}
              <div className="shrink-0 self-center lg:self-start flex flex-col items-center">
                <Donut
                  key={activeCourse.code}
                  size={210}
                  thickness={22}
                  segments={donutSegments}
                  activeLabel={activeSegmentLabel}
                  onActiveChange={setActiveSegmentLabel}
                  label="100%"
                  sub="EVALUATION"
                />
                <p className="mt-3 font-mono text-[11px] text-faint text-center">
                  {activeSegmentLabel ? "Click again to reset view" : "Tap any segment to inspect"}
                </p>
              </div>

              {/* Legend & Details */}
              <div className="flex flex-col gap-3 min-w-0 flex-1 w-full">
                <div className="flex items-center justify-between px-1 mb-1">
                  <p className="font-sans text-xs font-bold uppercase tracking-wider text-dim">
                    Weightage Distribution ({evaluationItems.length} Components)
                  </p>
                  <span className="font-mono text-[10px] text-faint">Total: 100%</span>
                </div>

                {evaluationItems.map((item) => {
                  const isActive = activeSegmentLabel === item.label;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setActiveSegmentLabel(isActive ? null : item.label)}
                      onMouseEnter={() => setActiveSegmentLabel(item.label)}
                      onMouseLeave={() => setActiveSegmentLabel(null)}
                      className={`group flex flex-col w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                        isActive
                          ? "bg-surface2 border-cyan/70 shadow-md ring-2 ring-cyan/30"
                          : "bg-surface2/50 border-border/60 hover:bg-surface2/80 hover:border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 w-full">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="size-3 rounded-full shrink-0 transition-transform group-hover:scale-125"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-sans text-sm sm:text-base font-bold text-ink truncate">
                            {item.label}
                          </span>
                        </div>
                        <span
                          className="shrink-0 px-3 py-1 rounded-xl font-mono text-xs sm:text-sm font-extrabold border shadow-xs"
                          style={{
                            backgroundColor: `${item.color}18`,
                            borderColor: `${item.color}40`,
                            color: item.color,
                          }}
                        >
                          {item.value}%
                        </span>
                      </div>

                      {item.description ? (
                        <p className="mt-2 text-xs sm:text-sm text-dim leading-relaxed pl-5.5 break-words">
                          {item.description}
                        </p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {activeCourse.notes && activeCourse.notes.length > 0 && (
              <div className="mt-8 rounded-2xl bg-cyan/5 p-5 ring-1 ring-cyan/20">
                <p className="font-sans text-xs font-bold uppercase tracking-wider text-cyan">Course Specific Notes</p>
                <ul className="mt-3 space-y-2">
                  {activeCourse.notes.map((n, i) => (
                    <li key={i} className="flex items-start gap-2.5 font-sans text-sm text-dim leading-relaxed">
                      <span className="text-cyan font-bold">•</span>
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rules & Academic Policies */}
      <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <ShieldAlert className="size-6 text-cyan" />
          <h3 className="font-display text-xl font-bold text-ink">Essential Academic Policies</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
          <div className="rounded-2xl bg-surface2/50 p-5 ring-1 ring-border/50 space-y-3">
            <p className="font-bold text-cyan uppercase tracking-wider text-xs">Attendance Rules</p>
            <ul className="space-y-2.5 text-dim leading-relaxed">
              <li>• <strong>Goal:</strong> 100% attendance</li>
              <li>• <strong>≥ 85%:</strong> No grade penalty</li>
              <li>• <strong>70% - 84%:</strong> 0.5 grade points cut per missed session below 85%</li>
              <li>• <strong>&lt; 70%:</strong> Automatic 'I' Grade (Ineligible for Endterm)</li>
            </ul>
          </div>

          <div className="rounded-2xl bg-surface2/50 p-5 ring-1 ring-border/50 space-y-3">
            <p className="font-bold text-cyan uppercase tracking-wider text-xs">Passing Criteria</p>
            <ul className="space-y-2.5 text-dim leading-relaxed">
              <li>• <strong>Pass Minimum:</strong> 40% overall AND 40% separately in Endterm exam</li>
              <li>• <strong>Grade Scale:</strong> A+ (10), A (9), B (8), C (7), D (6), E (5), F/I (0)</li>
              <li>• <strong>Consecutive Absence:</strong> Unapproved absence &gt; 13 days requires withdrawal</li>
            </ul>
          </div>

          <div className="rounded-2xl bg-surface2/50 p-5 ring-1 ring-border/50 space-y-3">
            <p className="font-bold text-cyan uppercase tracking-wider text-xs">Year Progression</p>
            <ul className="space-y-2.5 text-dim leading-relaxed">
              <li>• <strong>Year 2 Promotion:</strong> Min 42 credits in Year 1</li>
              <li>• <strong>Year 3 Promotion:</strong> 84 cumulative credits & clear all Year 1 courses</li>
              <li>• <strong>MBA Transition:</strong> Clear all BBA courses with min 6.5 CGPA & zero 'I' grades</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
