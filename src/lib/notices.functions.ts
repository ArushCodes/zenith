import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  batchId: z.string().uuid(),
  body: z.string().trim().min(10).max(20000),
  subject: z.string().max(500).default("Notice"),
});

export const noticeImportStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ batchId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { requireBatchManager } = await import("./admin-auth.server");
    await requireBatchManager(context.userId, data.batchId);
    const { noticeProviderReady } = await import("./notice-extraction.server");
    return { configured: noticeProviderReady() };
  });

export const importNotice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { requireBatchManager } = await import("./admin-auth.server");
    await requireBatchManager(context.userId, data.batchId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createHash } = await import("node:crypto");
    const key = `notice:${createHash("sha256").update(`${data.subject}\n${data.body}`).digest("hex")}`;
    const existing = await supabaseAdmin
      .from("email_ingest")
      .select("id")
      .eq("batch_id", data.batchId)
      .like("message_key", `${key}:%`)
      .limit(1);
    if (existing.error) throw new Error("Unable to check the notice queue.");
    if (existing.data?.length) return { count: 0, duplicate: true };
    const { limitAuthAttempt } = await import("./auth-limits.server");
    await limitAuthAttempt("notice-import", context.userId);
    const { extractNotice } = await import("./notice-extraction.server");
    const events = await extractNotice(
      `Subject: ${data.subject}\n\n${data.body}`,
      new Date().toISOString(),
    );
    if (!events.length) return { count: 0, duplicate: false };
    const { error } = await supabaseAdmin.from("email_ingest").insert(
      events.map((event, index) => ({
        batch_id: data.batchId,
        message_key: `${key}:${index}`,
        subject: data.subject,
        sender: "Notice import",
        body: data.body,
        extracted: event as never,
        status: "pending" as const,
        received_at: new Date().toISOString(),
      })),
    );
    if (error?.code === "23505") return { count: 0, duplicate: true };
    if (error) throw new Error("Unable to save notice drafts.");
    return { count: events.length, duplicate: false };
  });
