import { createFileRoute } from "@tanstack/react-router";

/** Scheduled Registro timetable sync. Called by the scheduler with the cron secret. */
export const Route = createFileRoute("/api/public/sync-timetable")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { authenticateCronRequest } = await import("@/integrations/supabase/cron-auth");
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { syncBatch } = await import("@/lib/ics-sync.server");

        const { data: feeds, error: feedsError } = await supabaseAdmin
          .from("batches")
          .select("id")
          .not("ics_url", "is", null)
          .limit(50);

        if (feedsError) return Response.json({ error: "Unable to load batches" }, { status: 500 });
        const results: { batch_id: string; result: string }[] = [];
        for (const row of feeds ?? []) {
          try {
            results.push({ batch_id: row.id, result: await syncBatch(row.id) });
          } catch (err) {
            results.push({
              batch_id: row.id,
              result: `error: ${err instanceof Error ? err.message : String(err)}`,
            });
          }
        }

        return Response.json({ ok: true, batches: results.length, results });
      },
    },
  },
});
