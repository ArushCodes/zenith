import {
  ArrowUpRight,
  CalendarDays,
  CalendarClock,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  ShieldCheck,
  Sparkles,
  UserCheck,
  FileQuestion,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

const icons = {
  feed: LayoutDashboard,
  calendar: CalendarDays,
  timetable: CalendarClock,
  quizzes: FileQuestion,
  exams: GraduationCap,
  grading: Sparkles,
  attendance: UserCheck,
  admin: ShieldCheck,
};
type Section = keyof typeof icons;
export function DashboardSidebar({
  active,
  onSelect,
  batchLabel = "IPM 1",
  admin = false,
  preview = false,
}: {
  active: string;
  onSelect: (section: Section) => void;
  batchLabel?: string;
  admin?: boolean;
  preview?: boolean;
}) {
  const sections: { key: Section; label: string }[] = [
    { key: "feed", label: "Feed" },
    { key: "calendar", label: "Calendar" },
    { key: "timetable", label: "Timetable" },
    { key: "quizzes", label: "Quizzes" },
    { key: "exams", label: "Exams" },
    { key: "grading", label: "Grades & goals" },
    { key: "attendance", label: "Attendance" },
    ...(admin ? [{ key: "admin" as const, label: "Admin console" }] : []),
  ];
  return (
    <aside className="dashboard-sidebar">
      <Link to="/" className="zenith-brand">
        <span className="brand-symbol">z</span> zenith<span className="brand-period">.</span>
      </Link>
      <div className="sidebar-batch">
        <span className="sidebar-batch-icon">IPM</span>
        <div>
          <strong>{batchLabel}</strong>
          <span>TAPMI · Manipal</span>
        </div>
        <span className="sidebar-batch-dot" />
      </div>
      <span className="sidebar-section-label">WORKSPACE</span>
      <nav aria-label="Main dashboard">
        {sections.map(({ key, label }) => {
          const Icon = icons[key];
          return (
            <button
              key={key}
              type="button"
              aria-current={active === key ? "page" : undefined}
              onClick={() => onSelect(key)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {active === key && <span className="sidebar-active-dot" />}
            </button>
          );
        })}
      </nav>
      <div className="sidebar-bottom">
        <a href="mailto:support@zenithfor.me" className="sidebar-support">
          <LifeBuoy size={17} /> Need a hand?
        </a>
        <span className="sidebar-footer">ZENITH / {preview ? "PREVIEW" : "STUDENT SPACE"}</span>
      </div>
    </aside>
  );
}
