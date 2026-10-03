import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const payloadSchema = z.object({
  batchSlug: z.string().min(1).max(100),
  messageKey: z.string().min(1).max(500),
  subject: z.string().max(1000).default(""),
  sender: z.string().max(500).default(""),
  receivedAt: z.string().datetime({ offset: true }).optional(),
  body: z.string().max(20000).default(""),
});

const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    is_event: { type: "boolean" },
    confidence: { type: "number" },
    title: { type: "string" },
    subject: { type: "string" },
    subject_code: { type: "string" },
    type: {
      type: "string",
      enum: ["quiz", "assignment", "presentation", "midterm", "endterm", "guest_lecture", "other"],
    },
    due_at: { type: "string", description: "ISO 8601 datetime, IST if unspecified" },
    work_mode: { type: "string", enum: ["individual", "group"] },
    submission_link: { type: "string" },
    location: { type: "string" },
    notes: { type: "string" },
  },
  required: ["is_event", "confidence"],
} as const;

/** Outlook / mail forwarder webhook: captures a mail and extracts a candidate event. */
export const Route = createFileRoute("/api/public/email-intake")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["EMAIL_INTAKE_SECRET"];
        const provided =
          request.headers.get("x-intake-secret") ??
          request.headers.get("authorization")?.replace("Bearer ", "");
        if (!secret || provided !== secret) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        if (Number(request.headers.get("content-length") ?? 0) > 100000)
          return Response.json({ error: "Payload too large" }, { status: 413 });
        let payload: unknown;
        try {
          const body = await request.text();
          if (body.length > 100000)
            return Response.json({ error: "Payload too large" }, { status: 413 });
          payload = JSON.parse(body);
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        const parsed = payloadSchema.safeParse(payload);
        if (!parsed.success) {
          return Response.json({ error: parsed.error.message }, { status: 400 });
        }
        const input = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: batch } = await supabaseAdmin
          .from("batches")
          .select("id")
          .eq("slug", input.batchSlug)
          .maybeSingle();
        if (!batch) return Response.json({ error: "Unknown batch" }, { status: 404 });

        const { data: existing } = await supabaseAdmin
          .from("email_ingest")
          .select("id")
          .eq("batch_id", batch.id)
          .eq("message_key", input.messageKey)
          .maybeSingle();
        if (existing) return Response.json({ ok: true, deduped: true });

        let extracted: Record<string, unknown> | null = null;
        let confidence: number | null = null;
        let error: string | null = null;

        try {
          const apiKey =
            process.env["AI_GATEWAY_API_KEY"] ??
            process.env["GEMINI_API_KEY"] ??
            process.env["LOVABLE_API_KEY"];
          if (!apiKey)
            throw new Error(
              "AI Gateway API key missing (set AI_GATEWAY_API_KEY or GEMINI_API_KEY)",
            );
          const gatewayUrl =
            process.env["AI_GATEWAY_URL"] ?? "https://ai.gateway.lovable.dev/v1/chat/completions";
          const res = await fetch(gatewayUrl, {
            method: "POST",
            signal: AbortSignal.timeout(20000),
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3.7-flash",
              messages: [
                {
                  role: "system",
                  content:
                    "You extract academic deadlines from university emails. Times are Asia/Kolkata unless stated. If the mail is not about a deliverable, quiz, exam, presentation or lecture, set is_event false.",
                },
                {
                  role: "user",
                  content: `Subject: ${input.subject}\nFrom: ${input.sender}\n\n${input.body.slice(0, 12000)}`,
                },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "record_event",
                    description: "Record the extracted event",
                    parameters: EXTRACT_SCHEMA,
                  },
                },
              ],
              tool_choice: { type: "function", function: { name: "record_event" } },
            }),
          });

          if (!res.ok) throw new Error(`AI gateway ${res.status}: ${await res.text()}`);
          const json = (await res.json()) as {
            choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[];
          };
          const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
          const candidate = z
            .object({
              is_event: z.boolean(),
              confidence: z.number().min(0).max(1),
              title: z.string().max(500).optional(),
              subject: z.string().max(500).optional(),
              subject_code: z.string().max(100).optional(),
              type: z
                .enum([
                  "quiz",
                  "assignment",
                  "presentation",
                  "midterm",
                  "endterm",
                  "guest_lecture",
                  "other",
                ])
                .optional(),
              due_at: z.string().datetime({ offset: true }).optional(),
              work_mode: z.enum(["individual", "group"]).optional(),
              submission_link: z
                .string()
                .url()
                .refine((v) => /^https?:/.test(v))
                .optional(),
              location: z.string().max(1000).optional(),
              notes: z.string().max(10000).optional(),
            })
            .refine(
              (v) => !v.is_event || !!(v.title && v.due_at && v.type),
              "Events need a title, date and type",
            );
          extracted = args ? candidate.parse(JSON.parse(args)) : null;
          confidence =
            typeof extracted?.["confidence"] === "number"
              ? (extracted["confidence"] as number)
              : null;
        } catch (err) {
          error = err instanceof Error ? err.message : String(err);
        }

        const { error: insertError } = await supabaseAdmin.from("email_ingest").insert({
          batch_id: batch.id,
          message_key: input.messageKey,
          subject: input.subject,
          sender: input.sender,
          received_at: input.receivedAt ?? new Date().toISOString(),
          body: input.body.slice(0, 20000),
          extracted: extracted as never,
          confidence,
          error,
          status: "pending",
        });
        if (insertError?.code === "23505") return Response.json({ ok: true, deduped: true });
        if (insertError) return Response.json({ error: insertError.message }, { status: 500 });

        return Response.json({ ok: true, extracted: !!extracted, aiError: error });
      },
    },
  },
});
