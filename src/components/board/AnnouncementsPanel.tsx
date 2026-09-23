import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Megaphone, Pin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { db as supabase } from "@/lib/backend";
import { useAuth } from "@/hooks/use-auth";
import { useBatch } from "@/hooks/use-batch";
import { announcementsQuery, timeAgo, type Announcement } from "@/lib/announcements";

export function AnnouncementsPanel({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const { batchId, canManage } = useBatch();
  const queryClient = useQueryClient();
  const { data: items = [], isLoading } = useQuery(announcementsQuery(batchId));
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);

  const create = useMutation({
    mutationFn: async () => {
      if (!batchId) throw new Error("Select a batch first");
      const { error } = await supabase.from("announcements").insert({
        batch_id: batchId,
        title: title.trim(),
        body: body.trim(),
        pinned,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements", batchId] });
      setTitle("");
      setBody("");
      setPinned(false);
      setOpen(false);
      toast.success("Announcement posted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (a: Announcement) => {
      const { error } = await supabase.from("announcements").delete().eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements", batchId] });
      toast.success("Announcement removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = compact ? items.slice(0, 3) : items;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-amber">
          <Megaphone className="size-4" />
          <p className="font-sans text-xs font-bold uppercase tracking-wider text-dim">
            {compact ? "Recent Announcements" : "Batch Announcements"}
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl border border-amber/30 bg-amber/10 px-3 py-1.5 font-sans text-xs font-semibold text-amber hover:bg-amber/20 transition-colors cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>{open ? "Cancel" : "New Post"}</span>
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && canManage && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
            onSubmit={(e) => {
              e.preventDefault();
              if (!title.trim()) {
                toast.error("Please enter a title");
                return;
              }
              create.mutate();
            }}
          >
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-sm">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Announcement Title"
                className="rounded-xl border border-border bg-surface2 px-3.5 py-2.5 font-sans text-sm font-semibold text-ink outline-none placeholder:text-faint focus:border-amber/70 focus:ring-2 focus:ring-amber/20 transition-all"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                placeholder="Details of the announcement..."
                className="resize-none rounded-xl border border-border bg-surface2 px-3.5 py-2.5 font-sans text-sm text-ink outline-none placeholder:text-faint focus:border-amber/70 focus:ring-2 focus:ring-amber/20 transition-all"
              />
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 font-sans text-xs font-semibold text-dim cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pinned}
                    onChange={(e) => setPinned(e.target.checked)}
                    className="rounded border-border"
                  />
                  Pin to top
                </label>
                <button
                  type="submit"
                  disabled={create.isPending}
                  className="rounded-xl bg-amber px-4 py-2 font-sans text-xs font-bold text-stone-900 shadow-sm hover:brightness-105 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {create.isPending ? "Posting…" : "Publish Announcement"}
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="h-24 animate-pulse rounded-2xl bg-surface2/40" />
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/40 p-6 text-center">
          <p className="font-sans text-xs sm:text-sm text-faint">
            No announcements posted yet.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {list.map((a, i) => (
              <motion.article
                key={a.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ delay: Math.min(i * 0.04, 0.24) }}
                className={`rounded-2xl border p-4 sm:p-5 shadow-xs transition-all ${
                  a.pinned
                    ? "border-amber/40 bg-amber/5"
                    : "border-border/70 bg-surface hover:border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {a.pinned && (
                        <span className="flex items-center gap-1 rounded-md bg-amber/15 px-2 py-0.5 font-mono text-[10px] font-bold text-amber border border-amber/30">
                          <Pin className="size-2.5" /> Pinned
                        </span>
                      )}
                      <span className="font-mono text-[11px] text-faint">
                        {timeAgo(a.created_at)}
                      </span>
                    </div>

                    <h4 className="font-display text-base font-bold text-ink leading-snug">
                      {a.title}
                    </h4>

                    {a.body && (
                      <p className="mt-2 whitespace-pre-wrap font-sans text-xs sm:text-sm leading-relaxed text-dim">
                        {compact && a.body.length > 180 ? `${a.body.slice(0, 180)}…` : a.body}
                      </p>
                    )}
                  </div>

                  {canManage && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete "${a.title}"?`)) {
                          remove.mutate(a);
                        }
                      }}
                      className="rounded-lg p-1.5 text-dim hover:text-rose hover:bg-rose/10 transition-colors"
                      title="Delete announcement"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
