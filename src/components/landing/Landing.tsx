import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Lock,
  LogIn,
  Moon,
  Radio,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
  UserCheck,
  UserPlus,
  ListFilter,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

const ease = [0.16, 1, 0.3, 1] as const;

interface LandingProps {
  onPreview?: () => void;
}

export function Landing({ onPreview }: LandingProps = {}) {
  const { theme, toggle: toggleTheme } = useTheme();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-ground font-body text-ink selection:bg-cyan/30 selection:text-white pb-24 sm:pb-12">
      {/* Dynamic Aurora Ambient Background (Hardware Accelerated, 0 Main-Thread JS) */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden transform-gpu" aria-hidden="true">
        <div className="aurora-a absolute -left-20 -top-32 h-[520px] w-[520px] sm:w-[680px] rounded-full bg-cyan/20 blur-[130px]" />
        <div className="aurora-b absolute -right-24 top-[240px] h-[480px] w-[480px] sm:w-[620px] rounded-full bg-violet-600/15 blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />
      </div>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-ground/80 backdrop-blur-2xl transition-all">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-8">
          <Link to="/" tabIndex={-1} className="flex items-center gap-2.5 group">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-cyan-600 to-cyan font-display text-[15px] font-bold text-ground shadow-[0_0_20px_rgba(2,132,199,0.35)] transition-transform group-hover:scale-105">
              Z
            </span>
            <div className="min-w-0 leading-tight">
              <span className="block font-display text-[15px] font-bold tracking-tight sm:text-base text-ink group-hover:text-cyan transition-colors">
                Zenith
              </span>
              <span className="block font-mono text-[9px] uppercase tracking-[0.2em] text-faint">
                TAPMI Manipal
              </span>
            </div>
          </Link>

          {/* Prominent Header Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Light mode" : "Dark mode"}
              className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-surface text-dim transition-colors hover:border-cyan/40 hover:text-ink cursor-pointer shadow-sm"
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>

            {onPreview && (
              <button
                type="button"
                onClick={onPreview}
                className="hidden sm:inline-flex rounded-xl border border-border/60 bg-surface/50 hover:bg-surface px-3 py-2 text-xs font-mono text-dim hover:text-ink transition-colors cursor-pointer"
              >
                Guest Demo
              </button>
            )}

            <Link
              to="/auth"
              search={{ mode: "signin" }}
              className="rounded-xl border border-border bg-surface/80 hover:bg-surface px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-ink shadow-sm hover:scale-[1.02] active:translate-y-0.5 transition-all cursor-pointer"
            >
              Log In
            </Link>

            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="relative group overflow-hidden rounded-xl bg-cyan px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold text-ground border-b-2 border-cyan-600 shadow-md shadow-cyan/25 hover:bg-cyan/95 active:translate-y-0.5 active:border-b-0 transition-all cursor-pointer"
            >
              <span className="relative z-10 flex items-center gap-1.5">
                <UserPlus className="size-3.5" />
                Sign Up
              </span>
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform ease-in-out" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-6xl px-4 sm:px-8">
        {/* HERO SECTION — Optimized for instant LCP paint and zero layout shift */}
        <section className="pt-10 sm:pt-20 pb-12 sm:pb-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Left: Copy & Giant Dual CTA */}
            <div className="text-center lg:text-left flex flex-col items-center lg:items-start">
              {/* Pill badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan/40 bg-cyan/10 px-3.5 py-1.5 text-[11px] font-mono uppercase tracking-[0.16em] text-cyan backdrop-blur-md shadow-sm">
                <Sparkles className="size-3.5 text-cyan animate-pulse" />
                <span>The TAPMI Student Board</span>
              </div>

              {/* Punchy Headline (LCP Anchor) */}
              <h1 className="mt-5 font-display text-4xl sm:text-6xl lg:text-[62px] font-extrabold leading-[1.06] tracking-tight text-balance">
                Never miss a deadline, class or attendance mark.
              </h1>

              {/* Subtitle */}
              <p className="mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-dim text-balance">
                The private dashboard for your batch. Quizzes, assignments, exams, live timetable, and your attendance percentages — maintained live by your class representatives.
              </p>

              {/* HERO DUAL CALL-TO-ACTION (Sign Up & Log In) */}
              <div className="mt-8 w-full max-w-md flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                {/* SIGN UP BUTTON (Primary & High Visibility) */}
                <Link
                  to="/auth"
                  search={{ mode: "signup" }}
                  className="relative group flex-1 inline-flex items-center justify-center gap-2.5 rounded-2xl bg-cyan px-6 py-4 text-base font-bold text-ground border-b-4 border-cyan-600 shadow-xl shadow-cyan/30 hover:bg-cyan/95 active:translate-y-1 active:border-b-0 transition-all cursor-pointer"
                >
                  <UserPlus className="size-5 shrink-0" />
                  <span>Create Account</span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>

                {/* LOG IN BUTTON (Secondary) */}
                <Link
                  to="/auth"
                  search={{ mode: "signin" }}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-border/90 bg-surface px-6 py-4 text-base font-bold text-ink shadow-sm hover:bg-surface2 active:translate-y-0.5 transition-all cursor-pointer backdrop-blur-md"
                >
                  <LogIn className="size-4 text-dim" />
                  <span>Sign In</span>
                </Link>
              </div>

              {/* Anti-confusion helper & trust info */}
              <div className="mt-4 flex flex-wrap items-center justify-center lg:justify-start gap-3 font-mono text-[11px] text-faint">
                <span className="flex items-center gap-1.5 text-cyan/90">
                  <CheckCircle2 className="size-3.5 text-cyan" /> Free for all students
                </span>
                <span className="text-border">•</span>
                <span className="flex items-center gap-1.5">
                  <Lock className="size-3 text-dim" /> @learner.manipal.edu only
                </span>
              </div>
            </div>

            {/* Right: Live Mockup Widget (Server-Rendered for instant crisp visual) */}
            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              {/* Glass container */}
              <div className="relative rounded-3xl border border-border/80 bg-surface/85 p-5 sm:p-6 shadow-[0_25px_70px_-20px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                {/* Header of widget */}
                <div className="flex items-center justify-between border-b border-border/60 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-red-500/80" />
                    <span className="size-2.5 rounded-full bg-amber-500/80" />
                    <span className="size-2.5 rounded-full bg-emerald-500/80" />
                    <span className="ml-2 font-mono text-[11px] font-medium text-dim">
                      TAPMI · Zenith Board
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Live Sync
                  </span>
                </div>

                {/* 1. Live Class Tracker */}
                <div className="mt-4 rounded-2xl border border-cyan/30 bg-gradient-to-br from-cyan/15 to-transparent p-4">
                  <div className="flex items-center justify-between text-[11px] font-mono text-cyan">
                    <span className="flex items-center gap-1.5 font-bold tracking-wider uppercase">
                      <Radio className="size-3.5 text-cyan animate-pulse" />
                      Class In Session
                    </span>
                    <span className="text-dim">Room 204 • Academic Block</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div>
                      <h4 className="font-display text-base font-bold text-ink">
                        Macroeconomics II
                      </h4>
                      <p className="font-mono text-xs text-dim">Prof. S. Ranganathan</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xs font-semibold text-cyan">Ends in 25m</span>
                      <p className="font-mono text-[10px] text-faint">10:00 – 11:15 AM</p>
                    </div>
                  </div>
                </div>

                {/* 2. Upcoming Deadlines — Sorted by recency across any event */}
                <div className="mt-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between rounded-xl border border-border/70 bg-ground/90 px-3.5 py-2.5 transition-transform hover:scale-[1.01]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="relative flex size-2 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex size-2 rounded-full bg-rose-400" />
                      </span>
                      <div className="truncate">
                        <p className="font-display text-xs font-semibold truncate">
                          Financial Accounting Quiz 2
                        </p>
                        <p className="font-mono text-[10px] text-faint">Tomorrow • 09:30 AM</p>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] font-bold text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded-md shrink-0 ring-1 ring-rose-400/20">
                      14h left
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-border/70 bg-ground/90 px-3.5 py-2.5 transition-transform hover:scale-[1.01]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="size-2 rounded-full bg-cyan shrink-0" />
                      <div className="truncate">
                        <p className="font-display text-xs font-semibold truncate">
                          Marketing Strategy Deck
                        </p>
                        <p className="font-mono text-[10px] text-faint">Friday • 23:59</p>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] font-bold text-cyan bg-cyan/10 px-2 py-0.5 rounded-md shrink-0 ring-1 ring-cyan/20">
                      3 days
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-border/70 bg-ground/90 px-3.5 py-2.5 transition-transform hover:scale-[1.01]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="size-2 rounded-full bg-violet-400 shrink-0" />
                      <div className="truncate">
                        <p className="font-display text-xs font-semibold truncate">
                          Macroeconomics Midterm Exam
                        </p>
                        <p className="font-mono text-[10px] text-faint">Next Mon • 10:00 AM</p>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] font-bold text-violet-400 bg-violet-400/10 px-2 py-0.5 rounded-md shrink-0 ring-1 ring-violet-400/20">
                      6 days
                    </span>
                  </div>
                </div>

                {/* 3. Attendance Gauge */}
                <div className="mt-3 flex items-center justify-between rounded-2xl border border-border/70 bg-surface2/80 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-xl bg-cyan/15 text-cyan">
                      <TrendingUp className="size-5" />
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-dim">
                        Batch Attendance
                      </p>
                      <p className="font-display text-sm font-bold text-ink">92.4% Average</p>
                    </div>
                  </div>
                  <div className="text-right font-mono text-[11px]">
                    <span className="font-bold text-emerald-400">Safe Margin</span>
                    <p className="text-faint text-[10px]">7 bunks buffer</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES GRID (Optimized with content-visibility for off-screen performance) */}
        <section className="py-12 border-t border-border/60 [content-visibility:auto] [contain-intrinsic-size:1px_380px]">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              Built specifically for how TAPMI runs.
            </h2>
            <p className="mt-2 text-sm text-dim">
              No WhatsApp chaos, no missed email chains. Everything synchronized directly to your batch.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: ListFilter,
                title: "Deadline Tracker",
                desc: "Quizzes, assignments, and presentations sorted in real time with urgent countdown timers.",
              },
              {
                icon: CalendarClock,
                title: "Live Timetable",
                desc: "Instant classroom numbers, session times, and faculty info with automated current-class highlights.",
              },
              {
                icon: UserCheck,
                title: "Smart Attendance",
                desc: "Never risk falling below 75%. Know your exact allowed absentee buffer per course.",
              },
              {
                icon: ShieldCheck,
                title: "CR & Mod Verified",
                desc: "Accurate information verified by your elected class reps. Zero rumor mill spam.",
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-20px" }}
                transition={{ duration: 0.35, delay: i * 0.05, ease }}
                whileHover={{ y: -4, borderColor: "rgba(56,189,248,0.4)" }}
                className="rounded-2xl border border-border/80 bg-surface/80 p-5 backdrop-blur-sm transition-all"
              >
                <div className="grid size-10 place-items-center rounded-xl bg-cyan/10 text-cyan mb-4">
                  <feature.icon className="size-5" />
                </div>
                <h3 className="font-display text-base font-bold text-ink">{feature.title}</h3>
                <p className="mt-1.5 text-xs text-dim leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 4-STEP ACADEMIC HIERARCHY */}
        <section className="py-12 border-t border-border/60 [content-visibility:auto] [contain-intrinsic-size:1px_280px]">
          <div className="rounded-3xl border border-cyan/30 bg-gradient-to-b from-cyan/10 via-surface/80 to-surface p-6 sm:p-10 backdrop-blur-xl">
            <div className="max-w-xl">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan font-bold">
                Batch-Private Isolation
              </span>
              <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight">
                Strict 4-level institutional hierarchy.
              </h2>
              <p className="mt-2 text-sm text-dim">
                Sign up with your official ID, choose your batch, and your board is instantly customized to your classes.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-center text-xs">
              {[
                { level: "1. Institute", name: "MAHE Manipal" },
                { level: "2. School", name: "TAPMI" },
                { level: "3. Program", name: "IPM" },
                { level: "4. Batch", name: "All Cohorts" },
              ].map((h) => (
                <div
                  key={h.name}
                  className="rounded-xl border border-border/80 bg-ground/80 p-3.5 flex flex-col justify-center"
                >
                  <span className="text-[10px] text-faint uppercase">{h.level}</span>
                  <span className="mt-1 font-display font-bold text-cyan text-sm sm:text-base">
                    {h.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BOTTOM FINAL CALL-TO-ACTION */}
        <section className="mt-8 mb-8 rounded-3xl border border-border bg-gradient-to-b from-surface to-ground p-8 sm:p-12 text-center relative overflow-hidden [content-visibility:auto] [contain-intrinsic-size:1px_300px]">
          <div className="relative z-10 max-w-xl mx-auto">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">
              Ready to take control of your semester?
            </h2>
            <p className="mt-3 text-sm sm:text-base text-dim">
              Join your fellow TAPMI batchmates. Sign up in under 60 seconds with your learner email.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-cyan px-7 py-3.5 text-sm font-bold text-ground border-b-2 border-cyan-600 shadow-lg shadow-cyan/25 hover:bg-cyan/95 active:translate-y-0.5 active:border-b-0 transition-all cursor-pointer"
              >
                <UserPlus className="size-4" />
                <span>Create Student Account</span>
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signin" }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border-2 border-border bg-surface px-7 py-3.5 text-sm font-bold text-ink hover:bg-surface2 active:translate-y-0.5 transition-all cursor-pointer shadow-sm"
              >
                <LogIn className="size-4 text-dim" />
                <span>Sign In</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-border/60 py-8 px-4 text-center font-mono text-[11px] text-faint">
        <p>Zenith · TAPMI Manipal · Created by students for students</p>
      </footer>

      {/* MOBILE STICKY FLOATING BOTTOM BAR (Never miss Sign Up or Log In) */}
      <div className="fixed bottom-0 inset-x-0 z-40 sm:hidden border-t border-border/80 bg-ground/90 p-3 backdrop-blur-2xl shadow-2xl">
        <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
          <Link
            to="/auth"
            search={{ mode: "signin" }}
            className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-border bg-surface py-3 text-xs font-bold text-ink active:translate-y-0.5 transition-all shadow-sm cursor-pointer"
          >
            <LogIn className="size-3.5 text-dim" />
            <span>Sign In</span>
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-cyan py-3 text-xs font-bold text-ground border-b-2 border-cyan-600 shadow-md shadow-cyan/25 active:translate-y-0.5 active:border-b-0 transition-all cursor-pointer"
          >
            <UserPlus className="size-3.5" />
            <span>Create Account</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
