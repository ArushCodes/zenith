import { db as supabase } from "@/lib/backend";

export type TelemetryAction =
  | "login"
  | "board_view"
  | "checklist_toggle"
  | "attendance_mark"
  | "bunk_simulation"
  | "gpa_simulation"
  | "calendar_export"
  | "role_change";

export interface ActivityLogItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRoll?: string | undefined;
  batchId?: string | undefined;
  action: TelemetryAction;
  title: string;
  details?: Record<string, any> | undefined;
  createdAt: string;
}

const LOCAL_STORAGE_KEY = "zenith.telemetry_stream";
const MAX_LOCAL_ITEMS = 50;

/** Save to local ring buffer for immediate client-side admin display */
function recordLocalActivity(item: ActivityLogItem) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    const list: ActivityLogItem[] = raw ? JSON.parse(raw) : [];
    const updated = [item, ...list.filter((x) => x.id !== item.id)].slice(0, MAX_LOCAL_ITEMS);
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("zenith:telemetry_updated", { detail: item }));
  } catch (err) {
    // Non-fatal
  }
}

export function getLocalActivityStream(): ActivityLogItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Record user telemetry with graceful fallback to Supabase table or local bus */
export async function trackActivity({
  action,
  title,
  details,
  batchId,
}: {
  action: TelemetryAction;
  title: string;
  details?: Record<string, any>;
  batchId?: string;
}) {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return;

    const metadata = (user.user_metadata ?? {}) as Record<string, any>;
    const userName =
      metadata["full_name"] ?? metadata["name"] ?? user.email?.split("@")[0] ?? "Student";
    const userRoll = metadata["registration_no"] ?? "";

    const item: ActivityLogItem = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: user.id,
      userName,
      userEmail: user.email ?? "",
      userRoll,
      batchId,
      action,
      title,
      details,
      createdAt: new Date().toISOString(),
    };

    // 1. Always record in client bus
    recordLocalActivity(item);

    // 2. Persist to Supabase if activity log table is present
    void Promise.resolve(
      supabase.from("user_activity_logs" as any).insert({
        user_id: user.id,
        user_name: userName,
        user_email: user.email,
        user_roll: userRoll,
        batch_id: batchId,
        action,
        title,
        details: details ?? {},
        created_at: item.createdAt,
      } as any),
    ).catch(() => {
      // Table might not exist yet; safe to ignore
    });
  } catch {
    // Non-blocking telemetry
  }
}
