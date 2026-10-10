import { z } from "zod";

export const noticeDraftSchema = z
  .object({
    title: z.string().trim().min(1).max(500),
    subject: z.string().max(500).default("General"),
    subject_code: z.string().max(100).optional(),
    type: z.enum([
      "quiz",
      "assignment",
      "presentation",
      "midterm",
      "endterm",
      "guest_lecture",
      "other",
    ]),
    due_at: z.string().datetime({ offset: true }).nullable(),
    all_day: z.boolean().default(false),
    end_at: z.string().datetime({ offset: true }).nullable().default(null),
    work_mode: z.enum(["individual", "group"]).default("individual"),
    submission_link: z
      .string()
      .max(2048)
      .optional()
      .refine((v) => !v || /^https?:\/\//i.test(v), "Use an http or https link"),
    notes: z.string().max(10000).default(""),
  })
  .superRefine((draft, ctx) => {
    if (
      draft.end_at &&
      (!draft.due_at || draft.all_day || new Date(draft.end_at) <= new Date(draft.due_at))
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["end_at"],
        message: "End time must follow a known start time",
      });
  });
export type NoticeDraft = z.infer<typeof noticeDraftSchema>;
export const noticeResultSchema = z.object({ events: z.array(noticeDraftSchema).max(12) });

export function toIstInput(iso: string) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  return new Date(date.getTime() + 330 * 60000).toISOString().slice(0, 16);
}
export function fromIstInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00+05:30`);
  return Number.isFinite(date.getTime()) && toIstInput(date.toISOString()) === value
    ? date.toISOString()
    : null;
}
/** A missing time means Time TBA, represented by midnight IST plus all_day. */
export function noticeDateTime(date: string, time = "") {
  return fromIstInput(`${date}T${time || "00:00"}`);
}
export function matchesNotice(
  existing: { title: string; due_at: string },
  draft: { title?: string; due_at?: string | null },
) {
  return (
    existing.title.trim().toLowerCase() === draft.title?.trim().toLowerCase() &&
    !!draft.due_at &&
    new Date(existing.due_at).getTime() === new Date(draft.due_at).getTime()
  );
}
