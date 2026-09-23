import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ALLOWED_DOMAIN = "learner.manipal.edu";

export const requestSignupVerification = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        fullName: z.string().trim().min(2, "Please enter your full name"),
        email: z
          .string()
          .trim()
          .toLowerCase()
          .refine(
            (val) => val.endsWith(`@${ALLOWED_DOMAIN}`),
            `Sign-ups are limited to @${ALLOWED_DOMAIN} email addresses.`,
          ),
        password: z.string().min(6, "Password must be at least 6 characters"),
        batchId: z.string().uuid("Please select your batch"),
        rollNo: z.string().trim().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendOtpEmail } = await import("./mailer.server");
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanRoll = data.rollNo ? data.rollNo.trim().toUpperCase() : undefined;

    // Check if user already exists in profiles
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existingProfile) {
      throw new Error(
        "An account with this email already exists. Please switch to 'Sign In' and enter your password.",
      );
    }

    // Check if user already exists in auth
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existingAuthUser = usersData?.users?.find(
      (u) => u.email?.toLowerCase() === cleanEmail,
    );
    if (existingAuthUser) {
      throw new Error(
        "An account with this email already exists. Please switch to 'Sign In' and enter your password.",
      );
    }

    // Check if roll number is already claimed by another student profile
    if (cleanRoll) {
      const { data: rollProfile } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .eq("registration_no", cleanRoll)
        .maybeSingle();

      if (rollProfile && rollProfile.email?.toLowerCase() !== cleanEmail) {
        throw new Error(
          `Student roll number '${cleanRoll}' has already been registered with another account. Please sign in with your registered email.`,
        );
      }
    }

    // Generate link & email_otp with admin API (doesn't send Supabase's rate-limited/spam-filtered email)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "signup",
      email: cleanEmail,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          batch_id: data.batchId,
          roll_no: cleanRoll,
        },
      },
    });

    if (linkError) {
      const msg = linkError.message.toLowerCase();
      if (msg.includes("already registered") || msg.includes("already exists")) {
        throw new Error(
          "An account with this email already exists. Please switch to 'Sign In' and enter your password.",
        );
      }
      throw new Error(linkError.message);
    }

    const otp = linkData?.properties?.email_otp;
    if (!otp) {
      throw new Error("Unable to generate verification code. Please try again.");
    }

    // Send email with the OTP using anti-spam formatting (No tracking links, clear text)
    const mailResult = await sendOtpEmail({
      to: cleanEmail,
      otp,
      fullName: data.fullName,
    });

    return {
      ok: true,
      email: cleanEmail,
      provider: mailResult.provider,
    };
  });

export const finalizeSignup = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        email: z.string().trim().toLowerCase(),
        fullName: z.string().trim().min(2),
        batchId: z.string().uuid(),
        rollNo: z.string().trim().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanRoll = data.rollNo ? data.rollNo.trim().toUpperCase() : undefined;

    // Upsert profile
    await supabaseAdmin.from("profiles").upsert(
      {
        id: data.userId,
        full_name: data.fullName,
        email: cleanEmail,
        ...(cleanRoll ? { registration_no: cleanRoll } : {}),
      },
      { onConflict: "id" },
    );

    // Upsert approved batch membership
    await supabaseAdmin.from("batch_memberships").upsert(
      {
        user_id: data.userId,
        batch_id: data.batchId,
        role: "student",
        status: "approved",
      },
      { onConflict: "user_id,batch_id" },
    );

    return { ok: true };
  });

export const previewRosterStudent = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        regNo: z.string().trim(),
        dob: z.string().trim(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { findStudentInRoster, toTitleCase, INSTITUTION_INFO } = await import("./roster.data");
    const cleanReg = data.regNo.replace(/\D/g, "");
    if (cleanReg.length !== 12) {
      return { found: false as const };
    }
    const student = findStudentInRoster(cleanReg, data.dob);
    if (!student) {
      return { found: false as const };
    }
    return {
      found: true as const,
      name: toTitleCase(student.name),
      rollNo: student.rollNo,
      maheId: student.maheId,
      university: INSTITUTION_INFO.university,
      college: INSTITUTION_INFO.college,
      course: INSTITUTION_INFO.course,
      batchName: INSTITUTION_INFO.defaultBatch,
    };
  });

export const registerWithRoster = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        email: z
          .string()
          .trim()
          .toLowerCase()
          .refine(
            (val) => val.endsWith(`@${ALLOWED_DOMAIN}`),
            `Sign-ups are limited to @${ALLOWED_DOMAIN} email addresses.`,
          ),
        password: z.string().min(6, "Password must be at least 6 characters"),
        regNo: z
          .string()
          .trim()
          .refine((val) => val.replace(/\D/g, "").length === 12, {
            message: "Please enter your complete 12-digit MAHE Roll No. (e.g. 261612340020)",
          }),
        dob: z.string().trim().min(4, "Please enter your date of birth"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { findStudentInRoster, toTitleCase, INSTITUTION_INFO, getBatchInfo } = await import("./roster.data");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const cleanEmail = data.email.trim().toLowerCase();
    const cleanReg = data.regNo.replace(/\D/g, "");
    const student = findStudentInRoster(cleanReg, data.dob);
    if (!student) {
      throw new Error(
        "Verification failed. The Date of Birth and MAHE Roll No. do not match official university records. Please double-check both fields.",
      );
    }

    const fullName = toTitleCase(student.name);
    const rollNo = student.rollNo;
    const batchId = student.batchId;
    const batchInfo = getBatchInfo(batchId);

    // 1. Prevent duplicate signups: Check if email already exists in profiles
    const { data: profileByEmail } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (profileByEmail) {
      throw new Error(
        "An account with this email address already exists. Please switch to 'Sign In' and enter your password.",
      );
    }

    // 2. Prevent duplicate signups: Check if email already exists in auth
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existingAuthUser = usersData?.users?.find(
      (u) => u.email?.toLowerCase() === cleanEmail,
    );
    if (existingAuthUser) {
      throw new Error(
        "An account with this email address already exists. Please switch to 'Sign In' and enter your password.",
      );
    }

    // 3. Prevent duplicate identity hijacking: Check if student roll number is already registered by another profile
    const { data: profileByRoll } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("registration_no", rollNo)
      .maybeSingle();

    if (profileByRoll && profileByRoll.email?.toLowerCase() !== cleanEmail) {
      throw new Error(
        `Student roll number (${rollNo}) has already been registered with another email account. Please sign in with your registered email or contact an administrator.`,
      );
    }

    // 4. Secure account creation (Never overwrite existing user's password)
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        roll_no: rollNo,
        batch_id: batchId,
      },
    });
    if (createErr) {
      throw new Error(createErr.message);
    }
    const userId = created.user.id;

    // Upsert profile with full name, email, and verified roll number
    const { error: profileErr } = await supabaseAdmin.from("profiles").upsert(
      {
        id: userId,
        full_name: fullName,
        email: cleanEmail,
        registration_no: rollNo,
      },
      { onConflict: "id" },
    );
    if (profileErr) {
      console.warn("Profile upsert warning:", profileErr.message);
    }

    // Upsert approved batch membership
    const { error: batchErr } = await supabaseAdmin.from("batch_memberships").upsert(
      {
        user_id: userId,
        batch_id: batchId,
        role: "student",
        status: "approved",
      },
      { onConflict: "user_id,batch_id" },
    );
    if (batchErr) {
      console.warn("Batch membership upsert warning:", batchErr.message);
    }

    return {
      ok: true,
      fullName,
      rollNo,
      maheId: student.maheId,
      batchName: batchInfo.batchName,
      university: INSTITUTION_INFO.university,
      college: INSTITUTION_INFO.college,
      course: INSTITUTION_INFO.course,
      email: cleanEmail,
    };
  });
