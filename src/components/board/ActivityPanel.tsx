import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Bell, CalendarPlus, ChevronDown, ChevronUp, Megaphone, UserPlus } from "lucide-react";
import { useBatch } from "@/hooks/use-batch";
import { batchMembersQuery } from "@/lib/batches";
import { announcementsQuery } from "@/lib/announcements";
import { deadlinesQueryFor, displayTitle } from "@/lib/deadlines";

const fullDateTime = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function formatRelativeTime(at: number): string {
  const diffSec = Math.floor((Date.now() - at) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(at));
}

type Item = {
  id: string;
  at: number;
  kind: "member" | "announcement" | "deadline";
  title: string;
  sub: string;
};

/** Batch notification stream: who joined, what got posted, what got scheduled. */
export function ActivityPanel({ compact = false }: { compact?: boolean }) {
  const { batchId, batch, isMember } = useBatch();
  const { data: members = [] } = useQuery(batchMembersQuery(batchId, isMember));
  const { data: announcements = [] } = useQuery(announcementsQuery(batchId));
  const { data: deadlines = [] } = useQuery(deadlinesQueryFor(batchId));
  const [isExpanded, setIsExpanded] = useState(false);

  const where = batch ? `${batch.programme_name} · ${batch.name}` : "this batch";

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];

    for (const m of members) {
      const who = m.profiles?.full_name ?? m.profiles?.email ?? "Someone";
      out.push({
        id: `m-${m.id}`,
        at: new Date(m.created_at).getTime(),
        kind: "member",
        title: `${who} joined batch`,
        sub: m.role === "student" ? "Student" : m.role === "mod" ? "Course Rep" : "Admin",
      });
    }

    for (const a of announcements) {
      out.push({
        id: `a-${a.id}`,
        at: new Date(a.created_at).getTime(),
        kind: "announcement",
        title: a.title,
        sub: "Batch Announcement",
      });
    }

    for (const d of deadlines) {
      out.push({
        id: `d-${d.id}`,
        at: new Date(d.created_at).getTime(),
        kind: "deadline",
        title: displayTitle(d.subject, d.title),
        sub: d.subject || "Event Scheduled",
      });
    }

    return out.sort((a, b) => b.at - a.at);
  }, [members, announcements, deadlines, where]);

  if (!isMember) return null;

  const displayLimit = compact ? (isExpanded ? 15 : 4) : 50;
  const visibleItems = items.slice(0, displayLimit);

  return (
    <section className="rounded-2xl border border-border/80 bg-surface p-4 sm:p-5 shadow-xs backdrop-blur-sm space-y-4">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-xl bg-cyan/12 text-cyan border border-cyan/25">
            <Activity className="size-4" />
          </span>
          <div>
            <h3 className="font-display text-sm font-bold text-ink">
              Recent Activity
            </h3>
          </div>
        </div>
        <span className="rounded-full bg-surface2 px-2 py-0.5 font-mono text-[10px] font-semibold text-dim border border-border">
          {items.length}
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        <AnimatePresence initial={false}>
          {visibleItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface2/30 p-6 text-center">
              <p className="font-sans text-xs text-dim">No recent batch activity recorded.</p>
            </div>
          ) : (
            visibleItems.map((it, i) => (
              <motion.article
                key={it.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.2) }}
                className="flex items-start gap-3 rounded-xl border border-border/80 bg-surface2/30 p-3 hover:border-cyan/40 hover:bg-surface2/60 transition-all"
              >
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg mt-0.5 border ${
                    it.kind === "member"
                      ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                      : it.kind === "announcement"
                        ? "bg-amber/15 text-amber border-amber/30"
                        : "bg-cyan/15 text-cyan border-cyan/30"
                  }`}
                >
                  {it.kind === "member" ? (
                    <UserPlus className="size-3.5" />
                  ) : it.kind === "announcement" ? (
                    <Megaphone className="size-3.5" />
                  ) : (
                    <CalendarPlus className="size-3.5" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-display text-xs sm:text-sm font-bold text-ink line-clamp-1">
                      {it.title}
                    </p>
                    <span
                      title={fullDateTime.format(new Date(it.at))}
                      className="shrink-0 font-sans text-[10px] font-medium text-dim bg-surface border border-border/70 px-1.5 py-0.5 rounded-md"
                    >
                      {formatRelativeTime(it.at)}
                    </span>
                  </div>
                  <p className="font-sans text-[11px] text-dim line-clamp-1 mt-0.5">
                    {it.sub}
                  </p>
                </div>
              </motion.article>
            ))
          )}
        </AnimatePresence>
      </div>

      {compact && items.length > 4 && (
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-surface2/50 py-2 text-xs font-semibold text-dim hover:text-ink hover:border-cyan/40 transition-colors"
        >
          <span>{isExpanded ? "Show fewer" : `Show ${items.length - 4} more activities`}</span>
          {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>
      )}
    </section>
  );
}