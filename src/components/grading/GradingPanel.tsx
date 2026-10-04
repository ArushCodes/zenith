import { useState } from "react";
import { GradingPanel as PersonalGradingPanel } from "@/components/board/GradingPanel";
import { useBatch } from "@/hooks/use-batch";
import { IPM1_BATCH_ID } from "@/lib/roster.data";
import { GpaSimulator } from "./GpaSimulator";
import { motion, useReducedMotion } from "framer-motion";
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
      "Written Assignment (10%): Session 14.",
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
      "Quizzes (10%): Held post Session 6, 12, and 18.",
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
  const { batchId } = useBatch();
  const reduced = useReducedMotion();
  const [view, setView] = useState("marks");
  return (
    <div className="space-y-4">
      <nav
        aria-label="Grading views"
        className="sticky top-16 z-20 flex gap-1 rounded-xl border border-border bg-surface p-1"
      >
        {(
          [
            ["marks", "My marks"],
            ["weights", "Weightages"],
            ["targets", "Targets"],
          ] as const
        )
          .filter(([key]) => key === "marks" || batchId === IPM1_BATCH_ID)
          .map(([key, label]) => (
            <button
              type="button"
              key={key}
              aria-pressed={view === key}
              onClick={() => setView(key)}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${view === key ? "bg-cyan/15 text-cyan" : "text-dim hover:bg-surface2"}`}
            >
              {label}
            </button>
          ))}
      </nav>
      <div hidden={view !== "marks" && batchId === IPM1_BATCH_ID}>
        <PersonalGradingPanel />
      </div>
      {batchId === IPM1_BATCH_ID && (
        <>
          {view === "weights" && (
            <section className="rounded-xl border border-border bg-surface p-4">
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {IPM1_COURSES.map((c) => {
                  const parts = [
                    ["Mid", c.midtermVal, "#fb7185"],
                    ["End", c.endtermVal, "#22d3ee"],
                    ["Quizzes", c.quizzesVal, "#c084fc"],
                    ["Project", c.projectVal, "#fbbf24"],
                    ["Other", c.assignmentsVal, "#34d399"],
                  ] as const;
                  return (
                    <article key={c.code} className="rounded-lg border border-border p-4">
                      <div className="text-sm font-semibold">
                        {c.name} <span className="text-dim">· {c.credits} credits</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs">
                        {parts
                          .filter((p) => p[1] > 0)
                          .map(([label, value, color]) => (
                            <span key={label} style={{ color }}>
                              {label} {value}%
                            </span>
                          ))}
                      </div>
                      <span className="mt-2 flex h-2 overflow-hidden rounded-full bg-surface2">
                        {parts
                          .filter((p) => p[1] > 0)
                          .map(([label, value, color]) => (
                            <motion.span
                              key={label}
                              initial={false}
                              animate={{ width: value + "%" }}
                              transition={{ duration: reduced ? 0 : 0.3 }}
                              style={{ backgroundColor: color }}
                              title={label + " " + value + "%"}
                            />
                          ))}
                      </span>
                      <details className="mt-3 text-xs text-dim">
                        <summary className="cursor-pointer">Details</summary>
                        {[
                          c.midtermText,
                          c.endtermText,
                          c.quizzesText,
                          c.projectText,
                          c.assignmentsText,
                          ...(c.notes ?? []),
                        ]
                          .filter((n) => n && n !== "—" && !/^\d+%$/.test(n))
                          .map((n, i) => (
                            <p key={i} className="mt-2 text-xs text-dim">
                              {n}
                            </p>
                          ))}
                      </details>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
          {view === "targets" && (
            <section className="rounded-xl border border-border bg-surface p-4">
              <p className="my-3 text-xs text-dim">Estimate · final grades are relative.</p>
              <GpaSimulator courses={IPM1_COURSES} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
