import { useState, type FormEvent, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Fingerprint,
  Loader2,
  LockKeyhole,
  Mail,
  Moon,
  Sun,
} from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/backend";
import {
  registerWithRoster,
  requestPasswordReset,
  resolveLoginIdentifier,
} from "@/lib/auth.functions";
import { IPM_BATCHES, IPM1_BATCH_ID } from "@/lib/roster.data";
import { useTheme } from "@/hooks/use-theme";
import { VerificationWelcomeScreen } from "@/components/auth/VerificationWelcomeScreen";

type Mode = "signin" | "signup" | "forgot" | "reset" | "welcome";
export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode?: "signin" | "signup" | "forgot" } => ({
    mode:
      search["mode"] === "signup" ? "signup" : search["mode"] === "forgot" ? "forgot" : "signin",
  }),
  head: () => ({
    meta: [{ title: "TAPMI student sign-in — Zenith" }, { name: "robots", content: "noindex" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [mode, setMode] = useState<Mode>(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [regNo, setRegNo] = useState("");
  const [dob, setDob] = useState("");
  const [batch, setBatch] = useState(IPM1_BATCH_ID);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [welcome, setWelcome] = useState<Awaited<ReturnType<typeof registerWithRoster>> | null>(
    null,
  );
  const [error, setError] = useState("");

  const changeMode = (next: Mode) => {
    setMode(next);
    setError("");
    setPassword("");
    setConfirm("");
    setOtp("");
  };
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signin") {
        const clean = email.trim().toLowerCase();
        // Email sign-in needs no privileged lookup. Roll/MAHE sign-in is rate limited.
        const address = clean.includes("@")
          ? clean
          : (await resolveLoginIdentifier({ data: { identifier: clean } })).email;
        const { error: authError } = await db.auth.signInWithPassword({ email: address, password });
        if (authError)
          throw new Error("Sign-in failed. Check your email or roll number and password.");
        await navigate({ to: "/", replace: true });
      } else if (mode === "signup") {
        if (!IPM_BATCHES.find((item) => item.id === batch)?.hasRoster)
          throw new Error("Registration will open once your batch roster is available.");
        if (password !== confirm) throw new Error("Passwords do not match.");
        const result = await registerWithRoster({
          data: { email: email.trim(), password, regNo, dob, batchId: batch },
        });
        const { error: signInError } = await db.auth.signInWithPassword({
          email: result.email,
          password,
        });
        if (signInError) {
          changeMode("signin");
          toast.success("Account created. Please sign in.");
          return;
        }
        setWelcome(result);
        setMode("welcome");
        setPassword("");
        setConfirm("");
      } else if (mode === "forgot") {
        await requestPasswordReset({ data: { email: email.trim() } });
        setMode("reset");
        toast.success("If this account exists, a recovery code has been sent.");
      } else if (mode === "reset") {
        if (password !== confirm) throw new Error("Passwords do not match.");
        const { data: verified, error: verifyError } = await db.auth.verifyOtp({
          email: email.trim().toLowerCase(),
          token: otp,
          type: "recovery",
        });
        if (verifyError || !verified.session)
          throw new Error("Recovery code is invalid or expired.");
        await db.auth.setSession(verified.session);
        const { error: updateError } = await db.auth.updateUser({ password });
        if (updateError) throw updateError;
        toast.success("Password updated.");
        await navigate({ to: "/", replace: true });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const titles = {
    signin: "Sign in to your batch.",
    signup: "Register your student ID.",
    forgot: "Recover your account.",
    reset: "Reset your password.",
    welcome: "You're all set.",
  };
  return (
    <div className="auth-shell">
      <aside className="auth-story">
        <Link to="/" className="zenith-brand">
          <span className="brand-symbol">z</span> zenith<span className="brand-period">.</span>
        </Link>
        <div className="auth-story-copy">
          <span className="workspace-eyebrow">TAPMI MANIPAL · STUDENT BOARD</span>
          <h1>
            Today’s classes.
            <br />
            Your batch’s deadlines.
          </h1>
          <p>
            Check your classroom, track course-wise misses, and find quizzes, assignments and exam
            dates for your batch.
          </p>
          <div className="auth-orbit" aria-hidden="true">
            <span className="orbit-core">z.</span>
            <span className="orbit-label orbit-label-one">Timetable</span>
            <span className="orbit-label orbit-label-two">Attendance</span>
            <span className="orbit-label orbit-label-three">Deadlines</span>
          </div>
        </div>
        <p className="auth-story-footer">
          TAPMI MANIPAL <span>MAHE · IPM & MBA</span>
        </p>
      </aside>
      <main className="auth-main">
        <div className="auth-topbar">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-dim">
            <ArrowLeft size={15} /> Back home
          </Link>
          <button type="button" onClick={toggle} aria-label="Toggle theme" className="icon-button">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
        <div className="auth-form-wrap">
          {mode === "welcome" && welcome ? (
            <VerificationWelcomeScreen
              fullName={welcome.fullName}
              rollNo={welcome.rollNo}
              maheId={welcome.maheId}
              batchName={welcome.batchName}
              university={welcome.university}
              college={welcome.college}
              course={welcome.course}
              onContinue={() => void navigate({ to: "/" })}
            />
          ) : (
            <>
              <span className="workspace-eyebrow">YOUR ZENITH ACCOUNT</span>
              <h2>{titles[mode]}</h2>
              <p className="auth-subtitle">
                {mode === "signin"
                  ? "Use your learner email, roll number or MAHE ID."
                  : mode === "signup"
                    ? "Verify your student record. No signup email code needed."
                    : mode === "forgot"
                      ? "We'll send a recovery code to your registered learner email."
                      : "Enter your recovery code and choose a new password."}
              </p>
              {(mode === "signin" || mode === "signup") && (
                <div className="auth-mode-switch">
                  <button
                    type="button"
                    aria-pressed={mode === "signin"}
                    onClick={() => changeMode("signin")}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    aria-pressed={mode === "signup"}
                    onClick={() => changeMode("signup")}
                  >
                    Create account
                  </button>
                </div>
              )}
              <form onSubmit={submit} className="space-y-5">
                {mode === "signup" && (
                  <>
                    <fieldset>
                      <legend className="auth-label">Your batch</legend>
                      <div className="auth-batches">
                        {IPM_BATCHES.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            aria-pressed={batch === item.id}
                            onClick={() => setBatch(item.id)}
                          >
                            <strong>{item.code}</strong>
                            <span>{item.years}</span>
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    {IPM_BATCHES.find((item) => item.id === batch)?.code.startsWith("MBA") && (
                      <p className="auth-notice">
                        Your administrator must add your official student record before you
                        register. Use the learner email listed in that record.
                      </p>
                    )}
                    {!IPM_BATCHES.find((item) => item.id === batch)?.hasRoster && (
                      <p className="auth-notice">
                        Your batch roster is coming soon. Existing accounts can still sign in.
                      </p>
                    )}
                    <Field label="MAHE ID" icon={<Fingerprint size={17} />}>
                      <input
                        required
                        inputMode="numeric"
                        maxLength={12}
                        pattern="[0-9]{12}"
                        value={regNo}
                        onChange={(event) =>
                          setRegNo(event.target.value.replace(/\D/g, "").slice(0, 12))
                        }
                        placeholder="Your 12-digit university ID"
                      />
                    </Field>
                    <Field label="Date of birth">
                      <input
                        required
                        type="date"
                        max={new Date().toISOString().slice(0, 10)}
                        value={dob}
                        onChange={(event) => setDob(event.target.value)}
                      />
                    </Field>
                  </>
                )}
                <Field
                  label={mode === "signin" ? "Learner email or roll number" : "Learner email"}
                  icon={<Mail size={17} />}
                >
                  <input
                    required
                    type={mode === "signin" ? "text" : "email"}
                    autoComplete="username"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={
                      mode === "signin"
                        ? "Your email, roll number or MAHE ID"
                        : "you@learner.manipal.edu"
                    }
                    readOnly={mode === "reset"}
                  />
                </Field>
                {mode === "reset" && (
                  <Field label="Email recovery code">
                    <input
                      required
                      inputMode="numeric"
                      pattern="[0-9]{6,8}"
                      maxLength={8}
                      value={otp}
                      onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                      placeholder="Code from your inbox"
                      autoComplete="one-time-code"
                    />
                  </Field>
                )}
                {mode !== "forgot" && (
                  <Field
                    label={mode === "reset" ? "New password" : "Password"}
                    icon={<LockKeyhole size={17} />}
                  >
                    <input
                      required
                      type="password"
                      minLength={mode === "signin" ? 1 : 8}
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={
                        mode === "signin" ? "Enter your password" : "At least 8 characters"
                      }
                    />
                  </Field>
                )}
                {(mode === "signup" || mode === "reset") && (
                  <Field label="Confirm password" icon={<LockKeyhole size={17} />}>
                    <input
                      required
                      type="password"
                      minLength={8}
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(event) => setConfirm(event.target.value)}
                      placeholder="Enter your password again"
                    />
                  </Field>
                )}
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => changeMode("forgot")}
                    className="text-sm text-cyan hover:underline"
                  >
                    Forgot your password?
                  </button>
                )}
                {error && (
                  <p role="alert" className="auth-error">
                    {error}
                  </p>
                )}
                <button
                  disabled={
                    busy ||
                    (mode === "signup" && !IPM_BATCHES.find((item) => item.id === batch)?.hasRoster)
                  }
                  className="primary-button w-full"
                  type="submit"
                >
                  {busy ? <Loader2 size={17} className="animate-spin" /> : null}
                  {busy
                    ? "Just a moment…"
                    : mode === "signin"
                      ? "Sign in"
                      : mode === "signup"
                        ? "Verify & create account"
                        : mode === "forgot"
                          ? "Send recovery code"
                          : "Save new password"}
                  {!busy && <ArrowUpRight size={17} />}
                </button>
              </form>
              {(mode === "forgot" || mode === "reset") && (
                <button
                  type="button"
                  onClick={() => changeMode("signin")}
                  className="mt-6 text-sm text-dim hover:text-ink"
                >
                  Back to sign in
                </button>
              )}
              <p className="auth-assurance">
                <CheckCircle2 size={14} /> Access follows your verified student record.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="auth-field">
      <span className="auth-label">{label}</span>
      <span className={icon ? "auth-input has-icon" : "auth-input"}>
        {icon}
        {children}
      </span>
    </label>
  );
}
