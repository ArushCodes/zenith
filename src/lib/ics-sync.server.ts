/** Timetable sync from a public .ics feed — server only. */

export const COURSE_PALETTE = [
  "#22D3EE",
  "#A78BFA",
  "#F59E0B",
  "#34D399",
  "#F472B6",
  "#60A5FA",
  "#FB923C",
  "#4ADE80",
  "#E879F9",
  "#38BDF8",
  "#FACC15",
  "#FCA5A5",
];

import { FeedError, fetchPublicFeed } from "./safe-url";

const MAX_FAILURES = 5;

/** Sync one batch from its ICS URL. Returns a short result string. */
export async function syncBatch(batchId: string, force = false): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: state } = await supabaseAdmin
    .from("batch_sync_state")
    .select("*")
    .eq("batch_id", batchId)
    .maybeSingle();

  const { data: acquired, error: leaseError } = await supabaseAdmin.rpc(
    "acquire_timetable_lease" as never,
    { target_batch: batchId, force_run: force } as never,
  );
  if (leaseError) throw new Error(leaseError.message);
  if (!acquired) return state?.paused ? "paused" : "locked";

  try {
    const { data: batch } = await supabaseAdmin
      .from("batches")
      .select("ics_url")
      .eq("id", batchId)
      .maybeSingle();
    const url = batch?.ics_url;
    if (!url) throw new FeedError("No calendar (.ics) link configured for this batch");

    const res = await fetchPublicFeed(url);
    if (!res.ok) throw new FeedError("Could not download the calendar from that link");
    const text = await res.text();
    if (!text.includes("BEGIN:VCALENDAR"))
      throw new FeedError("That link did not return a calendar");

    const { parseCalendarSessions } = await import("./ics-parser.server");
    const rows = await parseCalendarSessions(text, batchId);
    const { error: replaceError } = await supabaseAdmin.rpc(
      "replace_ics_sessions" as never,
      { target_batch: batchId, payload: rows } as never,
    );
    if (replaceError) throw new Error(replaceError.message);

    await syncCourses(batchId, rows);

    const { error: stateError } = await supabaseAdmin.from("batch_sync_state").upsert({
      batch_id: batchId,
      lease_until: null,
      last_success_at: new Date().toISOString(),
      consecutive_failures: 0,
      last_error: null,
      last_count: rows.length,
      paused: false,
    });
    if (stateError) throw stateError;
    return `synced ${rows.length} sessions`;
  } catch (err) {
    const failures = (state?.consecutive_failures ?? 0) + 1;
    await supabaseAdmin.from("batch_sync_state").upsert({
      batch_id: batchId,
      lease_until: null,
      consecutive_failures: failures,
      last_error: err instanceof FeedError ? err.message : "Calendar sync failed",
      paused: failures >= MAX_FAILURES,
    });
    throw err;
  }
}

import { autoColor, isAssessmentSession } from "@/lib/courses";

/** Derive the course catalogue from synced sessions and give each a unique colour. */
async function syncCourses(
  batchId: string,
  rows: Awaited<ReturnType<(typeof import("./ics-parser.server"))["parseCalendarSessions"]>>,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const map = new Map<string, { name: string; short: string; faculty: string | null }>();
  for (const r of rows) {
    if (r.is_holiday || isAssessmentSession(r)) continue;
    // Feeds without a slot code still get a catalogue entry keyed by subject name.
    const code = r.course_code ?? r.short_name ?? r.course_name;
    if (!code) continue;
    if (!map.has(code))
      map.set(code, {
        name: r.course_name ?? r.short_name ?? code,
        short: r.short_name ?? code,
        faculty: r.faculty_name,
      });
  }

  if (map.size === 0) return;

  const payload = [...map.entries()].map(([code, v]) => {
    const color = autoColor(v.name || code);
    return {
      batch_id: batchId,
      code,
      name: v.name,
      short_name: v.short,
      faculty_name: v.faculty,
      color,
    };
  });

  const { error } = await supabaseAdmin
    .from("courses")
    .upsert(payload, { onConflict: "batch_id,code" });
  if (error) throw error;
}
