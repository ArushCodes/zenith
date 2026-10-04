import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useBatch } from "@/hooks/use-batch";
import { timetableStatus, syncTimetableNow } from "@/lib/timetable.functions";

export function TimetableSyncStatus() {
  const { batchId, canManage, isMember } = useBatch();
  const getStatus = useServerFn(timetableStatus),
    sync = useServerFn(syncTimetableNow);
  const client = useQueryClient();
  const status = useQuery({
    queryKey: ["public-sync-status", batchId],
    enabled: !!batchId && (isMember || canManage),
    retry: false,
    refetchInterval: 60000,
    queryFn: () => getStatus({ data: { batchId: batchId! } }),
  });
  const retry = useMutation({
    mutationFn: () => sync({ data: { batchId: batchId! } }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error("Sync failed. Check the calendar feed.");
        return;
      }
      client.invalidateQueries({ queryKey: ["public-sync-status", batchId] });
      client.invalidateQueries({ queryKey: ["sessions", batchId] });
      toast.success("Timetable synced");
    },
    onError: () => toast.error("Sync unavailable"),
  });
  return (
    <div className="relative flex flex-wrap items-center gap-2 text-[10px] text-dim mt-2">
      <span>Timetable feed</span>
      <span>·</span>
      <span>
        {status.error
          ? "Status unavailable"
          : status.data?.paused
            ? "Sync paused"
            : status.data?.failed
              ? "Last sync failed"
              : status.data?.lastSuccess
                ? `Synced ${new Date(status.data.lastSuccess).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} IST`
                : status.isLoading
                  ? "Checking sync…"
                  : "Not synced"}
      </span>
      {canManage && (status.data?.failed || status.data?.paused) && (
        <button
          type="button"
          disabled={retry.isPending}
          onClick={() => retry.mutate()}
          className="text-cyan underline"
        >
          {retry.isPending ? "Syncing…" : "Retry"}
        </button>
      )}
    </div>
  );
}
