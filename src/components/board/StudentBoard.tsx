import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  BookOpen,
  CalendarClock,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileQuestion,
  Filter,
  Flame,
  GraduationCap,
  Layers,
  LayoutGrid,
  List,
  ListFilter,
  Mail,
  Megaphone,
  Plus,
  Presentation,
  Radio,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { GradingPanel } from "@/components/grading/GradingPanel";
import { DashboardSidebar } from "@/components/board/DashboardSidebar";
import { ExamsPanel } from "@/components/exams/ExamsPanel";
import { toast } from "sonner";
import { db as supabase } from "@/lib/backend";
import { useAuth } from "@/hooks/use-auth";
import { useBatch } from "@/hooks/use-batch";
import { useMe } from "@/hooks/use-me";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BoardHeader } from "@/components/board/BoardHeader";
import { DeadlineRow } from "@/components/board/DeadlineRow";
import { ExamMarks } from "@/components/board/ExamMarks";
import { DeadlineDialog } from "@/components/board/DeadlineDialog";
import { EventDrawer } from "@/components/board/EventDrawer";
import { ApprovalsPanel } from "@/components/board/ApprovalsPanel";
import { AnnouncementsPanel } from "@/components/board/AnnouncementsPanel";
import { LiveClassHero } from "@/components/board/LiveClassHero";
import { LiveClassHud } from "@/components/board/LiveClassHud";
import { FeedCard, FeedCompactRow } from "@/components/board/FeedCard";
import { usePersonalChecklist } from "@/hooks/use-personal-checklist";
import { ActivityPanel } from "@/components/board/ActivityPanel";
import { CalendarPanel } from "@/components/calendar/CalendarPanel";
import { TimetablePanel } from "@/components/timetable/TimetablePanel";
import { AttendancePanel } from "@/components/attendance/AttendancePanel";
import { AdminConsolePanel } from "@/components/admin/AdminConsolePanel";
import { EmailInboxPanel } from "@/components/board/EmailInboxPanel";
import { MembersPanel } from "@/components/board/MembersPanel";
import { FeedbackPanel } from "@/components/board/FeedbackPanel";
import { coursesQuery, sessionsQuery, formatBatchLabel } from "@/lib/batches";
import { autoColor } from "@/lib/courses";
import { Marker, shapeForDeadline } from "@/lib/shapes";
import {
  FILTERS,
  deadlinesQueryFor,
  displayTitle,
  eventMeta,
  filterByKey,
  formatTickerLabel,
  phaseOf,
  timeLeft,
  type Deadline,
  type DeadlineType,
  type FilterKey,
} from "@/lib/deadlines";

type TabKey =
  "feed" | "calendar" | "timetable" | "quizzes" | "exams" | "grading" | "attendance" | "admin";

const QUIZ_TYPES = ["quiz"] as const;
const MIDTERM_TYPES = ["midterm"] as const;
const ENDTERM_TYPES = ["endterm"] as const;
const EXAM_TYPES = ["midterm", "endterm"] as const;
const WORK_TYPES = ["assignment", "presentation"] as const;

/** Secondary sections — opened as overlays from the account menu, not tabs. */
type PanelKey = "members" | "feedback" | "approvals" | "inbox";

const PANEL_TITLES: Record<PanelKey, string> = {
  members: "Batch members",
  feedback: "Feedback",
  approvals: "Pending approvals",
  inbox: "Email inbox",
};

export default function StudentBoard({ guestPreview }: { guestPreview?: boolean } = {}) {
  const { isModerator, isAdmin, isArush } = useAuth();
  const me = useMe();
  const { batchId, batch, canManage, loading: batchLoading } = useBatch();
  const isMod = canManage;
  const queryClient = useQueryClient();
  const { data: deadlines = [], isLoading } = useQuery(deadlinesQueryFor(batchId));
  const { data: sessions = [] } = useQuery(sessionsQuery(batchId));
  const { data: courses = [] } = useQuery(coursesQuery(batchId));
  const isFeedLoading = isLoading || (!batchId && batchLoading);

  const [tab, setTab] = useState<TabKey>("feed");
  const [examSubTab, setExamSubTab] = useState<"midterm" | "endterm">("midterm");
  const [filter, setFilter] = useState<FilterKey>("all");
  const { doneMap, isDone, toggleDone } = usePersonalChecklist(batchId);
  const [feedDensity, setFeedDensity] = useState<"comfortable" | "compact">(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("zenith.feed_density");
      if (saved === "compact" || saved === "comfortable") return saved;
    }
    return "comfortable";
  });
  const [showPastFeed, setShowPastFeed] = useState(false);

  const handleDensityChange = (density: "comfortable" | "compact") => {
    setFeedDensity(density);
    try {
      window.localStorage.setItem("zenith.feed_density", density);
    } catch {
      /* Storage may be unavailable in private browsing. */
    }
  };

  const [feedCategory, setFeedCategory] = useState<
    "all" | "quiz" | "assignment" | "exam" | "presentation" | "other"
  >("all");
  const [feedSearch, setFeedSearch] = useState("");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [pendingOnly, setPendingOnly] = useState(false);
  const [mobileTab, setMobileTab] = useState<"timeline" | "sidebar">("timeline");
  const [collapsedBuckets, setCollapsedBuckets] = useState<{
    critical: boolean;
    thisWeek: boolean;
    later: boolean;
  }>({
    critical: false,
    thisWeek: false,
    later: false,
  });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Deadline | null>(null);
  const [selected, setSelected] = useState<Deadline | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [panel, setPanel] = useState<PanelKey | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  // Quick keyboard shortcut: Pressing / focuses search input
  useEffect(() => {
    function handleGlobalSlash(e: KeyboardEvent) {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleGlobalSlash);
    return () => window.removeEventListener("keydown", handleGlobalSlash);
  }, []);

  // Real-time sync with the deadlines table for the selected batch
  useEffect(() => {
    if (!batchId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel(`deadlines-realtime-${batchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deadlines", filter: `batch_id=${batchId}` },
        () => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["deadlines", batchId] });
          }, 300);
        },
      )
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [queryClient, batchId]);

  useEffect(() => {
    if (!isMod && (panel === "approvals" || panel === "inbox")) setPanel(null);
  }, [isMod, panel]);

  // The header search box reaches the board through window events so it can
  // live outside this tree while still opening events and switching tabs.
  useEffect(() => {
    function openDeadline(e: Event) {
      const id = (e as CustomEvent<string>).detail;
      const hit = deadlines.find((d) => d.id === id);
      if (hit) setSelected(hit);
    }
    function gotoTab(e: Event) {
      setTab((e as CustomEvent<string>).detail as TabKey);
    }
    window.addEventListener("zenith:open-deadline", openDeadline);
    window.addEventListener("zenith:goto-tab", gotoTab);
    return () => {
      window.removeEventListener("zenith:open-deadline", openDeadline);
      window.removeEventListener("zenith:goto-tab", gotoTab);
    };
  }, [deadlines]);

  const remove = useMutation({
    mutationFn: async (deadline: Deadline) => {
      const { error } = await supabase.from("deadlines").delete().eq("id", deadline.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deadlines", batchId] });
      setSelected(null);
      toast.success("Deadline removed");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const approved = useMemo(
    () => deadlines.filter((d) => (d.status ?? "approved") === "approved"),
    [deadlines],
  );
  const pendingCount = useMemo(
    () => deadlines.filter((d) => d.status === "pending").length,
    [deadlines],
  );

  const dueSoonCount = useMemo(
    () =>
      approved.filter((d) => {
        const t = new Date(d.due_at).getTime();
        return t >= now && t - now <= 48 * 3600_000;
      }).length,
    [approved, now],
  );

  const filtered = useMemo(() => filterByKey(approved, filter, ""), [approved, filter]);

  /** Quizzes, exams and coursework each get their own tab and feed section. */
  const quizzes = useMemo(
    () => approved.filter((d) => (QUIZ_TYPES as readonly string[]).includes(d.type)),
    [approved],
  );
  const midterms = useMemo(
    () => approved.filter((d) => (MIDTERM_TYPES as readonly string[]).includes(d.type)),
    [approved],
  );
  const endterms = useMemo(
    () => approved.filter((d) => (ENDTERM_TYPES as readonly string[]).includes(d.type)),
    [approved],
  );
  const projects = useMemo(
    () => approved.filter((d) => (WORK_TYPES as readonly string[]).includes(d.type)),
    [approved],
  );
  const nextQuizzes = useMemo(
    () => quizzes.filter((d) => phaseOf(d, now) !== "completed"),
    [quizzes, now],
  );
  const nextMidterms = useMemo(
    () => midterms.filter((d) => phaseOf(d, now) !== "completed"),
    [midterms, now],
  );
  const nextEndterms = useMemo(
    () => endterms.filter((d) => phaseOf(d, now) !== "completed"),
    [endterms, now],
  );
  const nextProjects = useMemo(
    () => projects.filter((d) => phaseOf(d, now) !== "completed"),
    [projects, now],
  );

  // ALL upcoming deadlines across ANY event type, strictly sorted by recency (nearest due_at first)
  const allUpcoming = useMemo(() => {
    return approved
      .filter((d) => phaseOf(d, now) !== "completed")
      .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());
  }, [approved, now]);

  // ALL completed deadlines (most recently completed first)
  const allCompleted = useMemo(() => {
    return approved
      .filter((d) => phaseOf(d, now) === "completed")
      .sort((a, b) => new Date(b.due_at).getTime() - new Date(a.due_at).getTime());
  }, [approved, now]);

  // Filtered upcoming feed by selected category & search query
  const filteredUpcoming = useMemo(() => {
    let list = allUpcoming;
    if (urgentOnly) {
      const next48h = now + 48 * 3600_000;
      list = list.filter((d) => {
        const t = new Date(d.due_at).getTime();
        return t <= next48h || phaseOf(d, now) === "ongoing";
      });
    }
    if (pendingOnly) {
      list = list.filter((d) => !doneMap[d.id]);
    }
    if (feedCategory === "exam") {
      list = list.filter((d) => d.type === "midterm" || d.type === "endterm");
    } else if (feedCategory === "other") {
      list = list.filter((d) => d.type === "guest_lecture" || d.type === "other");
    } else if (feedCategory !== "all") {
      list = list.filter((d) => d.type === feedCategory);
    }

    const q = feedSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((d) => {
        const title = (d.title || "").toLowerCase();
        const subject = (d.subject || "").toLowerCase();
        const code = (d.subject_code || "").toLowerCase();
        const loc = (d.location || "").toLowerCase();
        const notes = (d.notes || "").toLowerCase();
        return (
          title.includes(q) ||
          subject.includes(q) ||
          code.includes(q) ||
          loc.includes(q) ||
          notes.includes(q)
        );
      });
    }

    return list;
  }, [allUpcoming, feedCategory, feedSearch, urgentOnly, pendingOnly, doneMap, now]);

  // Group into recency buckets for clear visual urgency & hierarchy
  const recencyBuckets = useMemo(() => {
    const next48h = now + 48 * 3600_000;
    const next7d = now + 7 * 24 * 3600_000;

    const critical = filteredUpcoming.filter((d) => {
      const t = new Date(d.due_at).getTime();
      return t <= next48h || phaseOf(d, now) === "ongoing";
    });

    const thisWeek = filteredUpcoming.filter((d) => {
      const t = new Date(d.due_at).getTime();
      return t > next48h && t <= next7d && phaseOf(d, now) !== "ongoing";
    });

    const later = filteredUpcoming.filter((d) => {
      const t = new Date(d.due_at).getTime();
      return t > next7d && phaseOf(d, now) !== "ongoing";
    });

    return { critical, thisWeek, later };
  }, [filteredUpcoming, now]);

  const totalUpcomingCount = allUpcoming.length;
  const completedUpcomingCount = useMemo(() => {
    return allUpcoming.filter((d) => doneMap[d.id]).length;
  }, [allUpcoming, doneMap]);
  const progressPercent =
    totalUpcomingCount > 0 ? Math.round((completedUpcomingCount / totalUpcomingCount) * 100) : 0;

  const FEED_CATEGORIES = [
    {
      key: "all" as const,
      label: "All Upcoming",
      count: allUpcoming.length,
      icon: <Layers className="size-3.5" />,
    },
    {
      key: "quiz" as const,
      label: "Quizzes",
      count: allUpcoming.filter((d) => d.type === "quiz").length,
      icon: <FileQuestion className="size-3.5" />,
    },
    {
      key: "assignment" as const,
      label: "Assignments",
      count: allUpcoming.filter((d) => d.type === "assignment").length,
      icon: <BookOpen className="size-3.5" />,
    },
    {
      key: "exam" as const,
      label: "Exams",
      count: allUpcoming.filter((d) => d.type === "midterm" || d.type === "endterm").length,
      icon: <GraduationCap className="size-3.5" />,
    },
    {
      key: "presentation" as const,
      label: "Presentations",
      count: allUpcoming.filter((d) => d.type === "presentation").length,
      icon: <Presentation className="size-3.5" />,
    },
    {
      key: "other" as const,
      label: "Other / Lectures",
      count: allUpcoming.filter((d) => d.type === "guest_lecture" || d.type === "other").length,
      icon: <Radio className="size-3.5" />,
    },
  ];

  function openEdit(d: Deadline) {
    setSelected(null);
    setEditing(d);
    setDialogOpen(true);
  }

  type TabDef = {
    key: TabKey;
    label: string;
    icon: React.ReactNode;
    count?: number;
    badge?: string;
  };

  const tabs: TabDef[] = [
    {
      key: "feed",
      label: "Feed",
      icon: <ListFilter className="size-4" />,
      badge: recencyBuckets.critical.length > 0 ? "urgent" : undefined,
    },
    { key: "calendar", label: "Calendar", icon: <CalendarRange className="size-4" /> },
    { key: "timetable", label: "Timetable", icon: <CalendarClock className="size-4" /> },
    ...(quizzes.length > 0
      ? [
          {
            key: "quizzes" as TabKey,
            label: "Quizzes",
            icon: <FileQuestion className="size-4" />,
            count: quizzes.length,
          },
        ]
      : []),
    {
      key: "exams",
      label: "Exams",
      icon: <GraduationCap className="size-4" />,
      count: midterms.length + endterms.length,
    },
    { key: "grading", label: "Grading", icon: <Award className="size-4" /> },
    { key: "attendance", label: "Attendance", icon: <UserCheck className="size-4" /> },
    ...(isAdmin || isArush
      ? [
          {
            key: "admin" as TabKey,
            label: "Admin Console",
            icon: <ShieldCheck className="size-4 text-emerald-400" />,
          },
        ]
      : []),
  ];

  const menuItems = [
    { key: "members", label: "Members", icon: <Users className="size-4" /> },
    { key: "feedback", label: "Feedback", icon: <MessageSquare className="size-4" /> },
    ...(isMod
      ? [
          {
            key: "approvals",
            label: "Approvals",
            icon: <ShieldCheck className="size-4" />,
            badge: pendingCount || undefined,
          },
          { key: "inbox", label: "Inbox", icon: <Mail className="size-4" /> },
        ]
      : []),
  ];

  return (
    <div className="zenith-workspace relative min-h-screen overflow-x-hidden bg-ground font-body text-ink">
      <DashboardSidebar
        active={tab}
        onSelect={setTab}
        batchLabel={batch ? formatBatchLabel(batch).code : "Your batch"}
        admin={isAdmin}
      />
      <BoardHeader
        menuItems={menuItems}
        onMenuSelect={(k) => setPanel(k as PanelKey)}
        onLogoClick={() => {
          setPanel(null);
          setTab("feed");
          setFeedCategory("all");
          setFeedSearch("");
          setUrgentOnly(false);
          setPendingOnly(false);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />

      <main className="workspace-main relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-20">
        <div className="workspace-intro">
          <div>
            <span className="workspace-eyebrow">YOUR ACADEMIC SPACE</span>
            <h2>Make room for what matters.</h2>
            <p>Classes, coursework and a little breathing room. All in one place.</p>
          </div>
          <span className="workspace-status">
            <span /> Live batch board
          </span>
        </div>
        {/* ── Best Practice Workspace Control Deck: Editorial Context + Flat Navigation ── */}
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between border-b border-border/70 pb-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-black tracking-tight text-ink">
              {batch ? formatBatchLabel(batch).code : "Board"}
            </h1>
            <p className="text-[12px] font-medium text-dim mt-0.5 truncate">
              {new Intl.DateTimeFormat("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
              }).format(now)}
            </p>
          </div>

          <div className="w-full lg:w-auto min-w-0 max-w-full flex items-center justify-between lg:justify-end gap-3 overflow-x-auto pb-1 lg:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* Flat Tab Bar with Animated Underline Accent */}
            <nav
              aria-label="Board sections"
              className="workspace-navigation flex items-center gap-1 sm:gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shrink-0"
            >
              {tabs.map((t) => {
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex shrink-0 items-center gap-1.5 px-2.5 sm:px-3 py-1.5 pb-2.5 text-xs font-bold transition-colors cursor-pointer ${
                      active ? "text-ink" : "text-dim hover:text-ink"
                    }`}
                  >
                    <span className="relative z-10 flex items-center gap-1.5">
                      {t.icon}
                      <span>{t.label}</span>
                      {t.count !== undefined && t.count > 0 && (
                        <span
                          className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono leading-none ${
                            active ? "bg-cyan/15 text-cyan font-bold" : "bg-surface2 text-dim"
                          }`}
                        >
                          {t.count}
                        </span>
                      )}
                      {t.badge === "urgent" && (
                        <span className="size-1.5 rounded-full bg-rose animate-ping" />
                      )}
                    </span>
                    {active && (
                      <motion.div
                        layoutId="boardTabUnderline"
                        className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-cyan shadow-sm shadow-cyan/30"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            {isMod && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.04, boxShadow: "0 6px 20px oklch(0.58 0.19 220 / 35%)" }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 600, damping: 22 }}
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
                className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-cyan px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-cyan/20 cursor-pointer"
              >
                <Plus className="size-3.5" />
                <span className="hidden sm:inline">Add Event</span>
              </motion.button>
            )}
          </div>
        </div>

        {tab === "calendar" && (
          <div className="mb-5 rounded-xl bg-surface p-4 ring-1 ring-border">
            <div className="flex w-full flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">
              <span>
                Events · {approved.length}
                {filter !== "all" ? " · filtered" : ""}
              </span>
              <span className="h-px flex-1 bg-border" />
              <button
                onClick={() => setFilter("all")}
                disabled={filter === "all"}
                className="text-faint normal-case hover:text-ink disabled:opacity-40"
              >
                Reset
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {FILTERS.map((f) => {
                const type = (f.types?.[0] ?? "other") as DeadlineType;
                const meta = eventMeta(type);
                const on = filter === f.key;
                const n = filterByKey(approved, f.key, "").length;
                return (
                  <motion.button
                    key={f.key}
                    layout
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setFilter(f.key)}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[10px] outline-none transition-all focus:outline-none focus-visible:outline-none ${
                      f.key === "all"
                        ? `bg-cyan/12 text-cyan ring-1 ring-cyan/30 ${on ? "ring-2" : ""}`
                        : `${meta.chip} ${on ? "ring-2" : ""} ${filter === "all" || on ? "opacity-100" : "opacity-40"}`
                    }`}
                  >
                    <Marker
                      shape={f.key === "all" ? "circle" : shapeForDeadline(type)}
                      color="currentColor"
                      size={8}
                    />
                    {f.label}
                    <span className="opacity-70">{n}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          >
            {tab === "feed" && (
              <div className="flex flex-col gap-5 sm:gap-6">
                {/* ── Top Live Class / Timetable Hero (Centerpiece) ── */}
                <LiveClassHero
                  now={now}
                  deadlines={deadlines}
                  onSeeFullTimetable={() => setTab("timetable")}
                  onSeeExams={() => {
                    setTab("exams");
                    setExamSubTab("midterm");
                  }}
                  canManage={isMod}
                />

                {/* ── Active Filter Bar (shows when any filter is toggled) ── */}
                {(urgentOnly || pendingOnly || feedCategory !== "all" || feedSearch) && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-cyan/30 bg-cyan/10 px-3.5 py-2 text-xs backdrop-blur-md">
                    <div className="flex items-center gap-2">
                      <Filter className="size-3.5 text-cyan" />
                      <span className="font-semibold text-ink">
                        Active filter:{" "}
                        <span className="text-cyan font-bold">
                          {urgentOnly
                            ? "Due in 48 Hours"
                            : pendingOnly
                              ? "Pending Checklist Only"
                              : feedCategory !== "all"
                                ? `${feedCategory.charAt(0).toUpperCase() + feedCategory.slice(1)}s`
                                : `Search "${feedSearch}"`}
                        </span>
                      </span>
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={filteredUpcoming.length}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          transition={{ duration: 0.18 }}
                          className="font-mono text-[11px] text-dim"
                        >
                          ({filteredUpcoming.length}{" "}
                          {filteredUpcoming.length === 1 ? "event" : "events"} shown)
                        </motion.span>
                      </AnimatePresence>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUrgentOnly(false);
                        setPendingOnly(false);
                        setFeedCategory("all");
                        setFeedSearch("");
                      }}
                      className="font-mono text-xs font-bold text-cyan hover:underline cursor-pointer"
                    >
                      Reset all filters
                    </button>
                  </div>
                )}

                {/* ── Compact 48-Hour Urgency Ticker ── */}
                {recencyBuckets.critical.length > 0 && !urgentOnly && (
                  <div className="flex items-center gap-2 rounded-xl border border-rose/30 bg-rose/5 px-3 py-1.5 text-xs backdrop-blur-md overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="flex items-center gap-1.5 shrink-0 text-rose font-bold">
                      <Flame className="size-3.5 animate-pulse" />
                      <span className="uppercase tracking-wider text-[10px] sm:text-[11px]">
                        Due in 48h ({recencyBuckets.critical.length}):
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-0.5">
                      {recencyBuckets.critical.map((item, i) => {
                        const itemColor = autoColor(item.subject || item.title);
                        const isItemDone = isDone(item.id);
                        return (
                          <motion.button
                            key={item.id}
                            type="button"
                            initial={{ opacity: 0, x: -12, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            transition={{
                              delay: i * 0.05,
                              type: "spring",
                              stiffness: 400,
                              damping: 25,
                            }}
                            whileHover={{ scale: 1.05, y: -1 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => setSelected(item)}
                            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-0.5 text-left transition-all cursor-pointer ${
                              isItemDone
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 opacity-85"
                                : "border-border bg-surface hover:border-rose/50 hover:shadow-xs text-ink urgent-ring"
                            }`}
                          >
                            <span
                              className="size-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: itemColor }}
                            />
                            <span className="font-bold text-[11px] whitespace-nowrap">
                              {formatTickerLabel(item)}
                            </span>
                            <span className="text-[10px] text-rose font-mono shrink-0">
                              · {timeLeft(item.due_at, now)}
                            </span>
                            {isItemDone && (
                              <span className="text-[10px] text-emerald-500 font-bold">✓</span>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Mobile View Switcher (Feed Timeline vs Batch Announcements) ── */}
                <div className="lg:hidden flex rounded-2xl bg-surface2/70 p-1 border border-border/80">
                  <button
                    type="button"
                    onClick={() => setMobileTab("timeline")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      mobileTab === "timeline"
                        ? "bg-surface text-ink shadow-xs"
                        : "text-dim hover:text-ink"
                    }`}
                  >
                    <ListFilter className="size-3.5" />
                    <span>Events Timeline ({filteredUpcoming.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileTab("sidebar")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      mobileTab === "sidebar"
                        ? "bg-surface text-ink shadow-xs"
                        : "text-dim hover:text-ink"
                    }`}
                  >
                    <Megaphone className="size-3.5 text-cyan" />
                    <span>Announcements & Attendance</span>
                  </button>
                </div>

                {/* ── Main Feed & Sidebar Grid ── */}
                <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
                  {/* Left Column: Feed Timeline */}
                  <div
                    className={`min-w-0 flex flex-col gap-3.5 ${mobileTab === "sidebar" ? "hidden lg:flex" : "flex"}`}
                  >
                    {/* Modern Feed Command Bar */}
                    <div className="rounded-2xl border border-border/80 bg-surface/90 p-2.5 sm:p-3 backdrop-blur-md shadow-xs space-y-2.5">
                      {/* Search Bar + Quick Actions */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-faint pointer-events-none" />
                          <input
                            ref={searchInputRef}
                            type="text"
                            value={feedSearch}
                            onChange={(e) => setFeedSearch(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") {
                                setFeedSearch("");
                                searchInputRef.current?.blur();
                              }
                            }}
                            placeholder="Filter events by title, course, location... (Press / to search)"
                            className="w-full rounded-xl bg-surface2/60 pl-8 pr-16 py-1.5 text-xs text-ink placeholder:text-faint border border-border/60 outline-none focus:border-cyan/50 focus:ring-1 focus:ring-cyan/30"
                          />
                          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            {feedSearch ? (
                              <button
                                type="button"
                                onClick={() => setFeedSearch("")}
                                className="text-faint hover:text-ink cursor-pointer p-0.5"
                              >
                                <X className="size-3" />
                              </button>
                            ) : (
                              <kbd className="hidden sm:inline-block rounded px-1.5 py-0.2 text-[10px] font-mono bg-surface border border-border/70 text-faint">
                                /
                              </kbd>
                            )}
                          </div>
                        </div>

                        {/* Density Switcher: Comfortable Cards vs Compact Linear Rows */}
                        <div className="inline-flex items-center justify-end rounded-xl bg-surface2/60 border border-border/60 p-0.5 shrink-0 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleDensityChange("comfortable")}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                              feedDensity === "comfortable"
                                ? "bg-surface text-ink shadow-xs font-semibold border border-border/80"
                                : "text-faint hover:text-ink"
                            }`}
                            title="Comfortable Cards view with full scope, countdowns, and quick actions"
                          >
                            <LayoutGrid className="size-3.5" />
                            <span className="hidden sm:inline">Cards</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDensityChange("compact")}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                              feedDensity === "compact"
                                ? "bg-surface text-ink shadow-xs font-semibold border border-border/80"
                                : "text-faint hover:text-ink"
                            }`}
                            title="Compact Linear view (single-line fast scanning)"
                          >
                            <List className="size-3.5" />
                            <span className="hidden sm:inline">Compact</span>
                          </button>
                        </div>
                      </div>

                      {/* Category Pills & Checklist Counter */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1 border-t border-border/50">
                        {/* Category Pills (Horizontal scrollable) */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                          {FEED_CATEGORIES.map((cat) => {
                            const active = feedCategory === cat.key;
                            return (
                              <motion.button
                                key={cat.key}
                                type="button"
                                whileHover={{ y: -2, scale: 1.03 }}
                                whileTap={{ scale: 0.95 }}
                                animate={
                                  active ? { scale: [1, 1.12, 0.97, 1.04, 1] } : { scale: 1 }
                                }
                                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                                onClick={() => setFeedCategory(cat.key)}
                                className={`group relative inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                                  active
                                    ? "bg-cyan/15 text-cyan border border-cyan/30 shadow-xs shadow-cyan/10 font-bold"
                                    : "text-muted hover:text-ink hover:bg-surface2/60 border border-transparent"
                                }`}
                              >
                                <span
                                  className={
                                    active ? "text-cyan" : "text-faint group-hover:text-muted"
                                  }
                                >
                                  {cat.icon}
                                </span>
                                <span>{cat.label}</span>
                                <span
                                  className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                                    active
                                      ? "bg-cyan/20 text-cyan font-bold"
                                      : "bg-surface2 text-faint group-hover:text-muted"
                                  }`}
                                >
                                  {cat.count}
                                </span>
                              </motion.button>
                            );
                          })}
                        </div>

                        {/* Personal Checklist Preparation Progress */}
                        {totalUpcomingCount > 0 && (
                          <div
                            className="inline-flex items-center gap-2 rounded-xl bg-surface2/60 border border-border/60 px-2.5 py-1 text-xs text-muted shrink-0 self-end sm:self-auto cursor-pointer hover:bg-surface2 transition-all"
                            onClick={() => setPendingOnly((v) => !v)}
                            title={`${completedUpcomingCount} of ${totalUpcomingCount} upcoming events marked as prepared. Click to toggle pending only.`}
                          >
                            <CheckCircle2
                              className={`size-3.5 ${
                                progressPercent === 100
                                  ? "text-emerald-400 animate-pulse"
                                  : progressPercent > 0
                                    ? "text-cyan"
                                    : "text-faint"
                              }`}
                            />
                            <span className="font-mono text-[11px] font-medium text-ink">
                              {completedUpcomingCount}/{totalUpcomingCount}
                            </span>
                            <span className="hidden md:inline text-[11px] text-faint">
                              prepared
                            </span>
                            <div className="w-12 h-1.5 rounded-full bg-surface overflow-hidden border border-border/40">
                              <motion.div
                                className="h-full bg-gradient-to-r from-cyan to-emerald-400 rounded-full"
                                animate={{ width: `${progressPercent}%` }}
                                transition={{ type: "spring", stiffness: 120, damping: 22 }}
                              />
                            </div>
                            <span className="font-mono text-[10px] text-cyan font-bold">
                              {progressPercent}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {isFeedLoading ? (
                      <div className="flex flex-col gap-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div
                            key={i}
                            className="h-32 rounded-2xl shimmer-sweep border border-border/40"
                          />
                        ))}
                      </div>
                    ) : filteredUpcoming.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border/80 bg-surface/30 p-8 text-center">
                        <motion.div
                          animate={{
                            rotate: [0, -10, 10, -5, 5, 0],
                            scale: [1, 1.1, 0.95, 1.05, 1],
                          }}
                          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                          className="mx-auto flex size-12 items-center justify-center rounded-xl bg-cyan/10 text-cyan mb-4"
                        >
                          <Sparkles className="size-6" />
                        </motion.div>
                        <h3 className="text-sm font-semibold text-ink">No events found</h3>
                        <p className="mt-1 text-xs text-dim max-w-xs mx-auto">
                          {feedSearch
                            ? `No deadlines or exams matching "${feedSearch}".`
                            : urgentOnly
                              ? "No deadlines due in the next 48 hours."
                              : pendingOnly
                                ? "All upcoming deadlines are marked as done!"
                                : feedCategory === "all"
                                  ? "No upcoming deadlines or exams scheduled."
                                  : `No upcoming events in ${feedCategory}.`}
                        </p>
                        {(feedCategory !== "all" || feedSearch || urgentOnly || pendingOnly) && (
                          <button
                            type="button"
                            onClick={() => {
                              setFeedCategory("all");
                              setFeedSearch("");
                              setUrgentOnly(false);
                              setPendingOnly(false);
                            }}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-surface2 border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:text-cyan transition-all cursor-pointer"
                          >
                            Reset filters
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="relative pl-4 sm:pl-7 border-l-2 border-border/70 ml-3.5 sm:ml-5 flex flex-col gap-6">
                        {/* Bucket 1: Due in 48 Hours / Ongoing */}
                        {recencyBuckets.critical.length > 0 && (
                          <div className="relative">
                            {/* Spine Anchor Dot */}
                            <div className="absolute -left-[29px] sm:-left-[43px] top-0 size-6 sm:size-7 rounded-full bg-surface border-2 border-rose flex items-center justify-center text-rose shadow-lg shadow-rose/20">
                              <Flame className="size-3.5 fill-rose/30 animate-pulse" />
                            </div>

                            <div
                              onClick={() =>
                                setCollapsedBuckets((prev) => ({
                                  ...prev,
                                  critical: !prev.critical,
                                }))
                              }
                              className="mb-3 flex items-center justify-between gap-2 cursor-pointer select-none group"
                            >
                              <div className="flex items-center gap-2">
                                <h3 className="font-body text-[12px] font-semibold text-rose">
                                  Due in 48 Hours
                                </h3>
                                <span className="rounded-full bg-rose/15 border border-rose/30 px-2 py-0.5 font-mono text-[10px] font-bold text-rose">
                                  {recencyBuckets.critical.length}
                                </span>
                              </div>
                              <span className="font-mono text-[10px] text-faint group-hover:text-ink flex items-center gap-1">
                                {collapsedBuckets.critical ? (
                                  <>
                                    <span>Expand</span>
                                    <ChevronDown className="size-3.5" />
                                  </>
                                ) : (
                                  <>
                                    <span>Collapse</span>
                                    <ChevronUp className="size-3.5" />
                                  </>
                                )}
                              </span>
                            </div>

                            {!collapsedBuckets.critical && (
                              <FeedList
                                items={recencyBuckets.critical}
                                empty="Nothing due in 48 hours."
                                now={now}
                                isMod={isMod}
                                onEdit={openEdit}
                                onDelete={(x) => remove.mutate(x)}
                                onOpen={setSelected}
                                density={feedDensity}
                                isDone={isDone}
                                onToggleDone={toggleDone}
                              />
                            )}
                          </div>
                        )}

                        {/* Bucket 2: This Week (3-7 Days) */}
                        {recencyBuckets.thisWeek.length > 0 && (
                          <div className="relative">
                            {/* Spine Anchor Dot */}
                            <div className="absolute -left-[29px] sm:-left-[43px] top-0 size-6 sm:size-7 rounded-full bg-surface border-2 border-cyan flex items-center justify-center text-cyan shadow-lg shadow-cyan/20">
                              <Clock className="size-3.5" />
                            </div>

                            <div
                              onClick={() =>
                                setCollapsedBuckets((prev) => ({
                                  ...prev,
                                  thisWeek: !prev.thisWeek,
                                }))
                              }
                              className="mb-3 flex items-center justify-between gap-2 cursor-pointer select-none group"
                            >
                              <div className="flex items-center gap-2">
                                <h3 className="font-body text-[12px] font-semibold text-cyan">
                                  This Week
                                </h3>
                                <span className="rounded-full bg-cyan/15 border border-cyan/30 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan">
                                  {recencyBuckets.thisWeek.length}
                                </span>
                              </div>
                              <span className="font-mono text-[10px] text-faint group-hover:text-ink flex items-center gap-1">
                                {collapsedBuckets.thisWeek ? (
                                  <>
                                    <span>Expand</span>
                                    <ChevronDown className="size-3.5" />
                                  </>
                                ) : (
                                  <>
                                    <span>Collapse</span>
                                    <ChevronUp className="size-3.5" />
                                  </>
                                )}
                              </span>
                            </div>

                            {!collapsedBuckets.thisWeek && (
                              <FeedList
                                items={recencyBuckets.thisWeek}
                                empty="No events this week."
                                now={now}
                                isMod={isMod}
                                onEdit={openEdit}
                                onDelete={(x) => remove.mutate(x)}
                                onOpen={setSelected}
                                density={feedDensity}
                                isDone={isDone}
                                onToggleDone={toggleDone}
                              />
                            )}
                          </div>
                        )}

                        {/* Bucket 3: Coming Up Later */}
                        {recencyBuckets.later.length > 0 && (
                          <div className="relative">
                            {/* Spine Anchor Dot */}
                            <div className="absolute -left-[29px] sm:-left-[43px] top-0 size-6 sm:size-7 rounded-full bg-surface border-2 border-violet flex items-center justify-center text-violet shadow-lg shadow-violet/20">
                              <Sparkles className="size-3.5" />
                            </div>

                            <div
                              onClick={() =>
                                setCollapsedBuckets((prev) => ({ ...prev, later: !prev.later }))
                              }
                              className="mb-3 flex items-center justify-between gap-2 cursor-pointer select-none group"
                            >
                              <div className="flex items-center gap-2">
                                <h3 className="font-body text-[12px] font-semibold text-violet">
                                  Later
                                </h3>
                                <span className="rounded-full bg-violet/15 border border-violet/30 px-2 py-0.5 font-mono text-[10px] font-bold text-violet">
                                  {recencyBuckets.later.length}
                                </span>
                              </div>
                              <span className="font-mono text-[10px] text-faint group-hover:text-ink flex items-center gap-1">
                                {collapsedBuckets.later ? (
                                  <>
                                    <span>Expand</span>
                                    <ChevronDown className="size-3.5" />
                                  </>
                                ) : (
                                  <>
                                    <span>Collapse</span>
                                    <ChevronUp className="size-3.5" />
                                  </>
                                )}
                              </span>
                            </div>

                            {!collapsedBuckets.later && (
                              <FeedList
                                items={recencyBuckets.later}
                                empty="No later events."
                                now={now}
                                isMod={isMod}
                                onEdit={openEdit}
                                onDelete={(x) => remove.mutate(x)}
                                onOpen={setSelected}
                                density={feedDensity}
                                isDone={isDone}
                                onToggleDone={toggleDone}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Collapsible Past & Completed Events */}
                    {allCompleted.length > 0 && (
                      <div className="mt-4 rounded-2xl border border-border/60 bg-surface/30 p-4 transition-all">
                        <button
                          type="button"
                          onClick={() => setShowPastFeed((prev) => !prev)}
                          className="flex w-full items-center justify-between text-left group cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <CheckCircle2 className="size-4 text-emerald-400" />
                            <span className="text-xs font-semibold text-ink group-hover:text-cyan transition-colors">
                              Past & Completed Events
                            </span>
                            <span className="rounded-full bg-surface2 border border-border/80 px-2 py-0.5 font-mono text-[10px] text-faint">
                              {allCompleted.length}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted group-hover:text-ink transition-colors">
                            <span className="font-mono text-[11px]">
                              {showPastFeed ? "Hide archive" : "Show archive"}
                            </span>
                            {showPastFeed ? (
                              <ChevronUp className="size-4" />
                            ) : (
                              <ChevronDown className="size-4" />
                            )}
                          </div>
                        </button>

                        <AnimatePresence>
                          {showPastFeed && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="overflow-hidden pt-4"
                            >
                              <FeedList
                                items={allCompleted}
                                empty="No completed events found."
                                now={now}
                                isMod={isMod}
                                onEdit={openEdit}
                                onDelete={(x) => remove.mutate(x)}
                                onOpen={setSelected}
                                density="compact"
                                isDone={isDone}
                                onToggleDone={toggleDone}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Announcements, Attendance, Activity Sidebar */}
                  <aside
                    className={`min-w-0 flex-col gap-6 lg:sticky lg:top-24 ${mobileTab === "sidebar" ? "flex" : "hidden lg:flex"}`}
                  >
                    <AnnouncementsPanel compact />
                    <div className="block">
                      <FeedSection
                        title="Attendance Overview"
                        tone="text-cyan"
                        onSeeAll={() => setTab("attendance")}
                      >
                        <AttendancePanel now={now} compact />
                      </FeedSection>
                    </div>
                    <ActivityPanel compact />
                  </aside>
                </div>
              </div>
            )}

            {tab === "calendar" && (
              <CalendarPanel
                canManage={isMod}
                batchId={batchId}

                deadlines={filtered}
                sessions={filter === "all" ? sessions : []}
                courses={courses}
                now={now}
                onSelect={setSelected}
                onEditDeadline={openEdit}
              />
            )}

            {tab === "timetable" && <TimetablePanel />}

            {tab === "quizzes" && (
              <DeadlineBoard
                title="Quizzes"
                items={quizzes}
                now={now}
                canManage={isMod}
                showMarks
                onEdit={openEdit}
                onDelete={(x) => remove.mutate(x)}
                onOpen={setSelected}
              />
            )}

            {tab === "exams" && (
              <ExamsPanel
                deadlines={deadlines}
                now={now}
                canManage={isMod}
                initialSubTab={examSubTab}
                onEdit={openEdit}
                onDelete={(x) => remove.mutate(x)}
                onOpen={setSelected}
                onAddExam={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
              />
            )}

            {tab === "grading" && <GradingPanel />}

            {tab === "attendance" && <AttendancePanel now={now} />}

            {tab === "admin" && <AdminConsolePanel />}
          </motion.div>
        </AnimatePresence>
      </main>

      <EventDrawer
        deadline={selected}
        now={now}
        canManage={isMod}
        onClose={() => setSelected(null)}
        onEdit={openEdit}
        onDelete={(d) => remove.mutate(d)}
      />

      <Dialog open={panel !== null} onOpenChange={(o) => !o && setPanel(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display tracking-tight">
              {panel ? PANEL_TITLES[panel] : ""}
            </DialogTitle>
          </DialogHeader>
          {panel === "members" && <MembersPanel />}
          {panel === "feedback" && <FeedbackPanel />}
          {panel === "approvals" && isMod && (
            <ApprovalsPanel deadlines={deadlines} onSelect={setSelected} />
          )}
          {panel === "inbox" && isMod && <EmailInboxPanel />}
        </DialogContent>
      </Dialog>

      {isMod && (
        <DeadlineDialog open={dialogOpen} onOpenChange={setDialogOpen} deadline={editing} />
      )}
    </div>
  );
}

const feedContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.02,
    },
  },
};

const feedItemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 380,
      damping: 26,
    },
  },
  exit: { opacity: 0, scale: 0.96, y: -10, transition: { duration: 0.15 } },
};

/** A list of feed cards with generous spacing and fluid stagger animations. */
function FeedList({
  items,
  empty,
  now,
  isMod,
  onEdit,
  onDelete,
  onOpen,
  density = "comfortable",
  isDone,
  onToggleDone,
}: {
  items: Deadline[];
  empty: string;
  now: number;
  isMod: boolean;
  onEdit: (d: Deadline) => void;
  onDelete: (d: Deadline) => void;
  onOpen: (d: Deadline) => void;
  density?: "comfortable" | "compact";
  isDone?: (id: string) => boolean;
  onToggleDone?: (id: string, e: React.MouseEvent) => void;
}) {
  if (items.length === 0)
    return (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="py-6 text-center font-mono text-xs text-faint rounded-2xl border border-dashed border-border/80 bg-surface/30"
      >
        {empty}
      </motion.p>
    );

  return (
    <motion.div
      variants={feedContainerVariants}
      initial="hidden"
      animate="show"
      className={density === "compact" ? "flex flex-col gap-2" : "flex flex-col gap-4 sm:gap-5"}
    >
      <AnimatePresence mode="popLayout">
        {items.map((d, index) => (
          <motion.div
            key={d.id}
            variants={feedItemVariants}
            layout="position"
            exit={{ opacity: 0, x: -20, scale: 0.95, transition: { duration: 0.18 } }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 28,
              delay: Math.min(index * 0.04, 0.3),
            }}
          >
            {density === "compact" ? (
              <FeedCompactRow
                deadline={d}
                now={now}
                canManage={isMod}
                onEdit={onEdit}
                onDelete={onDelete}
                onOpen={onOpen}
                isDone={isDone ? isDone(d.id) : false}
                onToggleDone={onToggleDone}
              />
            ) : (
              <FeedCard
                deadline={d}
                now={now}
                canManage={isMod}
                onEdit={onEdit}
                onDelete={onDelete}
                onOpen={onOpen}
                isDone={isDone ? isDone(d.id) : false}
                onToggleDone={onToggleDone}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

/** Titled block used to break the feed into readable sections. */
function FeedSection({
  title,
  icon,
  tone,
  count,
  urgent = false,
  onSeeAll,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  tone: string;
  count?: number;
  urgent?: boolean;
  onSeeAll?: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-12"
    >
      <div className="mb-5 flex items-center gap-3">
        {icon && <span className={tone}>{icon}</span>}
        <p className={`font-mono text-xs font-semibold uppercase tracking-[0.2em] ${tone}`}>
          {title}
        </p>
        <span className="h-px flex-1 bg-border/80" />
        {typeof count === "number" && (
          <motion.span
            key={count}
            initial={{ scale: 0.85 }}
            animate={{ scale: 1 }}
            className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium ring-1 ${
              urgent
                ? "bg-rose/12 text-rose ring-rose/30 font-bold animate-pulse"
                : "bg-surface2 text-dim ring-border"
            }`}
          >
            {count}
          </motion.span>
        )}
        {onSeeAll && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSeeAll}
            className="rounded-xl px-3 py-1 font-mono text-xs font-medium text-dim ring-1 ring-border transition-colors hover:bg-surface2 hover:text-ink cursor-pointer"
          >
            See all
          </motion.button>
        )}
      </div>
      {children}
    </motion.section>
  );
}

/** Full-tab list of one kind of work, split into what's live, ahead and done. */
function DeadlineBoard({
  title,
  items,
  now,
  canManage,
  typeFilters,
  showMarks = false,
  onEdit,
  onDelete,
  onOpen,
}: {
  title: string;
  items: Deadline[];
  now: number;
  canManage: boolean;
  typeFilters?: readonly DeadlineType[];
  showMarks?: boolean;
  onEdit: (d: Deadline) => void;
  onDelete: (d: Deadline) => void;
  onOpen: (d: Deadline) => void;
}) {
  const [types, setTypes] = useState<DeadlineType[]>([]);

  const shown = useMemo(
    () => (types.length === 0 ? items : items.filter((d) => types.includes(d.type))),
    [items, types],
  );

  const groups: [string, Deadline[], string][] = [
    ["Happening now", shown.filter((d) => phaseOf(d, now) === "ongoing"), "text-cyan"],
    ["Upcoming", shown.filter((d) => phaseOf(d, now) === "upcoming"), "text-amber"],
    [
      "Completed",
      shown
        .filter((d) => phaseOf(d, now) === "completed")
        .sort((a, b) => new Date(b.due_at).getTime() - new Date(a.due_at).getTime()),
      "text-evt-present",
    ],
  ];

  return (
    <section className="mt-2">
      <h2 className="mb-6 font-display text-xl font-semibold tracking-tight">{title}</h2>

      {typeFilters && typeFilters.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setTypes([])}
            className={`rounded-lg px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] outline-none ring-1 transition-colors focus:outline-none focus-visible:outline-none ${
              types.length === 0
                ? "bg-cyan/15 text-cyan ring-cyan/40"
                : "text-dim ring-border hover:text-ink"
            }`}
          >
            All ({items.length})
          </button>
          {typeFilters.map((t) => {
            const meta = eventMeta(t);
            const n = items.filter((d) => d.type === t).length;
            const on = types.includes(t);
            return (
              <button
                key={t}
                onClick={() =>
                  setTypes((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))
                }
                className={`rounded-lg px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] outline-none transition-all focus:outline-none focus-visible:outline-none ${meta.chip} ${
                  on ? "ring-2" : ""
                } ${types.length > 0 && !on ? "opacity-50" : ""}`}
              >
                {meta.label} ({n})
              </button>
            );
          })}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="rounded-2xl bg-surface/50 px-8 py-14 text-center font-mono text-xs text-faint ring-1 ring-border">
          Nothing here yet.
        </p>
      ) : (
        <div className="flex flex-col gap-9">
          {groups.map(([label, list, tone]) =>
            list.length === 0 ? null : (
              <div key={label}>
                <div className="mb-3 flex items-center gap-3">
                  <p className={`font-mono text-[10px] uppercase tracking-[0.2em] ${tone}`}>
                    {label}
                  </p>
                  <span className="h-px flex-1 bg-border" />
                  <p className="font-mono text-[10px] text-faint">{list.length}</p>
                </div>
                <div className={`flex flex-col gap-4 ${label === "Completed" ? "opacity-70" : ""}`}>
                  {list.map((d) => (
                    <div key={d.id}>
                      <DeadlineRow
                        deadline={d}
                        now={now}
                        canManage={canManage}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onOpen={onOpen}
                      />
                      {showMarks && <ExamMarks deadline={d} />}
                    </div>
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </section>
  );
}
