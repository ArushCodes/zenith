import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertSafeFeedUrl } from "@/lib/safe-url";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type ModCheckClient = SupabaseClient<Database>;

export const timetableStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ batchId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const role = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (role.error) throw new Error("Unable to verify access");
    if (!role.data) {
      const membership = await supabaseAdmin
        .from("batch_memberships")
        .select("id")
        .eq("batch_id", data.batchId)
        .eq("user_id", context.userId)
        .eq("status", "approved")
        .maybeSingle();
      if (membership.error || !membership.data) throw new Error("Batch membership required");
    }
    const state = await supabaseAdmin
      .from("batch_sync_state")
      .select("last_success_at,last_error,paused")
      .eq("batch_id", data.batchId)
      .maybeSingle();
    if (state.error) throw new Error("Sync status unavailable");
    return {
      lastSuccess: state.data?.last_success_at || null,
      failed: !!state.data?.last_error,
      paused: !!state.data?.paused,
    };
  });

async function assertBatchMod(supabase: ModCheckClient, userId: string, batchId: string) {
  // Global admin override
  const { data: globalAdmin } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (globalAdmin) return;

  const { data } = await supabase
    .from("batch_memberships")
    .select("role, status")
    .eq("batch_id", batchId)
    .eq("user_id", userId)
    .eq("status", "approved")
    .maybeSingle();
  if (!data || (data.role !== "mod" && data.role !== "admin")) {
    throw new Error("Forbidden — moderators and administrators only");
  }
}

export const saveIcsUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        batchId: z.string().uuid(),
        icsUrl: z
          .string()
          .max(2048)
          .transform((v) => v.trim())
          .refine((v) => {
            try {
              assertSafeFeedUrl(v);
              return true;
            } catch {
              return false;
            }
          }, "Enter a public https calendar (.ics) link"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertBatchMod(context.supabase as never, context.userId, data.batchId);
    const safeUrl = assertSafeFeedUrl(data.icsUrl).toString();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("batches")
      .update({ ics_url: safeUrl })
      .eq("id", data.batchId);
    if (error) throw new Error(error.message);
    await supabaseAdmin
      .from("batch_sync_state")
      .upsert({ batch_id: data.batchId, paused: false, consecutive_failures: 0, last_error: null });
    return { ok: true };
  });

export const syncTimetableNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ batchId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertBatchMod(context.supabase as never, context.userId, data.batchId);
    const { syncBatch } = await import("@/lib/ics-sync.server");
    try {
      const result = await syncBatch(data.batchId, true);
      return { ok: true, result };
    } catch (err) {
      return { ok: false, result: err instanceof Error ? err.message : String(err) };
    }
  });
