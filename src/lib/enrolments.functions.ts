import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const addStudentEnrolment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        batchId: z.string().uuid(),
        maheId: z.string().regex(/^\d{12}$/),
        rollNo: z
          .string()
          .trim()
          .toUpperCase()
          .min(2)
          .max(40)
          .regex(/^[A-Z0-9-]+$/),
        name: z.string().trim().min(2).max(120),
        dob: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .refine(
            (v) =>
              !isNaN(Date.parse(v)) &&
              new Date(v).toISOString().slice(0, 10) === v &&
              v < new Date().toISOString().slice(0, 10),
            "Use a valid birth date",
          ),
        email: z
          .string()
          .trim()
          .toLowerCase()
          .email()
          .refine((v) => v.endsWith("@learner.manipal.edu"), "Use the student's learner email"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { requireGlobalAdmin } = await import("./admin-auth.server");
    await requireGlobalAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: batch, error: batchError } = await supabaseAdmin
      .from("batches")
      .select("slug")
      .eq("id", data.batchId)
      .maybeSingle();
    if (batchError || !batch || !batch.slug.startsWith("tapmi-mba-"))
      throw new Error("Choose an MBA batch");
    const { IPM1_ROSTER } = await import("./roster.server");
    if (
      IPM1_ROSTER.some(
        (student) => student.maheId === data.maheId || student.rollNo === data.rollNo,
      )
    )
      throw new Error("Student already belongs to the IPM roster");
    const { data: claimed, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .or(`mahe_id.eq.${data.maheId},registration_no.eq.${data.rollNo}`)
      .limit(1);
    if (profileError) throw new Error("Unable to check existing registrations");
    if (claimed?.length) throw new Error("Student already registered");
    const { error } = await supabaseAdmin.from("student_enrolments").insert({
      mahe_id: data.maheId,
      roll_no: data.rollNo,
      full_name: data.name,
      dob: data.dob,
      email: data.email,
      batch_id: data.batchId,
      created_by: context.userId,
    });
    if (error)
      throw new Error(
        error.code === "23505"
          ? "MAHE ID, roll number or email already exists in the roster"
          : "Unable to save student record",
      );
    return { ok: true };
  });
