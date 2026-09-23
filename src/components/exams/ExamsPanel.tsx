import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  Calendar,
  GraduationCap,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { phaseOf, type Deadline } from "@/lib/deadlines";
import { autoColor, canonicalSubject } from "@/lib/courses";
import { ExamCard } from "./ExamCard";

type Props = {
  deadlines: Deadline[];
  now: number;
  canManage: boolean;
  onEdit: (d: Deadline) => void;
  onDelete: (d: Deadline) => void;
  onOpen?: (d: Deadline) => void;
  onAddExam?: () => void;
  initialSubTab?: "midterm" | "endterm";
};

export function ExamsPanel({
  deadlines,
  now,
  canManage,
  onEdit,
  onDelete,
  onOpen,
  onAddExam,
  initialSubTab = "midterm",
}: Props) {
  const [subTab, setSubTab] = useState<"midterm" | "endterm">(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const allExams = useMemo(
    () => deadlines.filter((d) => d.type === "midterm" || d.type === "endterm"),
    [deadlines],
  );

  const midterms = useMemo(
    () => allExams.filter((d) => d.type === "midterm"),
    [allExams],
  );

  const endterms = useMemo(
    () => allExams.filter((d) => d.type === "endterm"),
    [allExams],
  );

  const currentTabExams = subTab === "midterm" ? midterms : endterms;

  // Subjects present in current tab's exams
  const examSubjects = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of currentTabExams) {
      const canon = canonicalSubject(d.subject || d.title);
      map.set(canon, (map.get(canon) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [currentTabExams]);

  // Filtered list
  const filteredExams = useMemo(() => {
    return currentTabExams.filter((d) => {
      if (subjectFilter) {
        const canon = canonicalSubject(d.subject || d.title);
        if (canon !== subjectFilter) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const text = `${d.title} ${d.subject ?? ""} ${d.subject_code ?? ""} ${d.notes ?? ""}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [currentTabExams, subjectFilter, search]);

  // Split into phases
  const ongoingExams = useMemo(
    () => filteredExams.filter((d) => phaseOf(d, now) === "ongoing"),
    [filteredExams, now],
  );

  const upcomingExams = useMemo(
    () => filteredExams.filter((d) => phaseOf(d, now) === "upcoming"),
    [filteredExams, now],
  );

  const completedExams = useMemo(
    () =>
      filteredExams
        .filter((d) => phaseOf(d, now) === "completed")
        .sort((a, b) => new Date(b.due_at).getTime() - new Date(a.due_at).getTime()),
    [filteredExams, now],
  );

  return (
    <div className="space-y-7">
      {/* Top Header & Overview */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-cyan/12 text-cyan">
              <GraduationCap className="size-4" />
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink">
              Examinations
            </h2>
          </div>
          <p className="font-sans text-xs sm:text-sm text-dim mt-1">
            Exam dates, durations, weightage distribution, and your personal marks tracker.
          </p>
        </div>

        {canManage && onAddExam && (
          <button
            type="button"
            onClick={onAddExam}
            className="flex items-center gap-2 rounded-2xl bg-cyan px-4 py-2.5 font-sans text-xs sm:text-sm font-bold text-white shadow-sm hover:brightness-105 transition-all cursor-pointer"
          >
            <Plus className="size-4" />
            <span>Add Exam</span>
          </button>
        )}
      </div>

      {/* Modern Sub-Tab Switcher (Midterms / Endterms) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-surface p-1.5 shadow-xs">
          <button
            type="button"
            onClick={() => {
              setSubTab("midterm");
              setSubjectFilter(null);
            }}
            className={`relative flex items-center gap-2 rounded-xl px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              subTab === "midterm"
                ? "bg-cyan text-white shadow-sm"
                : "text-dim hover:text-ink hover:bg-surface2"
            }`}
          >
            <span>Mid-Terms</span>
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-extrabold ${
                subTab === "midterm" ? "bg-white/20 text-white" : "bg-surface2 text-dim"
              }`}
            >
              {midterms.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubTab("endterm");
              setSubjectFilter(null);
            }}
            className={`relative flex items-center gap-2 rounded-xl px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              subTab === "endterm"
                ? "bg-cyan text-white shadow-sm"
                : "text-dim hover:text-ink hover:bg-surface2"
            }`}
          >
            <span>End-Terms</span>
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-extrabold ${
                subTab === "endterm" ? "bg-white/20 text-white" : "bg-surface2 text-dim"
              }`}
            >
              {endterms.length}
            </span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-faint" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exam or subject…"
            className="w-full rounded-xl border border-border bg-surface pl-9 pr-8 py-2 font-sans text-xs text-ink outline-none focus:border-cyan/70 focus:ring-2 focus:ring-cyan/20 placeholder:text-faint transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-faint hover:text-ink cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Consistent Subject Filter Bar with Canonical Colors */}
      {examSubjects.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="font-sans text-xs font-bold uppercase tracking-wider text-dim shrink-0 pr-1">
            Filter:
          </span>

          <button
            type="button"
            onClick={() => setSubjectFilter(null)}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 font-sans text-xs font-bold transition-all cursor-pointer ${
              subjectFilter === null
                ? "bg-cyan text-white shadow-sm ring-1 ring-cyan/50"
                : "border border-border bg-surface text-dim hover:bg-surface2 hover:text-ink"
            }`}
          >
            <span>All Subjects</span>
            <span className="font-mono text-[11px] opacity-75">({currentTabExams.length})</span>
          </button>

          {examSubjects.map(([subj, count]) => {
            const isSel = subjectFilter === subj;
            const clr = autoColor(subj);
            return (
              <button
                key={subj}
                type="button"
                onClick={() => setSubjectFilter(isSel ? null : subj)}
                style={
                  isSel
                    ? {
                        backgroundColor: clr,
                        color: "#ffffff",
                        borderColor: clr,
                      }
                    : undefined
                }
                className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 font-sans text-xs font-semibold transition-all cursor-pointer ${
                  isSel
                    ? "shadow-sm"
                    : "border-border/80 bg-surface text-dim hover:bg-surface2 hover:text-ink"
                }`}
              >
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: isSel ? "#ffffff" : clr }}
                />
                <span>{subj}</span>
                <span className="font-mono text-[11px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Exams Content */}
      {filteredExams.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-surface/50 p-10 sm:p-14 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-surface2 text-dim mb-3">
            <Calendar className="size-6 text-faint" />
          </div>
          <h4 className="font-display text-lg font-bold text-ink">
            {subTab === "endterm"
              ? "No End-Term Exams Scheduled Yet"
              : "No Exams Found"}
          </h4>
          <p className="mt-1 max-w-md font-sans text-xs sm:text-sm text-dim leading-relaxed">
            {subTab === "endterm"
              ? "The end-term examination timetable will be published here once announced by the academic office."
              : subjectFilter || search
                ? "No examinations match your active filters. Try clearing the search or subject filter."
                : "No examination sessions are scheduled currently."}
          </p>
          {(subjectFilter || search) && (
            <button
              type="button"
              onClick={() => {
                setSubjectFilter(null);
                setSearch("");
              }}
              className="mt-4 rounded-xl border border-border bg-surface2 px-4 py-2 font-sans text-xs font-semibold text-ink hover:bg-surface2/80 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Ongoing Exams */}
          {ongoingExams.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-cyan">
                <span className="size-2 rounded-full bg-cyan animate-ping" />
                <h4 className="font-sans text-xs font-bold uppercase tracking-wider">
                  Happening Now ({ongoingExams.length})
                </h4>
              </div>
              <div className="flex flex-col gap-4">
                {ongoingExams.map((d) => (
                  <ExamCard
                    key={d.id}
                    deadline={d}
                    now={now}
                    canManage={canManage}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onOpen={onOpen}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Exams */}
          {upcomingExams.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <h4 className="font-sans text-xs font-bold uppercase tracking-wider text-dim">
                  Upcoming Examinations ({upcomingExams.length})
                </h4>
                <span className="font-mono text-xs text-faint">
                  Chronological Order
                </span>
              </div>
              <div className="flex flex-col gap-4">
                {upcomingExams.map((d) => (
                  <ExamCard
                    key={d.id}
                    deadline={d}
                    now={now}
                    canManage={canManage}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onOpen={onOpen}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Exams */}
          {completedExams.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <h4 className="font-sans text-xs font-bold uppercase tracking-wider text-dim">
                  Concluded Examinations ({completedExams.length})
                </h4>
              </div>
              <div className="flex flex-col gap-4 opacity-75 hover:opacity-100 transition-opacity">
                {completedExams.map((d) => (
                  <ExamCard
                    key={d.id}
                    deadline={d}
                    now={now}
                    canManage={canManage}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onOpen={onOpen}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
