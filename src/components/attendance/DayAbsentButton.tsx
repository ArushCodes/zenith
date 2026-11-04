import { useMemo } from "react";
import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useBatch } from "@/hooks/use-batch";
import { db } from "@/lib/backend";
import {
  attendanceQuery,
  sessionsQuery,
  type AttendanceMark,
  type ClassSession,
} from "@/lib/batches";
import { resolveMarks } from "@/lib/attendance";
import { dayTeachingSessions, selfAttendanceTargets } from "@/lib/day-attendance";
import { sessionFullName } from "@/lib/courses";
import { Check, ChevronDown, ClipboardCheck, Lock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const classTime = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "numeric",
  minute: "2-digit",
});

function useSelfAttendance() {
  const { user } = useAuth();
  const { batchId, isMember, canManage } = useBatch();
  const client = useQueryClient();
  const classes = useQuery(sessionsQuery(batchId));
  const records = useQuery(attendanceQuery(batchId, isMember || canManage, user?.id, canManage));
  const resolved = useMemo(
    () => resolveMarks(records.data ?? [], user?.id),
    [records.data, user?.id],
  );
  const mutationKey = ["self-attendance", batchId, user?.id];
  const busy = useIsMutating({ mutationKey }) > 0;
  const mutation = useMutation({
    mutationKey,
    mutationFn: async ({ sessions, absent }: { sessions: ClassSession[]; absent: boolean }) => {
      if (!user || !batchId || !(isMember || canManage))
        throw new Error("Sign in to mark attendance.");
      const candidates = sessions.filter((s) => s.batch_id === batchId && !s.is_cancelled);
      if (!candidates.length) return { count: 0, absent };
      // Recheck representative records immediately before the single atomic upsert.
      const { data, error } = await db
        .from("attendance_marks")
        .select("*")
        .eq("batch_id", batchId)
        .eq("user_id", user.id)
        .in(
          "session_id",
          candidates.map((s) => s.id),
        );
      if (error) throw error;
      const fresh = (data ?? []) as AttendanceMark[];
      const targets = selfAttendanceTargets(candidates, fresh, user.id, absent);
      if (!targets.length) return { count: 0, absent };
      const result = await db.from("attendance_marks").upsert(
        targets.map((s) => ({
          session_id: s.id,
          batch_id: batchId,
          user_id: user.id,
          marked_by: user.id,
          status: absent ? ("absent" as const) : ("present" as const),
          mark_source: "self" as const,
        })),
        { onConflict: "session_id,user_id,mark_source" },
      );
      if (result.error) throw result.error;
      return {
        count: targets.length,
        absent,
        locked: [...resolveMarks(fresh, user.id).values()].some(
          (mark) => mark.mark_source === "rep",
        ),
      };
    },
    onSuccess: ({ count, absent, locked = false }) => {
      void client.invalidateQueries({ queryKey: ["attendance", batchId] });
      void client.invalidateQueries({ queryKey: ["batch-attendance"] });
      toast.success(
        count
          ? `Marked ${count} ${count === 1 ? "class" : "classes"} ${absent ? "absent" : "present"}.${locked ? " Representative records kept." : ""}`
          : "Attendance is already recorded. Representative records were kept.",
      );
    },
    onError: (error: Error) =>
      toast.error(error.message || "Attendance could not be saved. Please retry."),
  });
  return {
    user,
    batchId,
    allowed: isMember || canManage,
    classes: classes.data ?? [],
    resolved,
    disabled: busy || classes.isPending || classes.isError || records.isPending || records.isError,
    save: mutation.mutate,
  };
}

export function DayAbsentButton({
  day,
  compact = false,
  disabled = false,
}: {
  day: string;
  compact?: boolean;
  disabled?: boolean;
}) {
  const attendance = useSelfAttendance();
  if (!attendance.user || !attendance.batchId || !attendance.allowed) return null;
  const sessions = dayTeachingSessions(attendance.classes, attendance.batchId, day);
  if (!sessions.length) return null;
  const editable = sessions.filter((s) => attendance.resolved.get(s.id)?.mark_source !== "rep");
  const remaining = editable.filter((s) => attendance.resolved.get(s.id)?.status !== "absent");
  const locked = sessions.length - editable.length;
  const dayLabel = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
  }).format(new Date(`${day}T12:00:00+05:30`));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Attendance for ${dayLabel}`}
          title={`Attendance for ${dayLabel}`}
          onKeyDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className={`inline-flex shrink-0 items-center justify-center gap-1 rounded-lg font-medium text-dim transition-colors hover:bg-surface2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan ${compact ? "mt-1 min-h-9 max-w-full px-1 text-[11px]" : "min-h-10 px-2.5 text-xs"}`}
        >
          {compact && <ClipboardCheck className="size-4 sm:hidden" aria-hidden="true" />}
          <span className={compact ? "hidden sm:inline" : undefined}>Attendance</span>
          <ChevronDown
            className={compact ? "hidden size-3 shrink-0 sm:block" : "size-3 shrink-0"}
            aria-hidden="true"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="max-h-[min(28rem,70dvh)] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border-border bg-surface p-1.5 text-ink"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <DropdownMenuLabel className="px-2 py-2 text-xs font-medium text-dim">
          {dayLabel} · {sessions.length} {sessions.length === 1 ? "class" : "classes"}
        </DropdownMenuLabel>
        {sessions.map((session) => {
          const mark = attendance.resolved.get(session.id);
          const absent = mark?.status === "absent";
          const representative = mark?.mark_source === "rep";
          return (
            <DropdownMenuItem
              key={session.id}
              disabled={disabled || attendance.disabled || representative}
              aria-label={`${absent ? "Mark present" : "Mark absent"}: ${sessionFullName(session)}, ${classTime.format(new Date(session.start_at))}`}
              onSelect={() => attendance.save({ sessions: [session], absent: !absent })}
              className="min-h-12 cursor-pointer justify-between gap-3 rounded-lg px-2 py-2 focus:bg-surface2 focus:text-ink"
            >
              <span className="min-w-0">
                <span className="block text-xs leading-relaxed">{sessionFullName(session)}</span>
                <span className="block text-[11px] text-dim">
                  {classTime.format(new Date(session.start_at))}
                </span>
              </span>
              <span
                className={`flex shrink-0 items-center gap-1 text-xs ${absent ? "text-rose" : "text-dim"}`}
              >
                {representative && <Lock className="size-3" aria-label="Representative record" />}
                {absent ? "Absent" : "Present"}
              </span>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator className="my-1 bg-border" />
        <DropdownMenuItem
          disabled={disabled || attendance.disabled || !remaining.length}
          aria-label={`Mark entire day absent: ${day}`}
          onSelect={() => attendance.save({ sessions, absent: true })}
          className="min-h-11 cursor-pointer rounded-lg px-2 text-xs focus:bg-surface2 focus:text-ink"
        >
          {!remaining.length && <Check className="size-3.5" aria-hidden="true" />}
          {remaining.length
            ? "Mark entire day absent"
            : locked
              ? "Personal absences saved"
              : "Entire day marked absent"}
        </DropdownMenuItem>
        {locked > 0 && (
          <p className="px-2 py-1.5 text-[11px] text-dim">Representative records are locked.</p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
