import { createFileRoute } from "@tanstack/react-router";

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatIcsDate(d: Date): string {
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function esc(v: string) {
  return (v || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export const Route = createFileRoute("/api/calendar")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const batchId = url.searchParams.get("batchId");
        if (!batchId) return new Response("Missing batchId parameter", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: batch } = await supabaseAdmin
          .from("batches")
          .select("id, name, programme_name")
          .eq("id", batchId)
          .maybeSingle();

        const batchLabel = batch ? `${batch.programme_name || ""} ${batch.name || ""}`.trim() : "Zenith Batch";

        const [{ data: sessions }, { data: deadlines }] = await Promise.all([
          supabaseAdmin
            .from("class_sessions")
            .select("*")
            .eq("batch_id", batchId)
            .order("start_at"),
          supabaseAdmin
            .from("deadlines")
            .select("*")
            .eq("batch_id", batchId)
            .eq("status", "approved"),
        ]);

        const now = formatIcsDate(new Date());
        const lines: string[] = [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          "PRODID:-//Zenith TAPMI//Academic Schedule//EN",
          "CALSCALE:GREGORIAN",
          "METHOD:PUBLISH",
          `X-WR-CALNAME:${esc(`Zenith — ${batchLabel}`)}`,
          "X-WR-TIMEZONE:Asia/Kolkata",
        ];

        for (const s of sessions ?? []) {
          const start = new Date(s.start_at);
          const end = new Date(s.end_at);
          if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;

          lines.push(
            "BEGIN:VEVENT",
            `UID:zenith-session-${s.id}@zenithfor.me`,
            `DTSTAMP:${now}`,
            `DTSTART:${formatIcsDate(start)}`,
            `DTEND:${formatIcsDate(end)}`,
            `SUMMARY:${esc(s.course_code ? `${s.course_code}: ${s.subject_name || s.title}` : s.title)}`,
            `LOCATION:${esc(s.classroom ?? "Academic Block")}`,
            `DESCRIPTION:${esc(
              [
                s.course_name && `Course: ${s.course_name}`,
                s.faculty_name && `Faculty: ${s.faculty_name}`,
                "Zenith Student Board (https://www.zenithfor.me)",
              ]
                .filter(Boolean)
                .join("\n"),
            )}`,
            "STATUS:CONFIRMED",
            "END:VEVENT",
          );
        }

        for (const d of deadlines ?? []) {
          const due = new Date(d.due_at);
          if (isNaN(due.getTime())) continue;
          const start = new Date(due.getTime() - 30 * 60_000);
          lines.push(
            "BEGIN:VEVENT",
            `UID:zenith-deadline-${d.id}@zenithfor.me`,
            `DTSTAMP:${now}`,
            `DTSTART:${formatIcsDate(start)}`,
            `DTEND:${formatIcsDate(due)}`,
            `SUMMARY:${esc(`[${d.type.toUpperCase()}] ${d.subject ? `${d.subject}: ` : ""}${d.title}`)}`,
            `LOCATION:${esc(d.location ?? "")}`,
            `DESCRIPTION:${esc(
              [d.subject, d.type, d.submission_link, "Zenith Academic Board"].filter(Boolean).join(" — "),
            )}`,
            "STATUS:CONFIRMED",
            "END:VEVENT",
          );
        }

        lines.push("END:VCALENDAR");

        return new Response(lines.join("\r\n"), {
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": `attachment; filename="zenith_${batchId.slice(0, 8)}.ics"`,
            "Cache-Control": "public, max-age=600",
          },
        });
      },
    },
  },
});
