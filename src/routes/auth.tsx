import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Lock, Mail, User, ArrowLeft, CheckCircle2, KeyRound, RotateCw, Edit3, ShieldCheck, Fingerprint, Calendar, Sparkles, AlertCircle, Sun, Moon } from "lucide-react";
import { db as supabase, backendConfigured } from "@/lib/backend";
import { batchTreeQuery } from "@/lib/batches";
import { HierarchyBatchSelector } from "@/components/auth/HierarchyBatchSelector";
import { requestSignupVerification, finalizeSignup, registerWithRoster } from "@/lib/auth.functions";
import {
  findStudentInRoster,
  toTitleCase,
  IPM_BATCHES,
  IPM1_BATCH_ID,
  IPM2_BATCH_ID,
  IPM3_BATCH_ID,
  getBatchInfo,
} from "@/lib/roster.data";
import { useTheme } from "@/hooks/use-theme";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { VerificationWelcomeScreen } from "@/components/auth/VerificationWelcomeScreen";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: (search.mode === "signup" ? "signup" : "signin") as "signin" | "signup",
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Zenith" },
      {
        name: "description",
        content:
          "Sign in to Zenith, the TAPMI Manipal student board for deadlines, timetable and attendance.",
      },
      { property: "og:title", content: "Sign in — Zenith" },
      {
        property: "og:description",
        content: "Access your batch board on Zenith — TAPMI Manipal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const fieldClass =
  "w-full rounded-xl bg-ground px-3.5 py-2.5 pl-9 text-sm text-ink ring-1 ring-border outline-none transition-all placeholder:text-faint focus:ring-2 focus:ring-cyan/50";

const ALLOWED_DOMAIN = "learner.manipal.edu";
const isAllowedEmail = (value: string) =>
  value.trim().toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { theme, toggle: toggleTheme } = useTheme();
  const [mode, setMode] = useState<"signin" | "signup" | "verify" | "welcome">(search.mode || "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedIpmBatch, setSelectedIpmBatch] = useState<string>(IPM1_BATCH_ID);
  const [showAdvancedHierarchy, setShowAdvancedHierarchy] = useState(false);
  const [batchId, setBatchId] = useState(IPM1_BATCH_ID);
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const [dob, setDob] = useState("");
  const [regNo, setRegNo] = useState("");
  const [useManualBatch, setUseManualBatch] = useState(false);
  const [welcomeInfo, setWelcomeInfo] = useState<{
    fullName: string;
    rollNo: string;
    maheId?: string;
    university?: string;
    college?: string;
    course?: string;
    batchName?: string;
  } | null>(null);

  // Live matching against official TAPMI roster (12-digit MAHE Roll No. + DOB)
  const candidate = findStudentInRoster(regNo, dob);

  const { data: batches = [] } = useQuery({
    ...batchTreeQuery,
    enabled: backendConfigured,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!backendConfigured) return;
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session && mode !== "welcome") navigate({ to: "/", replace: true });
      })
      .catch(() => undefined);
  }, [navigate, mode]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  async function handleRosterRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!backendConfigured) {
      toast.error("Sign-in is temporarily unavailable. Please try again shortly.");
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!isAllowedEmail(cleanEmail)) {
      toast.error(`Sign-ups are limited to @${ALLOWED_DOMAIN} email addresses.`);
      return;
    }
    const cleanReg = regNo.trim().replace(/\D/g, "");
    if (cleanReg.length !== 12) {
      toast.error("Please enter your complete 12-digit MAHE Roll No. (e.g. 261612340020).");
      return;
    }
    if (!dob.trim()) {
      toast.error("Please provide your Date of Birth.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setBusy(true);
    try {
      const res = await registerWithRoster({
        data: {
          email: cleanEmail,
          password,
          regNo: cleanReg,
          dob: dob.trim(),
        },
      });

      // Auto sign-in with verified credentials
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (signInErr) {
        throw signInErr;
      }

      setWelcomeInfo({
        fullName: res.fullName,
        rollNo: res.rollNo,
        maheId: res.maheId || candidate?.maheId,
        university: res.university || "MAHE Manipal",
        college: res.college || "TAPMI",
        course: res.course || "IPM (BBA/MBA)",
        batchName: res.batchName || "Batch 2026–2031",
      });
      setMode("welcome");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Registration failed";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleSendVerification(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!backendConfigured) {
      toast.error("Sign-in is temporarily unavailable. Please try again shortly.");
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!isAllowedEmail(cleanEmail)) {
      toast.error(`Sign-ups are limited to @${ALLOWED_DOMAIN} email addresses.`);
      return;
    }
    const targetBatchId = batchId || selectedIpmBatch;
    if (!targetBatchId) {
      toast.error("Please select the batch you belong to.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setBusy(true);
    try {
      await requestSignupVerification({
        data: {
          fullName: fullName.trim(),
          email: cleanEmail,
          password,
          batchId: targetBatchId,
          rollNo: regNo.trim() || undefined,
        },
      });

      toast.success("Verification code sent! Please check your email.");
      setMode("verify");
      setResendCooldown(30);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to send verification code";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const cleanOtp = otp.trim().replace(/\D/g, "");
    if (cleanOtp.length < 6) {
      toast.error("Please enter the complete verification code.");
      return;
    }

    setBusy(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data: verifyData, error: verifyErr } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanOtp,
        type: "signup",
      });

      if (verifyErr) {
        throw new Error(verifyErr.message || "Invalid or expired verification code.");
      }

      const userId = verifyData.user?.id || verifyData.session?.user?.id;
      const targetBatchId = batchId || selectedIpmBatch;
      if (userId) {
        await finalizeSignup({
          data: {
            userId,
            email: cleanEmail,
            fullName: fullName.trim(),
            batchId: targetBatchId,
            rollNo: regNo.trim() || undefined,
          },
        });
      }

      const batchInfo = getBatchInfo(targetBatchId);
      setWelcomeInfo({
        fullName: fullName.trim(),
        rollNo: regNo.trim() || "Student",
        university: "MAHE Manipal",
        college: "TAPMI",
        course: "IPM (BBA/MBA)",
        batchName: batchInfo.batchName,
      });
      setMode("welcome");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Verification failed";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!backendConfigured) {
      toast.error("Sign-in is temporarily unavailable. Please try again shortly.");
      return;
    }
    setBusy(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error) throw error;
      toast.success("Welcome back!");
      navigate({ to: "/", replace: true });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Invalid email or password";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ground px-4 font-body text-ink py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="aurora-a absolute -left-16 -top-24 h-[420px] w-[560px] rounded-full bg-cyan/15 blur-[140px]" />
        <div className="aurora-b absolute bottom-[-140px] right-[-40px] h-[460px] w-[560px] rounded-full bg-violet/15 blur-[160px]" />
      </div>

      <div
        className={`relative w-full ${
          mode === "signup" || mode === "welcome" ? "max-w-xl" : "max-w-md"
        } rounded-2xl bg-surface/90 p-6 sm:p-8 ring-1 ring-border shadow-2xl backdrop-blur-xl transition-all duration-300`}
      >
        {mode !== "welcome" && (
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-dim transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-3" /> Back to board
          </Link>
        )}

        {mode === "welcome" && welcomeInfo ? (
          <VerificationWelcomeScreen
            fullName={welcomeInfo.fullName}
            rollNo={welcomeInfo.rollNo}
            maheId={welcomeInfo.maheId}
            university={welcomeInfo.university}
            college={welcomeInfo.college}
            course={welcomeInfo.course}
            batchName={welcomeInfo.batchName}
            onContinue={() => navigate({ to: "/", replace: true })}
          />
        ) : mode !== "verify" ? (
          <>
            <div className="mt-4 mb-6 flex items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink">
                  {mode === "signin" ? "Welcome back" : "Create account"}
                </h1>
                <p className="mt-1 font-mono text-xs text-dim">
                  {mode === "signin"
                    ? "Zenith · Student Board Portal"
                    : candidate
                    ? `${candidate.name ? toTitleCase(candidate.name) + " · " : ""}Student Verification`
                    : "Student Verification & Portal Access"}
                </p>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                title={theme === "dark" ? "Light mode" : "Dark mode"}
                className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-surface text-dim transition-colors hover:border-cyan/40 hover:text-ink cursor-pointer shadow-sm"
              >
                {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </button>
            </div>

            {/* Tab Selector */}
            <div className="mb-6 grid grid-cols-2 rounded-xl bg-ground/80 p-1 ring-1 ring-border shadow-inner">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`rounded-lg py-2.5 font-mono text-xs font-semibold transition-all cursor-pointer ${
                  mode === "signin"
                    ? "bg-surface text-ink shadow-sm ring-1 ring-border border-b-2 border-cyan/50"
                    : "text-dim hover:text-ink"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`rounded-lg py-2.5 font-mono text-xs font-semibold transition-all cursor-pointer ${
                  mode === "signup"
                    ? "bg-surface text-ink shadow-sm ring-1 ring-border border-b-2 border-cyan/50"
                    : "text-dim hover:text-ink"
                }`}
              >
                Register
              </button>
            </div>

            {mode === "signin" ? (
              <form onSubmit={handleSignIn} className="flex flex-col gap-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-dim"
                  >
                    Learner Email
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3 size-4 text-faint pointer-events-none" />
                    <input
                      id="email"
                      type="email"
                      required
                      className={fieldClass}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@learner.manipal.edu"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-dim"
                  >
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3 size-4 text-faint pointer-events-none" />
                    <input
                      id="password"
                      type="password"
                      required
                      className={fieldClass}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your account password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="mt-2 w-full rounded-xl bg-cyan py-3.5 text-sm font-bold text-ground border-b-2 border-cyan-600 shadow-md shadow-cyan/25 ring-1 ring-cyan/80 hover:bg-cyan/95 active:translate-y-0.5 active:border-b-0 transition-all focus:ring-2 focus:ring-cyan/50 disabled:opacity-60 cursor-pointer"
                >
                  {busy ? "Signing In…" : "Sign In"}
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Academic Batch Selection Pills */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-dim">
                      Select Academic Batch
                    </label>
                    <span className="font-mono text-[10px] text-cyan font-medium">
                      {selectedIpmBatch === IPM1_BATCH_ID
                        ? "Class of 2031"
                        : selectedIpmBatch === IPM2_BATCH_ID
                        ? "Class of 2030"
                        : "Class of 2029"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {IPM_BATCHES.map((b) => {
                      const isSelected = selectedIpmBatch === b.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            setSelectedIpmBatch(b.id);
                            setBatchId(b.id);
                            if (b.id !== IPM1_BATCH_ID) {
                              setUseManualBatch(true);
                            } else {
                              setUseManualBatch(false);
                            }
                          }}
                          className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? "border-cyan/70 bg-cyan/10 text-ink shadow-sm ring-1 ring-cyan/40"
                              : "border-border bg-ground/60 text-dim hover:border-cyan/30 hover:text-ink"
                          }`}
                        >
                          <span className="font-display font-bold text-xs sm:text-sm tracking-tight">{b.code}</span>
                          <span className="font-mono text-[10px] text-faint mt-0.5">{b.years}</span>
                          {b.hasRoster ? (
                            <span className="mt-1 inline-flex items-center gap-0.5 text-[9px] font-mono font-medium text-cyan bg-cyan/15 px-1.5 py-0.5 rounded-full">
                              ⚡ Instant
                            </span>
                          ) : (
                            <span className="mt-1 inline-flex items-center gap-0.5 text-[9px] font-mono text-dim bg-surface px-1.5 py-0.5 rounded-full border border-border/60">
                              ✉️ Email OTP
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {useManualBatch ? (
                  <form onSubmit={handleSendVerification} className="flex flex-col gap-4">
                    {/* Batch Banner */}
                    <div className="rounded-xl border border-cyan/30 bg-cyan/5 p-3 flex items-center justify-between">
                      <div>
                        <div className="font-display font-bold text-xs sm:text-sm text-ink">
                          {selectedIpmBatch === IPM2_BATCH_ID
                            ? "IPM Batch 2 (2025–2030)"
                            : selectedIpmBatch === IPM3_BATCH_ID
                            ? "IPM Batch 3 (2024–2029)"
                            : "IPM Batch 1 (2026–2031)"}
                        </div>
                        <p className="font-mono text-[10px] text-dim">
                          Verification code will be sent to your official learner inbox.
                        </p>
                      </div>
                      <span className="rounded-full bg-cyan/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-cyan">
                        Verified Access
                      </span>
                    </div>

                    <div>
                      <label
                        htmlFor="name"
                        className="block mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-dim"
                      >
                        Full Name
                      </label>
                      <div className="relative flex items-center">
                        <User className="absolute left-3 size-4 text-faint pointer-events-none" />
                        <input
                          id="name"
                          type="text"
                          required
                          className={fieldClass}
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Enter your full name"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="regNoManual"
                        className="block mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-dim"
                      >
                        Roll No. / Student ID <span className="text-faint">(Optional)</span>
                      </label>
                      <div className="relative flex items-center">
                        <Fingerprint className="absolute left-3 size-4 text-faint pointer-events-none" />
                        <input
                          id="regNoManual"
                          type="text"
                          className={fieldClass}
                          value={regNo}
                          onChange={(e) => setRegNo(e.target.value.toUpperCase())}
                          placeholder={
                            selectedIpmBatch === IPM2_BATCH_ID
                              ? "e.g. 25U01"
                              : selectedIpmBatch === IPM3_BATCH_ID
                              ? "e.g. 24U01"
                              : "e.g. 26U01"
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="email"
                        className="block mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-dim"
                      >
                        Learner Email
                      </label>
                      <div className="relative flex items-center">
                        <Mail className="absolute left-3 size-4 text-faint pointer-events-none" />
                        <input
                          id="email"
                          type="email"
                          required
                          className={fieldClass}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your.email@learner.manipal.edu"
                        />
                      </div>
                      <p className="mt-1.5 flex items-center gap-1 font-mono text-[10px] text-faint">
                        <CheckCircle2 className="size-3 text-cyan shrink-0" /> Restrict to @learner.manipal.edu inbox
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="password"
                        className="block mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-dim"
                      >
                        Password
                      </label>
                      <div className="relative flex items-center">
                        <Lock className="absolute left-3 size-4 text-faint pointer-events-none" />
                        <input
                          id="password"
                          type="password"
                          required
                          className={fieldClass}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Create a password (min 6 characters)"
                        />
                      </div>
                    </div>

                    {showAdvancedHierarchy && (
                      <div className="flex flex-col gap-1 rounded-xl border border-border bg-ground/60 p-3">
                        <label className="block mb-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-dim">
                          Custom Batch Hierarchy
                        </label>
                        <HierarchyBatchSelector
                          batches={batches}
                          selectedBatchId={batchId}
                          onSelectBatchId={setBatchId}
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={busy}
                      className="mt-2 w-full rounded-xl bg-cyan py-3.5 text-sm font-bold text-ground border-b-2 border-cyan-600 shadow-md shadow-cyan/25 ring-1 ring-cyan/80 hover:bg-cyan/95 active:translate-y-0.5 active:border-b-0 transition-all focus:ring-2 focus:ring-cyan/50 disabled:opacity-60 cursor-pointer"
                    >
                      {busy ? "Sending Code…" : "Send Verification Code"}
                    </button>

                    <div className="pt-1 flex flex-col gap-1.5 text-center">
                      {selectedIpmBatch === IPM1_BATCH_ID && (
                        <button
                          type="button"
                          onClick={() => setUseManualBatch(false)}
                          className="font-mono text-[11px] text-cyan hover:underline cursor-pointer"
                        >
                          ← Back to Instant Verification
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowAdvancedHierarchy((v) => !v)}
                        className="font-mono text-[10px] text-faint hover:text-dim transition-colors cursor-pointer"
                      >
                        {showAdvancedHierarchy ? "Hide custom batch selector" : "Other program or custom hierarchy?"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleRosterRegister} className="flex flex-col gap-4">
                    <div>
                      <label
                        htmlFor="email"
                        className="block mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-dim"
                      >
                        Learner Email
                      </label>
                      <div className="relative flex items-center">
                        <Mail className="absolute left-3 size-4 text-faint pointer-events-none" />
                        <input
                          id="email"
                          type="email"
                          required
                          className={fieldClass}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your.email@learner.manipal.edu"
                        />
                      </div>
                      <p className="mt-1.5 flex items-center gap-1 font-mono text-[10px] text-faint">
                        <CheckCircle2 className="size-3 text-cyan shrink-0" /> Restrict to @learner.manipal.edu inbox
                      </p>
                    </div>

                    <div className="rounded-xl border border-border/80 bg-ground/60 p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan font-semibold">
                          <ShieldCheck className="size-3.5 text-cyan" /> Confidential Verification
                        </span>
                        <span className="font-mono text-[10px] text-dim">
                          Academic Verification
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor="dob"
                            className="block mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-dim"
                          >
                            Date of Birth
                          </label>
                          <div className="relative flex items-center">
                            <Calendar className="absolute left-3 size-4 text-faint pointer-events-none" />
                            <input
                              id="dob"
                              type="date"
                              required
                              className={fieldClass}
                              value={dob}
                              onChange={(e) => setDob(e.target.value)}
                            />
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor="regNo"
                            className="block mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-dim"
                          >
                            MAHE Roll No.
                          </label>
                          <div className="relative flex items-center">
                            <Fingerprint className="absolute left-3 size-4 text-faint pointer-events-none" />
                            <input
                              id="regNo"
                              type="text"
                              inputMode="numeric"
                              maxLength={12}
                              required
                              className={`${fieldClass} font-mono tracking-wider font-semibold`}
                              value={regNo}
                              onChange={(e) => setRegNo(e.target.value.replace(/\D/g, "").slice(0, 12))}
                              placeholder="e.g. 261612340020"
                            />
                          </div>
                        </div>
                      </div>

                      {candidate ? (
                        <div className="rounded-xl border border-cyan/40 bg-cyan/10 p-3 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="flex items-center justify-between border-b border-cyan/20 pb-2">
                            <div className="flex items-center gap-2">
                              <div className="size-7 rounded-lg bg-cyan/20 flex items-center justify-center text-cyan shrink-0">
                                <Sparkles className="size-3.5" />
                              </div>
                              <div>
                                <span className="font-display font-bold text-sm text-ink block">
                                  {toTitleCase(candidate.name)}
                                </span>
                                <span className="font-mono text-[10px] text-cyan">
                                  Verified Student Profile
                                </span>
                              </div>
                            </div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-400">
                              <CheckCircle2 className="size-3" /> Confirmed
                            </span>
                          </div>

                          {/* Institutional Breakdown Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-left font-mono text-[11px]">
                            <div className="rounded-lg bg-ground/80 p-2 border border-border/70">
                              <span className="text-[9px] uppercase tracking-wider text-faint block">University</span>
                              <span className="font-semibold text-ink truncate block">MAHE Manipal</span>
                            </div>
                            <div className="rounded-lg bg-ground/80 p-2 border border-border/70">
                              <span className="text-[9px] uppercase tracking-wider text-faint block">College</span>
                              <span className="font-semibold text-ink truncate block">TAPMI</span>
                            </div>
                            <div className="rounded-lg bg-ground/80 p-2 border border-border/70">
                              <span className="text-[9px] uppercase tracking-wider text-faint block">Course</span>
                              <span className="font-semibold text-ink truncate block">IPM (BBA/MBA)</span>
                            </div>
                            <div className="rounded-lg bg-ground/80 p-2 border border-border/70">
                              <span className="text-[9px] uppercase tracking-wider text-faint block">Batch</span>
                              <span className="font-semibold text-ink truncate block">2026–2031</span>
                            </div>
                            <div className="rounded-lg bg-ground/80 p-2 border border-border/70">
                              <span className="text-[9px] uppercase tracking-wider text-faint block">MAHE Roll No.</span>
                              <span className="font-bold text-cyan truncate block">{candidate.maheId}</span>
                            </div>
                            <div className="rounded-lg bg-ground/80 p-2 border border-border/70">
                              <span className="text-[9px] uppercase tracking-wider text-faint block">Section Roll</span>
                              <span className="font-bold text-ink truncate block">{candidate.rollNo}</span>
                            </div>
                          </div>
                        </div>
                      ) : regNo.length === 12 && dob ? (
                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 flex items-center gap-2 text-[11px] font-mono text-amber-300">
                          <AlertCircle className="size-3.5 shrink-0 text-amber-400" />
                          <span>No matching student record found for this DOB and 12-digit MAHE Roll No. combination.</span>
                        </div>
                      ) : (
                        <p className="font-mono text-[10px] text-faint">
                          💡 Enter your complete 12-digit MAHE Roll No. (e.g. 261612340020).
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="password"
                        className="block mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-dim"
                      >
                        Password
                      </label>
                      <div className="relative flex items-center">
                        <Lock className="absolute left-3 size-4 text-faint pointer-events-none" />
                        <input
                          id="password"
                          type="password"
                          required
                          className={fieldClass}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Create your Zenith password (min 6 characters)"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={busy || (regNo.length === 12 && dob && !candidate)}
                      className="mt-2 w-full rounded-xl bg-cyan py-3.5 text-sm font-bold text-ground border-b-2 border-cyan-600 shadow-md shadow-cyan/25 ring-1 ring-cyan/80 hover:bg-cyan/95 active:translate-y-0.5 active:border-b-0 transition-all focus:ring-2 focus:ring-cyan/50 disabled:opacity-50 cursor-pointer"
                    >
                      {busy
                        ? "Activating Account…"
                        : candidate
                        ? `Activate Account & Enter Zenith →`
                        : "Verify Identity & Register"}
                    </button>

                    <div className="pt-1 text-center">
                      <button
                        type="button"
                        onClick={() => setUseManualBatch(true)}
                        className="font-mono text-[11px] text-faint hover:text-dim transition-colors cursor-pointer"
                      >
                        Can't find your record in IPM 1 roster? Switch to email verification
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </>
        ) : (
          /* OTP Verification Screen */
          <div className="mt-4 flex flex-col items-center text-center">
            <div className="size-12 rounded-2xl bg-cyan/10 border border-cyan/30 flex items-center justify-center text-cyan mb-3">
              <KeyRound className="size-6" />
            </div>

            <h1 className="font-display text-2xl font-bold tracking-tight">
              Verify your email
            </h1>
            <p className="mt-1 font-mono text-xs text-dim max-w-sm">
              We sent a verification code to:
            </p>
            <div className="mt-1.5 inline-flex items-center gap-2 rounded-lg bg-ground px-3 py-1 font-mono text-xs text-cyan ring-1 ring-border">
              <span>{email}</span>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="text-dim hover:text-ink transition-colors"
                title="Edit email"
              >
                <Edit3 className="size-3.5" />
              </button>
            </div>

            <form onSubmit={handleVerifyOtp} className="mt-8 flex flex-col items-center gap-6 w-full">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={8}
                  value={otp}
                  onChange={(val) => {
                    setOtp(val);
                    if (val.replace(/\D/g, "").length === 8) {
                      // auto submit when full 8 digits entered
                      setTimeout(() => {
                        const form = document.getElementById("otp-form") as HTMLFormElement;
                        if (form) form.requestSubmit();
                      }, 150);
                    }
                  }}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                    <InputOTPSlot index={6} />
                    <InputOTPSlot index={7} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="w-full rounded-xl bg-ground/60 border border-border/80 p-3 text-left">
                <p className="font-mono text-[11px] text-dim leading-relaxed">
                  💡 <strong className="text-ink">Anti-Spam Notice:</strong> To ensure university delivery, our email contains <strong>no links</strong>. If you do not see it in your Inbox, please check your Outlook <strong className="text-cyan">Junk Email</strong> folder.
                </p>
              </div>

              <button
                type="submit"
                id="otp-form"
                disabled={busy || otp.replace(/\D/g, "").length < 6}
                className="w-full rounded-xl bg-cyan py-3.5 text-sm font-bold text-ground border-b-2 border-cyan-600 shadow-md shadow-cyan/25 ring-1 ring-cyan/80 hover:bg-cyan/95 active:translate-y-0.5 active:border-b-0 transition-all focus:ring-2 focus:ring-cyan/50 disabled:opacity-50 cursor-pointer"
              >
                {busy ? "Verifying…" : "Confirm & Enter Zenith"}
              </button>

              <div className="flex items-center justify-between w-full text-xs font-mono text-dim pt-2">
                <button
                  type="button"
                  onClick={() => handleSendVerification()}
                  disabled={resendCooldown > 0 || busy}
                  className="inline-flex items-center gap-1.5 text-dim hover:text-ink disabled:opacity-50 transition-colors"
                >
                  <RotateCw className={`size-3.5 ${busy ? "animate-spin" : ""}`} />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>

                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="text-dim hover:text-ink transition-colors"
                >
                  Change details
                </button>
              </div>
            </form>
          </div>
        )}

        {mode !== "verify" && (
          <p className="mt-6 text-center font-mono text-[11px] text-faint">
            {mode === "signin" ? (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="text-cyan hover:underline font-medium"
                >
                  Register here
                </button>
              </>
            ) : (
              <>
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="text-cyan hover:underline font-medium"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
