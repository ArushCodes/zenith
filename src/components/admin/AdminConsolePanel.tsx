import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Activity,
  Compass,
  ShieldCheck,
  Search,
  Filter,
  Download,
  UserCheck,
  UserX,
  ShieldAlert,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Flame,
  Radio,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Eye,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";
import { db as supabase } from "@/lib/backend";
import { useAuth } from "@/hooks/use-auth";
import { useBatch } from "@/hooks/use-batch";
import { directoryQuery, type DirectoryRow, type Membership } from "@/lib/batches";
import { IPM_BATCHES } from "@/lib/roster.data";
import { getLocalActivityStream, type ActivityLogItem } from "@/lib/telemetry";

type ConsoleTab = "members" | "activity" | "tracker";

const ROLE_LABEL: Record<string, string> = {
  student: "Student",
  mod: "Class Rep / Moderator",
  admin: "Administrator",
};

export function AdminConsolePanel() {
  const { user, isAdmin, isArush } = useAuth();
  const { batchId, batches } = useBatch();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<ConsoleTab>("members");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [localActivityLogs, setLocalActivityLogs] = useState<ActivityLogItem[]>([]);
  const [selectedLogDetail, setSelectedLogDetail] = useState<ActivityLogItem | null>(null);

  // 1. Fetch all members across batches
  const { data: members = [], isLoading: membersLoading, refetch: refetchMembers } = useQuery(
    directoryQuery(true)
  );

  // 2. Fetch server-persisted user activity logs
  const { data: serverLogs = [], refetch: refetchLogs } = useQuery({
    queryKey: ["admin-user-activity-logs"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("user_activity_logs" as any)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) return [];
        return (data || []).map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          userName: row.user_name || "Student",
          userEmail: row.user_email || "",
          userRoll: row.user_roll || "",
          batchId: row.batch_id,
          action: row.action,
          title: row.title,
          details: row.details,
          createdAt: row.created_at,
        })) as ActivityLogItem[];
      } catch {
        return [];
      }
    },
    refetchInterval: 15_000,
  });

  // Listen to local live telemetry events
  useEffect(() => {
    setLocalActivityLogs(getLocalActivityStream());
    function onUpdate(e: Event) {
      setLocalActivityLogs(getLocalActivityStream());
    }
    window.addEventListener("zenith:telemetry_updated", onUpdate);
    return () => window.removeEventListener("zenith:telemetry_updated", onUpdate);
  }, []);

  // Merge server & local logs
  const allUserLogs = useMemo(() => {
    const map = new Map<string, ActivityLogItem>();
    for (const l of localActivityLogs) map.set(l.id, l);
    for (const l of serverLogs) map.set(l.id, l);
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [localActivityLogs, serverLogs]);

  // Member role update mutation
  const updateRole = useMutation({
    mutationFn: async ({ membershipId, newRole }: { membershipId: string; newRole: string }) => {
      const { error } = await supabase
        .from("batch_memberships")
        .update({ role: newRole as any, decided_at: new Date().toISOString() })
        .eq("id", membershipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-directory"] });
      toast.success("Role updated successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return (members as DirectoryRow[]).filter((m) => {
      const name = (m.profiles?.full_name ?? "").toLowerCase();
      const email = (m.profiles?.email ?? "").toLowerCase();
      const reg = (m.profiles?.registration_no ?? "").toLowerCase();
      const query = searchQuery.toLowerCase().trim();

      const matchesSearch =
        !query || name.includes(query) || email.includes(query) || reg.includes(query);
      const matchesBatch =
        selectedBatchFilter === "all" || m.batch_id === selectedBatchFilter;
      const matchesRole = roleFilter === "all" || m.role === roleFilter;

      return matchesSearch && matchesBatch && matchesRole;
    });
  }, [members, searchQuery, selectedBatchFilter, roleFilter]);

  // Statistics counters
  const stats = useMemo(() => {
    const total = members.length;
    const ipm1Count = members.filter((m) => m.batch_id === IPM_BATCHES[0]?.id).length;
    const ipm2Count = members.filter((m) => m.batch_id === IPM_BATCHES[1]?.id).length;
    const ipm3Count = members.filter((m) => m.batch_id === IPM_BATCHES[2]?.id).length;
    const modsCount = members.filter((m) => m.role === "mod" || m.role === "admin").length;
    return { total, ipm1Count, ipm2Count, ipm3Count, modsCount };
  }, [members]);

  // Export directory to CSV
  function exportCSV() {
    if (filteredMembers.length === 0) {
      toast.error("No member data to export");
      return;
    }
    const headers = ["Full Name", "Roll No", "Email", "Batch", "Role", "Joined Date"];
    const rows = filteredMembers.map((m) => [
      `"${m.profiles?.full_name ?? "—"}"`,
      `"${m.profiles?.registration_no ?? "—"}"`,
      `"${m.profiles?.email ?? "—"}"`,
      `"${m.batches?.name ?? "—"}"`,
      `"${m.role}"`,
      `"${new Date(m.created_at).toLocaleDateString()}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `zenith_members_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Member roster exported to CSV");
  }

  return (
    <section className="space-y-5 rounded-2xl border border-border/80 bg-surface/90 p-4 sm:p-6 backdrop-blur-md shadow-sm">
      {/* ── Top Executive HUD ── */}
      <div className="flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 shadow-xs">
            <ShieldCheck className="size-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-ink">
                Admin Command Center
              </h2>
              <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Super Admin
              </span>
            </div>
            <p className="text-xs text-dim">
              Master student tracking, telemetry logs, and roster controls for Arush Vipul Gaur
            </p>
          </div>
        </div>

        {/* Live Counters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface2/60 px-3 py-1.5 shadow-2xs">
            <Users className="size-3.5 text-cyan" />
            <span className="font-mono text-xs font-bold text-ink">{stats.total}</span>
            <span className="text-[10px] text-dim">Students</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface2/60 px-3 py-1.5 shadow-2xs">
            <Radio className="size-3.5 text-emerald-500 animate-pulse" />
            <span className="font-mono text-xs font-bold text-ink">{allUserLogs.length}</span>
            <span className="text-[10px] text-dim">Actions Tracked</span>
          </div>
          <button
            onClick={() => {
              refetchMembers();
              refetchLogs();
              toast.success("Command center data refreshed");
            }}
            title="Refresh command center"
            className="rounded-xl border border-border bg-surface p-2 text-dim hover:text-ink hover:border-cyan/40 transition-colors"
          >
            <RefreshCw className="size-3.5" />
          </button>
        </div>
      </div>

      {/* ── Sub Navigation Tabs ── */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto border-b border-border/60 pb-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab("members")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "members"
                ? "bg-cyan text-white shadow-xs"
                : "border border-border bg-surface2/40 text-dim hover:text-ink hover:bg-surface2"
            }`}
          >
            <Users className="size-3.5" />
            <span>Members Roster ({filteredMembers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("activity")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "activity"
                ? "bg-cyan text-white shadow-xs"
                : "border border-border bg-surface2/40 text-dim hover:text-ink hover:bg-surface2"
            }`}
          >
            <Activity className="size-3.5" />
            <span>Signups & Batch Feed</span>
          </button>

          <button
            onClick={() => setActiveTab("tracker")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "tracker"
                ? "bg-emerald-600 text-white shadow-xs"
                : "border border-border bg-surface2/40 text-dim hover:text-ink hover:bg-surface2"
            }`}
          >
            <Compass className="size-3.5" />
            <span>Live Action Tracker</span>
            <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
          </button>
        </div>

        {activeTab === "members" && (
          <button
            onClick={exportCSV}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium text-dim hover:text-ink hover:border-cyan/40 transition-colors shadow-2xs"
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        )}
      </div>

      {/* ── Subtab 1: MEMBERS DIRECTORY ── */}
      {activeTab === "members" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student name, roll number, or learner email..."
                className="w-full rounded-xl border border-border bg-surface pl-9 pr-3 py-1.5 text-xs text-ink placeholder:text-faint focus:border-cyan focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedBatchFilter}
                onChange={(e) => setSelectedBatchFilter(e.target.value)}
                className="rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-dim focus:border-cyan focus:outline-hidden"
              >
                <option value="all">All Batches</option>
                {IPM_BATCHES.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} ({b.years})
                  </option>
                ))}
              </select>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-dim focus:border-cyan focus:outline-hidden"
              >
                <option value="all">All Roles</option>
                <option value="student">Students</option>
                <option value="mod">Class Reps / Mods</option>
                <option value="admin">Admins</option>
              </select>
            </div>
          </div>

          {/* Members Table */}
          <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
            <div className="hidden grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-3 border-b border-border bg-surface2/60 px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-dim sm:grid">
              <span>Student Profile</span>
              <span>Roll Number</span>
              <span>Batch</span>
              <span>Role / Permissions</span>
              <span className="text-right">Admin Actions</span>
            </div>

            {filteredMembers.length === 0 ? (
              <div className="p-8 text-center text-xs text-dim">
                No students found matching your filters.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {filteredMembers.map((m) => {
                  const name = m.profiles?.full_name ?? m.profiles?.email?.split("@")[0] ?? "Student";
                  const email = m.profiles?.email ?? "—";
                  const reg = m.profiles?.registration_no ?? "—";
                  const batchName = m.batches?.name ?? "General";
                  const isCurrentAdmin = m.role === "admin";
                  const isCurrentMod = m.role === "mod";

                  return (
                    <div
                      key={m.id}
                      className="grid grid-cols-1 gap-2.5 p-3.5 sm:grid-cols-[1.5fr_1fr_1fr_1fr_auto] sm:items-center sm:gap-3 sm:px-4 sm:py-3 hover:bg-surface2/30 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-cyan/12 font-display text-[11px] font-bold text-cyan">
                          {name
                            .split(" ")
                            .slice(0, 2)
                            .map((w: string) => w[0]?.toUpperCase())
                            .join("")}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-display text-xs font-bold text-ink">{name}</p>
                          <p className="truncate font-mono text-[10px] text-dim">{email}</p>
                        </div>
                      </div>

                      <div className="font-mono text-xs text-dim">
                        <span className="rounded-md bg-surface2 px-1.5 py-0.5 border border-border">
                          {reg}
                        </span>
                      </div>

                      <div className="text-xs text-ink font-medium">
                        <span className="rounded-md bg-cyan/10 px-2 py-0.5 text-cyan text-[11px]">
                          {batchName}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                            isCurrentAdmin
                              ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                              : isCurrentMod
                              ? "bg-amber/15 text-amber border border-amber/30"
                              : "bg-surface2 text-dim border border-border"
                          }`}
                        >
                          {ROLE_LABEL[m.role] ?? m.role}
                        </span>
                      </div>

                      <div className="flex items-center justify-end gap-1.5">
                        {!isCurrentMod && (
                          <button
                            onClick={() => updateRole.mutate({ membershipId: m.id, newRole: "mod" })}
                            title="Promote to Class Rep / Mod"
                            className="rounded-lg border border-border bg-surface px-2 py-1 text-[11px] font-medium text-dim hover:border-amber/50 hover:text-amber transition-colors"
                          >
                            Set Mod
                          </button>
                        )}
                        {isCurrentMod && (
                          <button
                            onClick={() =>
                              updateRole.mutate({ membershipId: m.id, newRole: "student" })
                            }
                            title="Demote to Student"
                            className="rounded-lg border border-border bg-surface px-2 py-1 text-[11px] font-medium text-dim hover:border-rose/50 hover:text-rose transition-colors"
                          >
                            Set Student
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Subtab 2: RECENT SIGNUPS & BATCH ACTIVITY ── */}
      {activeTab === "activity" && (
        <div className="space-y-3">
          <p className="text-xs text-dim">
            Chronological log of batch admissions, verification registrations, and timetable updates.
          </p>

          <div className="divide-y divide-border/60 rounded-xl border border-border bg-surface shadow-2xs">
            {members.slice(0, 30).map((m: DirectoryRow) => {
              const name = m.profiles?.full_name ?? m.profiles?.email ?? "Student";
              const roll = m.profiles?.registration_no ?? "";
              const date = new Date(m.created_at);
              const batchCode = m.batches?.name ?? "General";

              return (
                <div key={m.id} className="flex items-center justify-between p-3.5 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="grid size-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <UserCheck className="size-4" />
                    </span>
                    <div>
                      <p className="font-display font-semibold text-ink">
                        {name}{" "}
                        {roll && (
                          <span className="font-mono text-[11px] text-cyan">({roll})</span>
                        )}{" "}
                        registered
                      </p>
                      <p className="text-[11px] text-dim">
                        Batch: <span className="font-medium text-ink">{batchCode}</span> · Role:{" "}
                        <span className="capitalize">{m.role}</span>
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-faint">
                    {date.toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Subtab 3: USER ACTION TRACKER ("WHAT THEY DO") ── */}
      {activeTab === "tracker" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-bold text-ink">
                Live Student Action & Telemetry Stream
              </h3>
              <p className="text-xs text-dim">
                Real-time telemetry of what students are doing: task checklists, attendance marks, simulator usage, and visits.
              </p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
              Live Telemetry
            </span>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
            <div className="hidden grid-cols-[140px_1fr_120px_auto] gap-3 border-b border-border bg-surface2/60 px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-dim sm:grid">
              <span>Timestamp</span>
              <span>Student & Activity</span>
              <span>Category</span>
              <span className="text-right">Metadata</span>
            </div>

            {allUserLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-dim">
                No telemetry actions recorded yet. As students toggle tasks, simulate bunks, or mark attendance, activities will stream here live.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {allUserLogs.map((log) => {
                  const time = new Date(log.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  });
                  const date = new Date(log.createdAt).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                  });

                  return (
                    <div
                      key={log.id}
                      className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-[140px_1fr_120px_auto] sm:items-center sm:gap-3 sm:px-4 sm:py-2.5 hover:bg-surface2/30 transition-colors"
                    >
                      <div className="font-mono text-[11px] text-faint">
                        {date} · {time}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-ink">
                          <span className="text-cyan font-bold">{log.userName}</span>{" "}
                          {log.userRoll && (
                            <span className="font-mono text-[10px] text-dim">[{log.userRoll}]</span>
                          )}
                          : {log.title}
                        </p>
                        <p className="truncate font-mono text-[10px] text-dim">
                          {log.userEmail}
                        </p>
                      </div>

                      <div>
                        <span className="rounded-md bg-surface2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-dim border border-border">
                          {log.action.replace("_", " ")}
                        </span>
                      </div>

                      <div className="flex justify-end">
                        {log.details && Object.keys(log.details).length > 0 ? (
                          <button
                            onClick={() => setSelectedLogDetail(log)}
                            className="flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-0.5 text-[10px] font-mono text-dim hover:text-ink hover:border-cyan/40"
                          >
                            <Eye className="size-3" />
                            <span>Payload</span>
                          </button>
                        ) : (
                          <span className="font-mono text-[10px] text-faint">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* JSON Payload Viewer Modal */}
      {selectedLogDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <h4 className="font-display text-sm font-bold text-ink">Action Payload Metadata</h4>
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="text-xs text-dim hover:text-ink"
              >
                ✕ Close
              </button>
            </div>
            <div className="space-y-1 text-xs">
              <p>
                <strong className="text-ink">User:</strong> {selectedLogDetail.userName} (
                {selectedLogDetail.userRoll || "—"})
              </p>
              <p>
                <strong className="text-ink">Action:</strong> {selectedLogDetail.action}
              </p>
              <p>
                <strong className="text-ink">Event:</strong> {selectedLogDetail.title}
              </p>
            </div>
            <pre className="max-h-60 overflow-auto rounded-xl bg-surface2/80 p-3 font-mono text-[11px] text-ink border border-border">
              {JSON.stringify(selectedLogDetail.details, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </section>
  );
}
