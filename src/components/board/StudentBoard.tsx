import { useEffect, useMemo, useState } from "react";
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
  Flame,
  GraduationCap,
  Layers,
  LayoutGrid,
  List,
  ListFilter,
  Mail,
  Plus,
  Presentation,
  Radio,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import { GradingPanel } from "@/components/grading/GradingPanel";
import { ExamsPanel } from "@/components/exams/ExamsPanel";
import { toast } from "sonner";
import { db as supabase } from "@/lib/backend";
import { useAuth } from "@/hooks/use-auth";
import { useBatch } from "@/hooks/use-batch";
import { useMe } from "@/hooks/use-me";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BoardHeader } from "@/components/board/BoardHeader";
import { DeadlineRow } from "@/components/board/DeadlineRow";
import { ExamMarks } from "@/components/board/ExamMarks";
import { DeadlineDialog } from "@/components/board/DeadlineDialog";
import { EventDrawer } from "@/components/board/EventDrawer";
import { ApprovalsPanel } from "@/components/board/ApprovalsPanel";
import { AnnouncementsPanel } from "@/components/board/AnnouncementsPanel";
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
import { coursesQuery, sessionsQuery } from "@/lib/batches";
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


type TabKey = "feed" | "calendar" | "timetable" | "quizzes" | "exams" | "grading" | "attendance" | "admin";

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
  const isMod = canManage || isModerator || isAdmin || isArush;
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
    } catch {}
  };

  const [feedCategory, setFeedCategory] = useState<
    "all" | "quiz" | "assignment" | "exam" | "presentation" | "other"
  >("all");
  const [showCompleted, setShowCompleted] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Deadline | null>(null);
  const [selected, setSelected] = useState<Deadline | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [panel, setPanel] = useState<PanelKey | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
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

  const filtered = useMemo(
    () => filterByKey(approved, filter, ""),
    [approved, filter],
  );

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
  const upcomingOf = (list: Deadline[]) => list.filter((d) => phaseOf(d, now) !== "completed");
  const nextQuizzes = useMemo(() => upcomingOf(quizzes), [quizzes, now]);
  const nextMidterms = useMemo(() => upcomingOf(midterms), [midterms, now]);
  const nextEndterms = useMemo(() => upcomingOf(endterms), [endterms, now]);
  const nextProjects = useMemo(() => upcomingOf(projects), [projects, now]);

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

  // Filtered upcoming feed by selected category
  const filteredUpcoming = useMemo(() => {
    if (feedCategory === "all") return allUpcoming;
    if (feedCategory === "exam") {
      return allUpcoming.filter((d) => d.type === "midterm" || d.type === "endterm");
    }
    if (feedCategory === "other") {
      return allUpcoming.filter((d) => d.type === "guest_lecture" || d.type === "other");
    }
    return allUpcoming.filter((d) => d.type === feedCategory);
  }, [allUpcoming, feedCategory]);

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
  const progressPercent = totalUpcomingCount > 0 ? Math.round((completedUpcomingCount / totalUpcomingCount) * 100) : 0;

  const FEED_CATEGORIES = [
    { key: "all" as const, label: "All Upcoming", count: allUpcoming.length, icon: <Layers className="size-3.5" /> },
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

  type TabDef = { key: TabKey; label: string; icon: React.ReactNode };

  const tabs: TabDef[] = [
    { key: "feed", label: "Feed", icon: <ListFilter className="size-4" /> },
    { key: "calendar", label: "Calendar", icon: <CalendarRange className="size-4" /> },
    { key: "timetable", label: "Timetable", icon: <CalendarClock className="size-4" /> },
    ...(quizzes.length > 0
      ? [{ key: "quizzes" as TabKey, label: "Quizzes", icon: <FileQuestion className="size-4" /> }]
      : []),
    { key: "exams", label: "Exams", icon: <GraduationCap className="size-4" /> },
    { key: "grading", label: "Grading", icon: <Award className="size-4" /> },
    { key: "attendance", label: "Attendance", icon: <UserCheck className="size-4" /> },
    ...(isAdmin || isArush
      ? [{ key: "admin" as TabKey, label: "Admin Console", icon: <ShieldCheck className="size-4 text-emerald-400" /> }]
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
    <div className="relative min-h-screen overflow-x-hidden bg-ground font-body text-ink">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-24 -top-32 h-[420px] w-[560px] rounded-full bg-cyan/[0.06] blur-[130px] dark:bg-cyan/12" />
        <div className="absolute right-[-80px] top-[180px] h-[380px] w-[500px] rounded-full bg-amber/[0.06] blur-[140px] dark:bg-amber/12" />
      </div>

      <BoardHeader menuItems={menuItems} onMenuSelect={(k) => setPanel(k as PanelKey)} />

      <main className="relative z-10 mx-auto max-w-[1440px] px-3 sm:px-6 pt-2.5 sm:pt-3.5 pb-16">
        {/* ── Compact Integrated Control Deck: Greeting + Tabs (No wasted space) ── */}
        <div className="mb-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-2.5">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <h1 className="font-display text-base sm:text-lg font-bold tracking-tight text-ink truncate">
              {me.name ? `${me.greeting}, ${me.name}` : "Academic Board"}
            </h1>
            {batch && (
              <span className="inline-flex rounded-md bg-surface2 px-2 py-0.5 font-sans text-[11px] font-semibold text-dim border border-border shrink-0">
                {batch.programme_name ? `${batch.programme_name} · ` : ""}{batch.name}
              </span>
            )}
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync
            </span>
          </div>

          <div className="w-full sm:w-auto min-w-0 max-w-full flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* Inline Navigation Tabs */}
            <nav
              aria-label="Board sections"
              className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1 shadow-xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shrink-0"
            >
              {tabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  aria-current={tab === t.key ? "page" : undefined}
                  className={`relative flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1 text-xs font-semibold transition-all ${
                    tab === t.key
                      ? "bg-cyan text-white shadow-xs"
                      : "text-dim hover:text-ink hover:bg-surface2"
                  }`}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              ))}
            </nav>

            {isMod && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
                className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-xl bg-cyan px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-cyan/90 transition-all"
              >
                <Plus className="size-3.5" />
                <span className="hidden md:inline">Add Event</span>
              </button>
            )}
          </div>
        </div>

        {/* ── "Up Next" Live Classroom HUD & Countdown ── */}
        <LiveClassHud
          sessions={sessions}
          batchName={batch?.name}
          onNavigateToTimetable={() => setTab("timetable")}
        />

        {/* ── Compact 48-Hour Urgency Ticker (Only 34px tall, tells EXACTLY what is due!) ── */}
        {recencyBuckets.critical.length > 0 && (
          <div className="mb-2.5 flex items-center gap-2 rounded-xl border border-rose/30 bg-rose/5 px-3 py-1.5 text-xs backdrop-blur-md overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1.5 shrink-0 text-rose font-bold">
              <Flame className="size-3.5 animate-pulse" />
              <span className="uppercase tracking-wider text-[10px] sm:text-[11px]">Due in 48h ({recencyBuckets.critical.length}):</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
              {recencyBuckets.critical.map((item) => {
                const itemColor = autoColor(item.subject || item.title);
                const isItemDone = isDone(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelected(item)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-0.5 text-left transition-all ${
                      isItemDone
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 opacity-85"
                        : "border-border bg-surface hover:border-rose/50 hover:shadow-xs text-ink"
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
                    {isItemDone && <span className="text-[10px] text-emerald-500 font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
              <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
                <div className="min-w-0 flex flex-col gap-3">
                  {/* Modern Feed Command Bar */}
                  <div className="rounded-xl border border-border/70 bg-surface/80 p-2 sm:p-2.5 backdrop-blur-md shadow-xs">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      {/* Category Pills (Horizontal scrollable) */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                        {FEED_CATEGORIES.map((cat) => {
                          const active = feedCategory === cat.key;
                          return (
                            <button
                              key={cat.key}
                              type="button"
                              onClick={() => setFeedCategory(cat.key)}
                              className={`group inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                                active
                                  ? "bg-cyan/15 text-cyan border border-cyan/30 shadow-sm shadow-cyan/10"
                                  : "text-muted hover:text-ink hover:bg-surface-elevated border border-transparent"
                              }`}
                            >
                              <span className={active ? "text-cyan" : "text-faint group-hover:text-muted"}>
                                {cat.icon}
                              </span>
                              <span>{cat.label}</span>
                              <span
                                className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                                  active
                                    ? "bg-cyan/20 text-cyan font-semibold"
                                    : "bg-surface text-faint group-hover:text-muted"
                                }`}
                              >
                                {cat.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Right toolbar controls: Personal Checklist & Density Switcher */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                        {/* Personal Checklist Preparation Progress */}
                        {totalUpcomingCount > 0 && (
                          <div
                            className="inline-flex items-center gap-2 rounded-xl bg-surface-elevated/80 border border-border/60 px-2.5 py-1 text-xs text-muted"
                            title={`${completedUpcomingCount} of ${totalUpcomingCount} upcoming events marked as prepared / done`}
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
                            <span className="hidden md:inline text-[11px] text-faint">prepared</span>
                            <div className="w-12 h-1.5 rounded-full bg-surface overflow-hidden border border-border/40">
                              <div
                                className="h-full bg-gradient-to-r from-cyan to-emerald-400 transition-all duration-500 rounded-full"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                            <span className="font-mono text-[10px] text-cyan font-bold">{progressPercent}%</span>
                          </div>
                        )}

                        {/* Density Switcher: Comfortable Cards vs Compact Linear Rows */}
                        <div className="inline-flex items-center rounded-xl bg-surface border border-border/60 p-0.5">
                          <button
                            type="button"
                            onClick={() => handleDensityChange("comfortable")}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                              feedDensity === "comfortable"
                                ? "bg-surface-elevated text-ink shadow-sm font-semibold border border-border/80"
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
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                              feedDensity === "compact"
                                ? "bg-surface-elevated text-ink shadow-sm font-semibold border border-border/80"
                                : "text-faint hover:text-ink"
                            }`}
                            title="Compact Linear view (single-line fast scanning)"
                          >
                            <List className="size-3.5" />
                            <span className="hidden sm:inline">Compact</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isFeedLoading ? (
                    <div className="flex flex-col gap-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-32 animate-pulse rounded-3xl bg-surface/50 border border-border" />
                      ))}
                    </div>
                  ) : filteredUpcoming.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border/80 bg-surface/30 p-8 text-center">
                      <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-cyan/10 text-cyan mb-3">
                        <Sparkles className="size-5" />
                      </div>
                      <h3 className="text-sm font-semibold text-ink">No upcoming events</h3>
                      <p className="mt-1 text-xs text-dim max-w-xs mx-auto">
                        {feedCategory === "all"
                          ? "No upcoming deadlines or exams scheduled."
                          : `No upcoming events in ${feedCategory}.`}
                      </p>
                      {feedCategory !== "all" && (
                        <button
                          type="button"
                          onClick={() => setFeedCategory("all")}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-surface2 border border-border px-2.5 py-1 text-xs font-medium text-ink hover:text-cyan transition-all"
                        >
                          Show all
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

                          <div className="mb-3 flex items-center gap-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-rose">
                              Due in 48 Hours
                            </h3>
                            <span className="rounded-full bg-rose/15 border border-rose/30 px-2 py-0.5 font-mono text-[10px] font-bold text-rose">
                              {recencyBuckets.critical.length}
                            </span>
                          </div>

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
                        </div>
                      )}

                      {/* Bucket 2: This Week (3-7 Days) */}
                      {recencyBuckets.thisWeek.length > 0 && (
                        <div className="relative">
                          {/* Spine Anchor Dot */}
                          <div className="absolute -left-[29px] sm:-left-[43px] top-0 size-6 sm:size-7 rounded-full bg-surface border-2 border-amber flex items-center justify-center text-amber shadow-lg shadow-amber/20">
                            <Clock className="size-3.5" />
                          </div>

                          <div className="mb-3 flex items-center gap-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-amber">
                              This Week
                            </h3>
                            <span className="rounded-full bg-amber/15 border border-amber/30 px-2 py-0.5 font-mono text-[10px] font-bold text-amber">
                              {recencyBuckets.thisWeek.length}
                            </span>
                          </div>

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
                        </div>
                      )}

                      {/* Bucket 3: Coming Up Later */}
                      {recencyBuckets.later.length > 0 && (
                        <div className="relative">
                          {/* Spine Anchor Dot */}
                          <div className="absolute -left-[29px] sm:-left-[43px] top-0 size-6 sm:size-7 rounded-full bg-surface border-2 border-cyan flex items-center justify-center text-cyan shadow-lg shadow-cyan/20">
                            <Sparkles className="size-3.5" />
                          </div>

                          <div className="mb-3 flex items-center gap-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan">
                              Later
                            </h3>
                            <span className="rounded-full bg-cyan/15 border border-cyan/30 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan">
                              {recencyBuckets.later.length}
                            </span>
                          </div>

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
                        className="flex w-full items-center justify-between text-left group"
                      >
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2 className="size-4 text-emerald-400" />
                          <span className="text-xs font-semibold text-ink group-hover:text-cyan transition-colors">
                            Past & Completed Events
                          </span>
                          <span className="rounded-full bg-surface-elevated border border-border/80 px-2 py-0.5 font-mono text-[10px] text-faint">
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

                <aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-24">
                  <AnnouncementsPanel compact />
                  <div className="hidden lg:block">
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
      {items.map((d) => (
        <motion.div key={d.id} variants={feedItemVariants} layout="position">
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
