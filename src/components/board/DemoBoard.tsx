import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  MapPin,
  Moon,
  Search,
  Sparkles,
  Sun,
  BookOpen,
  GraduationCap,
} from "lucide-react";
import { DashboardSidebar } from "./DashboardSidebar";
import { useTheme } from "@/hooks/use-theme";

const tasks = [
  {
    title: "Sociological inquiry",
    subject: "Sociology",
    kind: "Assignment",
    when: "Tomorrow, 11:59 PM",
    color: "lilac",
    days: "Tomorrow",
    detail: "Group project · Written submission",
  },
  {
    title: "Quiz 02 · Functions & limits",
    subject: "Mathematics",
    kind: "Quiz",
    when: "Monday, 9:00 AM",
    color: "amber",
    days: "In 2 days",
    detail: "Individual · Sessions 8–14",
  },
  {
    title: "The stories we tell",
    subject: "English",
    kind: "Presentation",
    when: "Wednesday, 2:00 PM",
    color: "mint",
    days: "In 4 days",
    detail: "Group presentation · 12 minutes",
  },
];
const sessions = [
  {
    time: "09:00",
    end: "10:15",
    name: "Basic Mathematics",
    room: "Classroom 04",
    faculty: "Prof. Ritu Gupta",
    color: "amber",
  },
  {
    time: "10:30",
    end: "11:45",
    name: "Foundations of Psychology",
    room: "Classroom 04",
    faculty: "Prof. Manoj Kumar Yadav",
    color: "lilac",
  },
  {
    time: "13:00",
    end: "14:15",
    name: "English Language & Literature",
    room: "Classroom 02",
    faculty: "Prof. Aparna Bhat",
    color: "mint",
  },
];

/** Synthetic, explicitly labelled data. No student identities or private queries. */
export default function DemoBoard() {
  const [tab, setTab] = useState("feed");
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [done, setDone] = useState<string[]>([]);
  const { theme, toggle } = useTheme();
  const shown = tasks.filter(
    (task) =>
      (filter === "All" || task.kind === filter) &&
      `${task.title} ${task.subject}`.toLowerCase().includes(query.toLowerCase()),
  );
  const heading =
    tab === "feed"
      ? "Feed"
      : tab === "calendar"
        ? "Calendar"
        : tab === "timetable"
          ? "Timetable"
          : tab === "attendance"
            ? "Attendance"
            : tab === "grading"
              ? "Grades"
              : "Exams";
  return (
    <div className="zenith-workspace demo-workspace">
      <DashboardSidebar active={tab} onSelect={setTab} preview />
      <header className="demo-header">
        <span className="demo-breadcrumb">
          Workspace <ChevronRight size={13} />
          <strong>{tab === "feed" ? "Feed" : tab[0]!.toUpperCase() + tab.slice(1)}</strong>
        </span>
        <div className="demo-header-actions">
          <span className="demo-pill">SAMPLE DATA</span>
          <button onClick={toggle} type="button" aria-label="Toggle theme" className="icon-button">
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <Link to="/auth" search={{ mode: "signin" }} className="demo-account">
            Sign in <ArrowUpRight size={14} />
          </Link>
        </div>
      </header>
      <main className="workspace-main demo-main">
        <div className="preview-note">
          <Sparkles size={15} />
          <span>You're exploring the preview. These classes and deadlines are examples.</span>
          <Link to="/auth" search={{ mode: "signup" }}>
            Join your batch <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="workspace-intro">
          <div>
            <span className="workspace-eyebrow">YOUR ACADEMIC SPACE</span>
            <h1>{heading}</h1>
            <p>Sample data · demo only</p>
          </div>
          <span className="demo-date">
            <CalendarDays size={15} />
            {new Intl.DateTimeFormat("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "long",
              timeZone: "Asia/Kolkata",
            }).format(new Date())}
          </span>
        </div>
        <nav className="demo-mobile-nav" aria-label="Dashboard sections">
          {["feed", "calendar", "timetable", "exams", "grading", "attendance"].map((item) => (
            <button key={item} onClick={() => setTab(item)} aria-pressed={tab === item}>
              {item === "feed" ? "Feed" : item}
            </button>
          ))}
        </nav>
        <div className="dashboard-metrics">
          <Metric
            label="On your radar"
            value="03"
            detail="upcoming deadlines"
            color="lilac"
            icon={<Bell size={18} />}
          />
          <Metric
            label="Today's rhythm"
            value="03"
            detail="classes on the timetable"
            color="mint"
            icon={<BookOpen size={18} />}
          />
          <Metric
            label="Room to breathe"
            value="02"
            detail="safe misses · Mathematics"
            color="amber"
            icon={<Sparkles size={18} />}
          />
        </div>
        <div className="demo-content-grid">
          <div className="demo-primary">
            {tab === "feed" && (
              <>
                <div className="focus-card">
                  <div>
                    <span className="workspace-eyebrow">ONE THING AT A TIME</span>
                    <h2>You're closer than you think.</h2>
                    <p>Finish the sociology submission, then give yourself a well-earned break.</p>
                    <button type="button" onClick={() => setFilter("Assignment")}>
                      Focus on assignments <ArrowUpRight size={16} />
                    </button>
                  </div>
                  <div className="focus-art" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                    <Sparkles size={32} />
                  </div>
                </div>
                {renderTasks()}
              </>
            )}
            {(tab === "exams" || tab === "quizzes") && (
              <>
                <section className="premium-panel">
                  <span className="workspace-eyebrow">ASSESSMENTS</span>
                  <h2>Your next checkpoint.</h2>
                  <p className="text-dim mt-2">Keep the scope clear and preparation manageable.</p>
                  <div className="demo-exam">
                    <GraduationCap size={27} />
                    <div>
                      <strong>Mathematics · Quiz 02</strong>
                      <p>Functions & limits · Sessions 8–14</p>
                    </div>
                    <span className="demo-pill">Monday</span>
                  </div>
                </section>
                {renderTasks()}
              </>
            )}
            {tab === "calendar" && (
              <section className="premium-panel">
                <div className="panel-heading">
                  <h2>The week ahead</h2>
                  <span className="text-faint text-xs">Sample schedule</span>
                </div>
                <div className="demo-week">
                  {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, index) => (
                    <div key={day}>
                      <span>{day}</span>
                      <strong>{index + 5}</strong>
                      <div className={`calendar-sample ${index % 2 ? "lilac" : "mint"}`}>
                        {index % 2 ? "Psychology" : "Mathematics"}
                        <small>09:00 – 10:15</small>
                      </div>
                      {index % 2 === 0 && (
                        <div className="calendar-sample amber">
                          Coursework<small>Due 11:59 PM</small>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
            {tab === "timetable" && (
              <section className="premium-panel">
                <div className="panel-heading">
                  <h2>Today's timetable</h2>
                  <span className="demo-pill">3 classes</span>
                </div>
                {sessions.map((session) => (
                  <div key={session.name} className="demo-schedule-row">
                    <span className="schedule-time">
                      {session.time}
                      <small>{session.end}</small>
                    </span>
                    <span className={`schedule-dot ${session.color}`} />
                    <div>
                      <strong>{session.name}</strong>
                      <p>{session.faculty}</p>
                      <span>
                        <MapPin size={12} /> {session.room}
                      </span>
                    </div>
                  </div>
                ))}
              </section>
            )}
            {tab === "attendance" && (
              <section className="premium-panel">
                <span className="workspace-eyebrow">IPM 1 · HANDBOOK ALLOWANCE</span>
                <h2>Count classes, not worries.</h2>
                <p className="mt-2 text-dim">
                  One safe absence per credit. Plan with the full course in mind.
                </p>
                {[
                  { name: "Mathematics", credits: 3, misses: 1 },
                  { name: "Psychology", credits: 3, misses: 0 },
                  { name: "Introduction to AI", credits: 2, misses: 1 },
                ].map((course) => (
                  <div className="demo-attendance" key={course.name}>
                    <div>
                      <strong>{course.name}</strong>
                      <p>
                        {course.credits} credits · {course.credits * 8} sessions · {course.misses}{" "}
                        missed
                      </p>
                    </div>
                    <span className="attendance-allowance">
                      {course.credits - course.misses}
                      <small>safe misses left</small>
                    </span>
                  </div>
                ))}
                <p className="demo-disclaimer">
                  Example tracking only. Leave approval and exam eligibility follow separate
                  handbook rules.
                </p>
              </section>
            )}
            {tab === "grading" && (
              <section className="premium-panel">
                <span className="workspace-eyebrow">GRADES & GOALS</span>
                <h2>Progress you can see.</h2>
                <p className="mt-2 text-dim">
                  Your marks stay personal. Course components come from your batch.
                </p>
                {[
                  { title: "Mathematics", score: 72, color: "mint" },
                  { title: "Psychology", score: 84, color: "lilac" },
                  { title: "English", score: 78, color: "amber" },
                ].map((course) => (
                  <div className="demo-grade" key={course.title}>
                    <div>
                      <strong>{course.title}</strong>
                      <span>
                        {course.score}% <small>sample standing</small>
                      </span>
                    </div>
                    <div className="grade-track">
                      <span className={course.color} style={{ width: `${course.score}%` }} />
                    </div>
                  </div>
                ))}
                <Link to="/auth" search={{ mode: "signin" }} className="primary-button mt-6">
                  See your own progress <ArrowUpRight size={16} />
                </Link>
              </section>
            )}
          </div>
          <aside className="demo-secondary">
            <section className="premium-panel">
              <div className="panel-heading">
                <h2>Today's rhythm</h2>
                <Clock3 size={16} className="text-faint" />
              </div>
              {sessions.map((session) => (
                <div className="agenda-item" key={session.name}>
                  <span className={`agenda-dot ${session.color}`} />
                  <div>
                    <span className="agenda-time">
                      {session.time} — {session.end}
                    </span>
                    <strong>{session.name}</strong>
                    <span className="agenda-room">
                      <MapPin size={12} />
                      {session.room}
                    </span>
                  </div>
                </div>
              ))}
              <button onClick={() => setTab("timetable")} className="panel-link" type="button">
                Open timetable <ArrowUpRight size={14} />
              </button>
            </section>
            <section className="premium-panel campus-note">
              <span className="workspace-eyebrow">CAMPUS NOTES</span>
              <h3>
                A shared space.
                <br />A stronger batch.
              </h3>
              <p>Updates from your representatives will find a home here.</p>
              <span className="campus-note-mark" aria-hidden="true">
                ✳
              </span>
            </section>
          </aside>
        </div>
        <footer className="workspace-footer">
          A LITTLE CLARITY, EVERY DAY.<span>ZENITH · TAPMI MANIPAL</span>
        </footer>
      </main>
    </div>
  );

  function renderTasks() {
    return (
      <section className="premium-panel">
        <div className="panel-heading">
          <h2>
            On your radar <span className="panel-count">3</span>
          </h2>
          <span className="text-xs text-faint">Coursework & deadlines</span>
        </div>
        <div className="task-toolbar">
          <div className="task-filters">
            {["All", "Assignment", "Quiz", "Presentation"].map((item) => (
              <button
                type="button"
                key={item}
                aria-pressed={filter === item}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <label className="demo-search">
            <Search size={14} />
            <input
              aria-label="Search sample deadlines"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find something…"
            />
          </label>
        </div>
        {shown.map((task) => (
          <div
            key={task.title}
            className={`demo-task ${done.includes(task.title) ? "task-completed" : ""}`}
          >
            <button
              type="button"
              aria-label={`Mark ${task.title} ${done.includes(task.title) ? "incomplete" : "complete"}`}
              aria-pressed={done.includes(task.title)}
              className="task-check"
              onClick={() =>
                setDone((current) =>
                  current.includes(task.title)
                    ? current.filter((title) => title !== task.title)
                    : [...current, task.title],
                )
              }
            >
              {done.includes(task.title) && <Check size={13} />}
            </button>
            <div className="task-body">
              <div className="task-metadata">
                <span className={`task-subject ${task.color}`}>{task.subject}</span>
                <span>{task.kind}</span>
              </div>
              <h3>{task.title}</h3>
              <p>{task.detail}</p>
            </div>
            <div className="task-deadline">
              <strong>{task.days}</strong>
              <span>{task.when}</span>
            </div>
          </div>
        ))}
        {shown.length === 0 && <p className="py-8 text-dim text-sm">No matching deadlines.</p>}
      </section>
    );
  }
}

function Metric({
  label,
  value,
  detail,
  color,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <section className="dashboard-metric">
      <div>
        <span>{label}</span>
        <span className={`metric-icon ${color}`}>{icon}</span>
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </section>
  );
}
