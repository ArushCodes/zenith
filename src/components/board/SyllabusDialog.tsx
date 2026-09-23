import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Calendar,
  Check,
  Clock,
  ExternalLink,
  GraduationCap,
  MapPin,
  Pencil,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { db as supabase } from "@/lib/backend";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  cleanExamTitle,
  displayTitle,
  eventMeta,
  formatDeadlineWhen,
  timeLeft,
  type Deadline,
} from "@/lib/deadlines";
import { autoColor } from "@/lib/courses";

type Props = {
  deadline: Deadline | null;
  isOpen: boolean;
  onClose: () => void;
  canManage: boolean;
};

export function SyllabusDialog({ deadline, isOpen, onClose, canManage }: Props) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (deadline) {
      setNotes(deadline.notes ?? "");
      setIsEditing(false);
    }
  }, [deadline, isOpen]);

  const saveMutation = useMutation({
    mutationFn: async (updatedNotes: string) => {
      if (!deadline) return;
      const { error } = await supabase
        .from("deadlines")
        .update({ notes: updatedNotes.trim() || null })
        .eq("id", deadline.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deadlines"] });
      queryClient.invalidateQueries({ queryKey: ["batch-deadlines"] });
      toast.success("Syllabus & scope saved successfully");
      setIsEditing(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save syllabus");
    },
  });

  if (!deadline) return null;

  const m = eventMeta(deadline.type);
  const title =
    deadline.type === "midterm" || deadline.type === "endterm"
      ? cleanExamTitle(deadline.title, deadline.subject)
      : displayTitle(deadline.subject, deadline.title);

  const color = autoColor(deadline.subject || deadline.title);

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl rounded-3xl border border-border/80 bg-surface p-0 shadow-2xl overflow-hidden sm:max-w-2xl">
        {/* Header Color Accent Stripe */}
        <div
          className="h-2 w-full"
          style={{ backgroundColor: color }}
        />

        <div className="p-6 sm:p-8 space-y-6">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded-lg px-2.5 py-1 font-mono text-xs font-bold"
                  style={{
                    color,
                    backgroundColor: `${color}18`,
                    border: `1px solid ${color}35`,
                  }}
                >
                  {deadline.subject_code || deadline.subject || "Academic Event"}
                </span>
                <span className={`rounded-md px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide ${m.chip}`}>
                  {m.label}
                </span>
                {deadline.is_major && (
                  <span className="rounded-md bg-evt-exam/15 px-2.5 py-1 font-mono text-[11px] font-bold text-evt-exam border border-evt-exam/30">
                    Major Exam
                  </span>
                )}
              </div>

              {canManage && (
                <button
                  type="button"
                  onClick={() => setIsEditing((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface2 px-3 py-1.5 text-xs font-medium text-ink hover:border-cyan/40 hover:text-cyan transition-all"
                >
                  <Pencil className="size-3.5" />
                  {isEditing ? "Cancel Edit" : "Edit Syllabus"}
                </button>
              )}
            </div>

            <DialogTitle className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink">
              {title}
            </DialogTitle>

            {/* Quick Context Strip */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-dim pt-1 border-b border-border/60 pb-4">
              <span className="inline-flex items-center gap-1.5 font-medium text-ink">
                <Calendar className="size-4 text-cyan" />
                {formatDeadlineWhen(deadline)}
              </span>
              {deadline.location && (
                <span className="inline-flex items-center gap-1.5 text-ink">
                  <MapPin className="size-4 text-rose" />
                  {deadline.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-dim">
                <Clock className="size-4 text-amber" />
                Due {timeLeft(deadline.due_at, Date.now())}
              </span>
            </div>
          </DialogHeader>

          {/* Syllabus Content Area */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-sm font-bold uppercase tracking-wider text-ink flex items-center gap-2">
                <BookOpen className="size-4 text-cyan" />
                <span>Syllabus, Topics & Exam Scope</span>
              </h4>
            </div>

            {isEditing ? (
              <div className="space-y-4 rounded-2xl border border-border bg-surface2/50 p-4 sm:p-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-ink">
                    Course Syllabus / Chapters / Assessment Guidelines:
                  </label>
                  <textarea
                    rows={7}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter exam syllabus, modules covered, open/closed book rules, formula sheet allowance, or study links..."
                    className="w-full rounded-xl border border-border bg-surface p-3.5 font-sans text-sm leading-relaxed text-ink placeholder:text-faint focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
                  />
                  <p className="text-[11px] text-faint">
                    Pro-tip: Include module numbers, specific chapters, whether calculators are allowed, and format (MCQ, case study, descriptive).
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="rounded-xl border border-border px-4 py-2 text-xs font-medium text-dim hover:text-ink transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => saveMutation.mutate(notes)}
                    disabled={saveMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan px-4 py-2 text-xs font-semibold text-white shadow-md shadow-cyan/20 hover:bg-cyan/90 transition-all disabled:opacity-50"
                  >
                    <Save className="size-3.5" />
                    {saveMutation.isPending ? "Saving..." : "Save Syllabus"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-border/80 bg-surface2/40 p-5 sm:p-6 space-y-4">
                {notes.trim() ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="font-sans text-sm sm:text-base leading-relaxed text-ink whitespace-pre-wrap">
                      {notes}
                    </p>
                  </div>
                ) : (
                  <div className="py-8 text-center space-y-3">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-surface2 text-dim border border-border">
                      <BookOpen className="size-6 text-faint" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-display text-sm font-semibold text-ink">
                        Syllabus not yet published
                      </p>
                      <p className="text-xs text-dim max-w-sm mx-auto">
                        Your Course Representative (CR) or Faculty has not posted the syllabus for this exam yet.
                      </p>
                    </div>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="mt-2 inline-flex items-center gap-2 rounded-xl bg-cyan/15 border border-cyan/30 px-3.5 py-1.5 text-xs font-semibold text-cyan hover:bg-cyan/25 transition-all"
                      >
                        <Pencil className="size-3.5" />
                        Enter Syllabus Now
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submission Portal link if present */}
          {deadline.submission_link && (
            <div className="pt-2">
              <a
                href={deadline.submission_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan px-4 py-3 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-cyan/15 hover:bg-cyan/90 transition-all"
              >
                <ExternalLink className="size-4" />
                Open Official Portal / Submission Link
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}