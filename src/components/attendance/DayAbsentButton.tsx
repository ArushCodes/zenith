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
  const done = editable.length > 0 && remaining.length === 0;
  return (
    <button
      type="button"
      disabled={disabled || attendance.disabled || !remaining.length}
      aria-label={`Mark entire day absent: ${day}`}
      title={`${remaining.length} classes to mark absent${locked ? `; ${locked} representative records kept` : ""}. Includes all subjects on this date.`}
      onKeyDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        attendance.save({ sessions, absent: true });
      }}
      className={`${compact ? "mt-1 w-full px-1 py-1 text-[9px]" : "min-h-9 px-3 py-1.5 text-xs"} rounded-lg border border-rose/30 bg-rose/10 font-medium text-rose transition-colors hover:bg-rose/20 disabled:cursor-default disabled:opacity-50`}
    >
      {done
        ? locked
          ? "Personal marks saved"
          : "Day marked absent"
        : compact
          ? "Day absent"
          : "Mark entire day absent"}
    </button>
  );
}

export function CalendarAttendanceButton({ session }: { session: ClassSession }) {
  const attendance = useSelfAttendance();
  if (!attendance.user || !attendance.allowed) return null;
  const mark = attendance.resolved.get(session.id),
    absent = mark?.status === "absent",
    locked = mark?.mark_source === "rep";
  return (
    <button
      type="button"
      aria-pressed={absent}
      aria-label={`${absent ? "Mark present" : "Mark absent"}: ${sessionFullName(session)}`}
      title={
        locked
          ? "Representative record takes priority"
          : absent
            ? "Marked absent. Click to mark present."
            : "Mark this class absent"
      }
      disabled={attendance.disabled || locked}
      onKeyDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        attendance.save({ sessions: [session], absent: !absent });
      }}
      className={`min-h-7 shrink-0 rounded-md px-1.5 py-1 text-[10px] font-medium ring-1 transition-colors disabled:opacity-50 ${absent ? "bg-rose/20 text-rose ring-rose/40" : "text-dim ring-border hover:bg-rose/10 hover:text-rose"}`}
    >
      {locked ? "Rep · " : ""}
      {absent ? "Absent ✓" : "Absent"}
    </button>
  );
}
