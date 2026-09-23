import { Fragment, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CircleSlash,
  Filter,
  Pencil,
  Plus,
  RefreshCw,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { db as supabase } from "@/lib/backend";
import { useAuth } from "@/hooks/use-auth";
import { useBatch } from "@/hooks/use-batch";
import { SessionEditDialog } from "@/components/calendar/SessionEditDialog";
import { DeadlineDialog } from "@/components/board/DeadlineDialog";
import {
  attendanceQuery,
  coursesQuery,
  sessionsQuery,
  syncStateQuery,
  type ClassSession,
} from "@/lib/batches";

import {
  FALLBACK_COURSE_COLOR,
  HOLIDAY_KEY,
  autoColor,
  buildColorMap,
  getBatchSubjects,
  sessionLabel,
  sessionFullName,
  isAcademicEvent,
  isDayOff,
  isTeachingClass,
  sessionColor,
  sessionKey,
  subjectCanonicalKey,
} from "@/lib/courses";

import { Marker, shapeForDeadline } from "@/lib/shapes";
import {
  deadlinesQueryFor,
  eventMeta,
  formatDeadlineWhen,
  type Deadline,
  displayTitle,
} from "@/lib/deadlines";
import { saveIcsUrl, syncTimetableNow } from "@/lib/timetable.functions";
import { SessionMeta } from "@/components/common/SessionMeta";

const HOLIDAY_COLOR = "#10B981";

const dayFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "2-digit",
  month: "short",
});
const timeFmt = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

const monthFmt = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });

type ViewFilter = "all" | "classes" | "events" | "holidays";

export function TimetablePanel() {
  const { batchId, batch, canManage, isMember } = useBatch();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: sessions = [], isLoading } = useQuery(sessionsQuery(batchId));
  const { data: courses = [] } = useQuery(coursesQuery(batchId));
  const { data: syncState } = useQuery(syncStateQuery(batchId, canManage));
  const { data: marks = [] } = useQuery(attendanceQuery(batchId, isMember));
  const { data: deadlines = [] } = useQuery(deadlinesQueryFor(batchId));

  /** Sessions this user has already self-marked absent. */
  const absentIds = useMemo(
    () =>
      new Set(
        marks
          .filter((m) => m.user_id === user?.id && m.mark_source === "self" && m.status === "absent")
          .map((m) => m.session_id),
      ),
    [marks, user?.id],
  );

  const markAbsent = useMutation({
    mutationFn: async ({ session, clear }: { session: ClassSession; clear: boolean }) => {
      if (clear) {
        const { error } = await supabase
          .from("attendance_marks")
          .delete()
          .eq("session_id", session.id)
          .eq("user_id", user!.id)
          .eq("mark_source", "self");
        if (error) throw error;
        return "cleared" as const;
      }
      const { error } = await supabase.from("attendance_marks").upsert(
        {
          session_id: session.id,
          batch_id: session.batch_id,
          user_id: user!.id,
          status: "absent",
          mark_source: "self",
          marked_by: user!.id,
        },
        { onConflict: "session_id,user_id,mark_source" },
      );
      if (error) throw error;
      return "saved" as const;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["attendance", batchId] });
      toast.success(res === "cleared" ? "Attendance cleared" : "Marked absent");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [monthStart, setMonthStart] = useState(() => startOfMonth(new Date()));
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");
  const [showSettings, setShowSettings] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  /** Day drill-down: clicking a date switches to that day's agenda. */
  const [dayFocus, setDayFocus] = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<ClassSession | null>(null);
  const [editingDeadline, setEditingDeadline] = useState<Deadline | null>(null);
  const [deadlineDialogOpen, setDeadlineDialogOpen] = useState(false);

  const runSync = useServerFn(syncTimetableNow);
  const saveFeed = useServerFn(saveIcsUrl);

  const sync = useMutation({
    mutationFn: async () => runSync({ data: { batchId: batchId! } }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["class-sessions", batchId] });
      queryClient.invalidateQueries({ queryKey: ["sync-state", batchId] });
      if (res.ok) toast.success(`Timetable ${res.result}`);
      else toast.error(res.result);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const monthEnd = useMemo(
    () => new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1),
    [monthStart],
  );

  /** Unique colour per subject in this batch, catalogued or feed-discovered. */
  const colorMap = useMemo(() => buildColorMap(courses, sessions), [courses, sessions]);
  const colorOf = (s: ClassSession) => sessionColor(s, colorMap);

  /** Consistent alphabetized subjects for this batch across all surfaces. */
  const batchSubjects = useMemo(
    () => getBatchSubjects(courses, sessions, deadlines),
    [courses, sessions, deadlines],
  );

  /** Count of sessions + events for each subject this month */
  const subjectCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of sessions) {
      if (s.is_holiday || isAcademicEvent(s)) continue;
      const start = new Date(s.start_at);
      if (start < monthStart || start >= monthEnd) continue;
      const k = sessionKey(s);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    for (const d of deadlines) {
      const start = new Date(d.due_at);
      if (start < monthStart || start >= monthEnd) continue;
      const k = subjectCanonicalKey(d.subject);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return counts;
  }, [sessions, deadlines, monthStart, monthEnd]);

  const grouped = useMemo(() => {
    const map = new Map<string, { sessions: ClassSession[]; events: Deadline[] }>();
    const bucket = (k: string) => {
      const cur = map.get(k) ?? { sessions: [], events: [] };
      map.set(k, cur);
      return cur;
    };

    const hasSubj = Boolean(selectedSubject);
    const showClasses = viewFilter === "all" || viewFilter === "classes" || viewFilter === "holidays";
    const showEvents = viewFilter === "all" || viewFilter === "events";

    if (showClasses) {
      for (const s of sessions) {
        if (s.notes === "academic-calendar") continue;
        if (viewFilter === "holidays" && !s.is_holiday) continue;
        if (viewFilter === "classes" && s.is_holiday) continue;
        const start = new Date(s.start_at);
        if (start < monthStart || start >= monthEnd) continue;
        if (hasSubj && sessionKey(s) !== selectedSubject) continue;
        bucket(start.toDateString()).sessions.push(s);
      }
    }

    if (showEvents) {
      for (const d of deadlines) {
        const start = new Date(d.due_at);
        if (start < monthStart || start >= monthEnd) continue;
        if (hasSubj && subjectCanonicalKey(d.subject) !== selectedSubject) continue;
        bucket(start.toDateString()).events.push(d);
      }
    }

    for (const v of map.values()) {
      v.sessions.sort((a, b) => a.start_at.localeCompare(b.start_at));
      v.events.sort((a, b) => a.due_at.localeCompare(b.due_at));
    }

    return [...map.entries()]
      .filter(([_, v]) => v.sessions.length > 0 || v.events.length > 0)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime());
  }, [sessions, deadlines, monthStart, monthEnd, selectedSubject, viewFilter]);

  return (
    <section className="mt-4">
      {/* Month Navigation & Action Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          aria-label="Previous month"
          onClick={() => {
            setMonthStart((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
            setDayFocus(null);
          }}
          className="rounded-lg bg-surface2 px-3 py-1.5 font-mono text-[11px] text-dim ring-1 ring-border transition-colors hover:text-ink"
        >
          <ChevronLeft className="size-3.5" />
        </button>
        <span className="min-w-[9.5rem] text-center font-display text-sm font-semibold tracking-tight">
          {monthFmt.format(monthStart)}
        </span>
        <button
          aria-label="Next month"
          onClick={() => {
            setMonthStart((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
            setDayFocus(null);
          }}
          className="rounded-lg bg-surface2 px-3 py-1.5 font-mono text-[11px] text-dim ring-1 ring-border transition-colors hover:text-ink"
        >
          <ChevronRight className="size-3.5" />
        </button>
        <button
          onClick={() => {
            setMonthStart(startOfMonth(new Date()));
            setDayFocus(null);
          }}
          className="rounded-lg bg-surface2 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-dim ring-1 ring-border transition-colors hover:text-ink"
        >
          Today
        </button>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {(isMember || canManage) && (
            <button
              onClick={() => setShowCustom((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg bg-surface2 px-2.5 py-1.5 font-mono text-[11px] text-dim ring-1 ring-border transition-colors hover:text-ink"
            >
              <Plus className="size-3.5" /> Custom class
            </button>
          )}
          {canManage && (
            <>
              <button
                onClick={() => setShowSettings((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg bg-surface2 px-2.5 py-1.5 font-mono text-[11px] text-dim ring-1 ring-border transition-colors hover:text-ink"
              >
                <Settings2 className="size-3.5" /> Calendar link
              </button>
              <button
                onClick={() => sync.mutate()}
                disabled={sync.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-cyan px-3 py-1.5 text-sm font-semibold text-ground transition-opacity disabled:opacity-60"
              >
                <RefreshCw className={`size-3.5 ${sync.isPending ? "animate-spin" : ""}`} /> Sync
              </button>
            </>
          )}
        </div>
      </div>

      {canManage && syncState && (
        <p className="mb-3 font-mono text-[10px] text-faint">
          {syncState.paused
            ? "Sync paused after repeated failures — fix the credentials and sync manually."
            : syncState.last_success_at
              ? `Last synced ${new Date(syncState.last_success_at).toLocaleString("en-GB")} · ${syncState.last_count ?? 0} sessions`
              : "Never synced yet."}
          {syncState.last_error ? ` · ${syncState.last_error}` : ""}
        </p>
      )}

      <AnimatePresence initial={false}>
        {showSettings && canManage && (
          <IcsSettings
            current={batch?.ics_url ?? ""}
            onSave={async (icsUrl) => {
              await saveFeed({ data: { batchId: batchId!, icsUrl } });
              toast.success("Calendar link saved — syncing now");
              setShowSettings(false);
              sync.mutate();
            }}
          />
        )}
        {showCustom && (isMember || canManage) && (
          <CustomClassForm
            batchId={batchId!}
            canManage={canManage}
            userId={user?.id ?? null}
            onDone={() => {
              setShowCustom(false);
              queryClient.invalidateQueries({ queryKey: ["class-sessions", batchId] });
            }}
          />
        )}
      </AnimatePresence>

      {/* Subject Filter Bar - consistent order & colors */}
      {batchSubjects.length > 0 && (
        <div className="mb-5 rounded-xl bg-surface/80 p-3.5 ring-1 ring-border shadow-sm">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan flex items-center gap-1.5">
              <Filter className="size-3" /> Subject Filter
            </span>
            {selectedSubject && (
              <button
                onClick={() => setSelectedSubject(null)}
                className="font-mono text-[10px] text-dim hover:text-ink transition-colors"
              >
                Reset filter
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedSubject(null)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-[10px] ring-1 transition-all ${
                selectedSubject === null
                  ? "bg-cyan/15 text-cyan ring-cyan/40 font-semibold"
                  : "bg-surface2 text-dim ring-border hover:text-ink"
              }`}
            >
              All Subjects
            </button>
            {batchSubjects.map((s) => {
              const isSelected = selectedSubject === s.key;
              const count = subjectCounts.get(s.key) ?? 0;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSelectedSubject(isSelected ? null : s.key)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-[10px] ring-1 transition-all ${
                    isSelected
                      ? "ring-1 font-semibold"
                      : "ring-border/60 text-dim hover:text-ink"
                  }`}
                  style={{
                    backgroundColor: isSelected ? `${s.color}20` : "transparent",
                    borderColor: isSelected ? s.color : undefined,
                    color: isSelected ? s.color : undefined,
                  }}
                  title={s.fullName}
                >
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                  <span>{s.label}</span>
                  {count > 0 && (
                    <span className="opacity-60 text-[9px]">({count})</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick view mode: All | Classes | Events | Holidays */}
          <div className="mt-3 pt-2.5 border-t border-border/40 flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[9px] uppercase tracking-wider text-faint mr-1">Show:</span>
            {(
              [
                { key: "all", label: "Everything" },
                { key: "classes", label: "Classes only" },
                { key: "events", label: "Assessments & Events" },
                { key: "holidays", label: "Holidays" },
              ] as const
            ).map((v) => (
              <button
                key={v.key}
                onClick={() => setViewFilter(v.key)}
                className={`rounded-md px-2.5 py-1 font-mono text-[10px] transition-colors ${
                  viewFilter === v.key
                    ? "bg-surface2 text-ink ring-1 ring-border font-medium"
                    : "text-faint hover:text-dim"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="mt-6 text-center font-mono text-xs text-faint">Loading timetable…</p>
      ) : grouped.length === 0 ? (
        <p className="mt-8 text-center font-mono text-xs text-faint">
          No entries found {selectedSubject ? "for this subject" : "this month"}. {canManage ? "Paste a calendar link and sync, or add a custom class." : ""}
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          <AnimatePresence initial={false}>
            {dayFocus && (
              <motion.button
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                onClick={() => setDayFocus(null)}
                className="self-start rounded-lg bg-surface2 px-3 py-1.5 font-mono text-[11px] text-cyan ring-1 ring-cyan/30 transition-colors hover:bg-surface2/80"
              >
                ← Back to the whole month
              </motion.button>
            )}
          </AnimatePresence>

          {grouped
            .filter(([day]) => !dayFocus || day === dayFocus)
            .map(([day, list]) => {
              const total = list.sessions.length + list.events.length;
              return (
              <motion.div
                key={day}
                layout
                className={
                  isDayOff(day)
                    ? "rounded-2xl bg-amber/8 p-3.5 ring-1 ring-amber/20"
                    : "rounded-2xl bg-surface/40 p-3.5 ring-1 ring-border/50"
                }
              >
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <button
                    onClick={() => setDayFocus((d) => (d === day ? null : day))}
                    className={`flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] transition-colors hover:text-ink ${
                      isDayOff(day) ? "text-amber" : "text-cyan"
                    }`}
                  >
                    <span className="font-semibold">{dayFmt.format(new Date(day))}</span>
                    {isDayOff(day) && (
                      <span className="rounded-md bg-amber/15 px-2 py-0.5 text-[10px] normal-case tracking-normal text-amber font-mono font-medium">
                        Sunday
                      </span>
                    )}
                    <span className="normal-case tracking-normal text-faint">
                      {dayFocus === day ? "· viewing day" : `· ${total} entr${total === 1 ? "y" : "ies"}`}
                    </span>
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {list.sessions.map((s) => {
                    const color = s.is_holiday ? HOLIDAY_COLOR : colorOf(s);
                    return (
                      <Fragment key={s.id}>
                      <motion.div
                        layout
                        whileHover={{ scale: 1.005, y: -1 }}
                        style={{ borderLeftColor: color ?? "transparent" }}
                        className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border-l-[3px] bg-surface px-3.5 py-3 ring-1 transition-shadow hover:shadow-lg hover:shadow-black/20 ${
                          s.is_holiday
                            ? "ring-evt-present/30 bg-evt-present/5"
                            : "ring-border"
                        }`}
                      >
                        <Marker
                          shape={s.is_holiday ? "bar" : "circle"}
                          color={color ?? FALLBACK_COURSE_COLOR}
                          size={9}
                        />
                        <span className="font-mono text-[11px] text-dim shrink-0">
                          {s.is_holiday
                            ? "All day"
                            : `${timeFmt.format(new Date(s.start_at))} – ${timeFmt.format(new Date(s.end_at))}`}
                        </span>
                        <span className="min-w-0 flex-1 basis-full sm:basis-auto">
                          <span className="block truncate font-display text-sm font-semibold">
                            {sessionFullName(s)}
                          </span>
                          <SessionMeta session={s} />
                        </span>
                        {s.course_code && (
                          <span
                            className="shrink-0 rounded-md px-2 py-0.5 font-mono text-[10px] font-medium"
                            style={{
                              color: color ?? undefined,
                              backgroundColor: color ? `${color}18` : undefined,
                              border: color ? `1px solid ${color}35` : undefined,
                            }}
                          >
                            {s.course_code}
                          </span>
                        )}
                        {canManage && (
                          <motion.button
                            whileTap={{ scale: 0.94 }}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSession(s);
                            }}
                            title="Edit class"
                            className="flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 font-mono text-[10px] font-semibold text-amber ring-1 ring-amber/30 transition-colors hover:bg-amber/15 hover:ring-amber/50"
                          >
                            <Pencil className="size-3" />
                            <span>Edit</span>
                          </motion.button>
                        )}
                        {isTeachingClass(s) && isMember && user && (
                          <motion.button
                            whileTap={{ scale: 0.94 }}
                            onClick={() =>
                              markAbsent.mutate({
                                session: s,
                                clear: absentIds.has(s.id),
                              })
                            }
                            title={
                              absentIds.has(s.id) ? "Tap to clear absence" : "Mark yourself absent"
                            }
                            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-[10px] ring-1 transition-colors ${
                              absentIds.has(s.id)
                                ? "bg-evt-exam/20 text-evt-exam ring-evt-exam/40"
                                : "text-dim ring-border hover:text-ink"
                            }`}
                          >
                            <CircleSlash className="size-3" />
                            {absentIds.has(s.id) ? "Absent" : "Mark absent"}
                          </motion.button>
                        )}
                      </motion.div>
                      </Fragment>
                    );
                  })}

                  {list.events.map((d) => {
                    const meta = eventMeta(d.type);
                    return (
                      <motion.div
                        key={d.id}
                        layout
                        whileHover={{ scale: 1.005, y: -1 }}
                        className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-surface px-3.5 py-2.5 ring-1 ${meta.ring}`}
                      >
                        <Marker shape={shapeForDeadline(d.type)} color="currentColor" size={9} />
                        <span className="font-mono text-[11px] text-dim shrink-0">
                          {formatDeadlineWhen(d)}
                        </span>
                        <span className="min-w-0 flex-1 basis-full truncate font-display text-sm font-semibold sm:basis-auto">
                          {displayTitle(d.subject, d.title)}
                        </span>
                        {d.subject && (
                          <span
                            className="shrink-0 rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold"
                            style={{
                              color: autoColor(d.subject),
                              backgroundColor: `${autoColor(d.subject)}18`,
                              border: `1px solid ${autoColor(d.subject)}40`,
                            }}
                          >
                            {d.subject}
                          </span>
                        )}
                        <span className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${meta.chip}`}>
                          {meta.label}
                        </span>
                        {canManage && (
                          <motion.button
                            whileTap={{ scale: 0.94 }}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingDeadline(d);
                              setDeadlineDialogOpen(true);
                            }}
                            title="Edit event"
                            className="flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 font-mono text-[10px] font-semibold text-amber ring-1 ring-amber/30 transition-colors hover:bg-amber/15 hover:ring-amber/50"
                          >
                            <Pencil className="size-3" />
                            <span>Edit</span>
                          </motion.button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
              );
            })}

        </div>
      )}

      {canManage && (
        <>
          <SessionEditDialog
            session={editingSession}
            batchId={batchId}
            onClose={() => setEditingSession(null)}
          />
          <DeadlineDialog
            open={deadlineDialogOpen}
            onOpenChange={(open) => {
              setDeadlineDialogOpen(open);
              if (!open) setEditingDeadline(null);
            }}
            deadline={editingDeadline}
          />
        </>
      )}
    </section>
  );
}

function IcsSettings({
  onSave,
  current,
}: {
  onSave: (icsUrl: string) => Promise<void>;
  current: string;
}) {
  const [url, setUrl] = useState(current);
  const [busy, setBusy] = useState(false);

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await onSave(url.trim());
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not save");
        } finally {
          setBusy(false);
        }
      }}
      className="mb-5 overflow-hidden rounded-xl bg-surface p-4 ring-1 ring-border"
    >
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">
        Timetable calendar link (.ics)
      </p>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.github.io/tt-sync/timetable.ics"
        required
        type="url"
        className="w-full rounded-lg bg-surface2 px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-cyan/40"
      />
      <p className="mt-2 font-mono text-[10px] text-faint">
        Any public .ics feed works — classes, faculty, rooms and holidays are imported automatically
        and each course gets its own colour.
      </p>
      <button
        type="submit"
        disabled={busy}
        className="mt-3 rounded-lg bg-cyan px-3 py-1.5 text-sm font-semibold text-ground disabled:opacity-60"
      >
        Save & sync
      </button>
    </motion.form>
  );
}

function CustomClassForm({
  batchId,
  canManage,
  userId,
  onDone,
}: {
  batchId: string;
  canManage: boolean;
  userId: string | null;
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [room, setRoom] = useState("");
  const [scope, setScope] = useState<"batch" | "private">(canManage ? "batch" : "private");
  const [busy, setBusy] = useState(false);

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const { error } = await supabase.from("class_sessions").insert({
          batch_id: batchId,
          source: "custom",
          title,
          start_at: new Date(start).toISOString(),
          end_at: new Date(end).toISOString(),
          classroom: room || null,
          visibility: canManage ? scope : "private",
          created_by: userId,
        });
        setBusy(false);
        if (error) toast.error(error.message);
        else {
          toast.success(
            (canManage ? scope : "private") === "batch"
              ? "Class added for the whole batch"
              : "Class added — only you can see it",
          );
          onDone();
        }
      }}
      className="mb-5 overflow-hidden rounded-xl bg-surface p-4 ring-1 ring-border"
    >
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">
        Add a class the calendar feed does not have
      </p>
      {canManage ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {(
            [
              { key: "batch", label: "Everyone in this batch" },
              { key: "private", label: "Only me" },
            ] as const
          ).map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setScope(o.key)}
              className={`rounded-lg px-3 py-1.5 font-mono text-[11px] outline-none transition-colors focus:outline-none ${
                scope === o.key
                  ? "bg-cyan/15 text-cyan ring-1 ring-cyan/40"
                  : "bg-surface2 text-dim ring-1 ring-border hover:text-ink"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="mb-3 font-mono text-[10px] text-faint">
          Personal class — only you will see it.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          required
          className="rounded-lg bg-surface2 px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-cyan/40"
        />
        <input
          type="datetime-local"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          required
          className="rounded-lg bg-surface2 px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-cyan/40"
        />
        <input
          type="datetime-local"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          required
          className="rounded-lg bg-surface2 px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-cyan/40"
        />
        <input
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          placeholder="Room (optional)"
          className="rounded-lg bg-surface2 px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-cyan/40"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="mt-3 rounded-lg bg-cyan px-3 py-1.5 text-sm font-semibold text-ground disabled:opacity-60"
      >
        Add class
      </button>
    </motion.form>
  );
}
