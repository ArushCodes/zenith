import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const learnerEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .refine(
    (email) => email.endsWith("@learner.manipal.edu"),
    "Use your learner.manipal.edu address.",
  );

export const registerWithRoster = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        email: learnerEmail,
        password: z.string().min(8),
        regNo: z.string().regex(/^\d{12}$/),
        dob: z.string().min(8),
        batchId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { limitAuthAttempt } = await import("./auth-limits.server");
    await limitAuthAttempt("register", data.regNo);
    const { findStudentInRoster } = await import("./roster.server");
    const { toTitleCase, getBatchInfo, INSTITUTION_INFO } = await import("./roster.data");
    let student = findStudentInRoster(data.regNo, data.dob);
    if (!student) {
      const { data: enrolment, error: rosterError } = await supabaseAdmin
        .from("student_enrolments")
        .select("*")
        .eq("mahe_id", data.regNo)
        .maybeSingle();
      if (rosterError) throw new Error("Student verification is temporarily unavailable.");
      const { matchesEnrolment } = await import("./enrolment-match");
      if (enrolment && matchesEnrolment(enrolment, data))
        student = {
          sno: 0,
          maheId: enrolment.mahe_id,
          last4: enrolment.mahe_id.slice(-4),
          rollNo: enrolment.roll_no,
          name: enrolment.full_name,
          dob: enrolment.dob,
          batchId: enrolment.batch_id,
        };
    }
    if (!student)
      throw new Error(
        "Student details do not match the available roster. Check your MAHE ID, birth date and learner email.",
      );
    if (data.batchId && student.batchId !== data.batchId)
      throw new Error("Choose the batch listed in your student record.");
    const { data: claimed, error: checkError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("registration_no", student.rollNo)
      .maybeSingle();
    if (checkError) throw new Error("Unable to check student registration.");
    if (claimed)
      throw new Error("This student is already registered. Sign in or use password recovery.");
    const fullName = toTitleCase(student.name);
    // The database trigger creates identity, role and membership in the auth transaction.
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      app_metadata: { zenith_roster_verified: true },
      user_metadata: {
        full_name: fullName,
        roll_no: student.rollNo,
        mahe_id: student.maheId,
        batch_id: student.batchId,
      },
    });
    if (error) throw new Error(error.message);
    if (!created.user) throw new Error("Account could not be created.");
    return {
      ok: true,
      fullName,
      rollNo: student.rollNo,
      maheId: student.maheId,
      batchName: getBatchInfo(student.batchId).batchName,
      email: data.email,
      university: INSTITUTION_INFO.university,
      college: INSTITUTION_INFO.college,
      course: getBatchInfo(student.batchId).batchCode.startsWith("MBA")
        ? "MBA"
        : INSTITUTION_INFO.course,
    };
  });

export const resolveLoginIdentifier = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ identifier: z.string().trim().min(1).max(100) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { limitAuthAttempt } = await import("./auth-limits.server");
    await limitAuthAttempt("login-lookup", data.identifier);
    const raw = data.identifier.toLowerCase();
    if (raw.includes("@")) return { email: learnerEmail.parse(raw) };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { findStudentInRosterByRoll } = await import("./roster.server");
    const roll = findStudentInRosterByRoll(raw)?.rollNo ?? raw.toUpperCase();
    if (!/^[A-Z0-9-]+$/i.test(raw)) throw new Error("Use a learner email, roll number or MAHE ID.");
    const profileQuery = supabaseAdmin.from("profiles").select("email");
    const { data: profile, error } = await (
      /^\d{12}$/.test(raw)
        ? profileQuery.eq("mahe_id", raw)
        : profileQuery.eq("registration_no", roll)
    ).maybeSingle();
    if (error) throw new Error("Sign-in lookup is temporarily unavailable.");
    return { email: profile?.email ?? `${raw}@learner.manipal.edu` };
  });

export const requestPasswordReset = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ email: learnerEmail }).parse(input))
  .handler(async ({ data }) => {
    const { limitAuthAttempt } = await import("./auth-limits.server");
    await limitAuthAttempt("recovery", data.email);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("email", data.email)
      .maybeSingle();
    if (error) throw new Error("Recovery is temporarily unavailable.");
    if (!profile) return { ok: true };
    const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: data.email,
    });
    if (linkError || !link.properties?.email_otp)
      throw new Error("Recovery is temporarily unavailable.");
    const { sendOtpEmail } = await import("./mailer.server");
    await sendOtpEmail({
      to: data.email,
      otp: link.properties.email_otp,
      fullName: profile.full_name || "Student",
      purpose: "reset",
    });
    return { ok: true };
  });

export const adminResetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        targetUserId: z.string().uuid().optional(),
        targetEmail: learnerEmail.optional(),
        targetRollNo: z.string().trim().max(30).optional(),
        newPassword: z.string().min(8),
      })
      .refine(
        (value) => value.targetUserId || value.targetEmail || value.targetRollNo,
        "Choose a student.",
      )
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { requireGlobalAdmin } = await import("./admin-auth.server");
    await requireGlobalAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let targetId = data.targetUserId;
    if (!targetId) {
      const query = supabaseAdmin.from("profiles").select("id");
      const { data: profile, error } = await (
        data.targetEmail
          ? query.eq("email", data.targetEmail)
          : query.eq("registration_no", data.targetRollNo!.toUpperCase())
      ).maybeSingle();
      if (error) throw error;
      targetId = profile?.id;
    }
    if (!targetId) throw new Error("Student account not found.");
    const { data: updated, error } = await supabaseAdmin.auth.admin.updateUserById(targetId, {
      password: data.newPassword,
    });
    if (error) throw error;
    return { ok: true, userId: targetId, email: updated.user.email, message: "Password updated." };
  });

export const getNeverLoggedInUsersCount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireGlobalAdmin, listAllAuthUsers } = await import("./admin-auth.server");
    await requireGlobalAdmin(context.userId);
    const users = await listAllAuthUsers();
    const inactive = users.filter((user) => !user.last_sign_in_at);
    return {
      totalUsers: users.length,
      neverLoggedInCount: inactive.length,
      users: inactive.map((user) => ({
        id: user.id,
        email: user.email || "",
        createdAt: user.created_at,
        confirmed: !!user.email_confirmed_at,
      })),
    };
  });

export const purgeNeverLoggedInUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<{ ok: boolean; purgedCount: number; purgedEmails: string[]; message: string }> => {
      const { requireGlobalAdmin } = await import("./admin-auth.server");
      await requireGlobalAdmin(context.userId);
      throw new Error(
        "Automatic account deletion is disabled. Review inactive accounts individually.",
      );
    },
  );
