import { GradingPanel as PersonalGradingPanel } from "@/components/board/GradingPanel";
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
    projectVal: 10,
    projectText: "10% (Group project, sessions 23–24)",
    assignmentsVal: 10,
    assignmentsText: "10% (Class participation)",
    notes: ["Quiz 1 (10%): After session 7; Quiz 2 (10%): After session 17."],
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
  return <PersonalGradingPanel />;
}
