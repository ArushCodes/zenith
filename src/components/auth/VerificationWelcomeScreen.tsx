import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import {
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  GraduationCap,
  Hash,
  School,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface VerificationWelcomeScreenProps {
  fullName: string;
  rollNo: string;
  maheId?: string;
  university?: string;
  college?: string;
  course?: string;
  batchName?: string;
  onContinue: () => void;
}

export function VerificationWelcomeScreen({
  fullName,
  rollNo,
  maheId,
  university = "MAHE Manipal",
  college = "TAPMI",
  course = "IPM (BBA/MBA)",
  batchName = "Batch 2026–2031",
  onContinue,
}: VerificationWelcomeScreenProps) {
  const [countdown, setCountdown] = useState(5);
  const firstName = fullName.trim().split(" ")[0] || fullName;

  useEffect(() => {
    // Fire celebratory confetti bursts
    const end = Date.now() + 2000;
    const colors = ["#22d3ee", "#a855f7", "#38bdf8", "#ec4899", "#10b981", "#fbbf24"];

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.7 },
        colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }, []);

  useEffect(() => {
    if (countdown <= 0) {
      onContinue();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, onContinue]);

  return (
    <div className="relative min-h-[580px] w-full flex flex-col items-center justify-center p-4 sm:p-6 text-center overflow-hidden">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full bg-cyan/20 blur-[100px] animate-pulse" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-violet/20 blur-[120px]" />
      </div>

      {/* Biometric Shield / Pulse Indicator */}
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="relative mb-5 flex items-center justify-center"
      >
        <div className="absolute inset-0 rounded-full bg-cyan/30 blur-md animate-ping" />
        <div className="relative size-16 sm:size-20 rounded-2xl bg-gradient-to-br from-cyan/20 via-ground to-violet/20 border-2 border-cyan/50 shadow-xl shadow-cyan/20 flex items-center justify-center text-cyan backdrop-blur-md">
          <ShieldCheck className="size-8 sm:size-10 text-cyan animate-in zoom-in-50 duration-500" />
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="absolute -bottom-2 -right-2 rounded-full bg-emerald-500 p-1 text-ground shadow-lg ring-2 ring-ground"
        >
          <CheckCircle2 className="size-4 text-white" />
        </motion.div>
      </motion.div>

      {/* Status Pill */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-2.5 inline-flex items-center gap-2 rounded-full bg-cyan/10 px-3.5 py-1 border border-cyan/30 text-[11px] font-mono text-cyan uppercase tracking-widest"
      >
        <span className="size-1.5 rounded-full bg-cyan animate-ping" />
        Student Verified · Academic Registry
      </motion.div>

      {/* Name */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.35, type: "spring", stiffness: 200 }}
        className="space-y-0.5 max-w-lg"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-faint">
          Verified Student Profile
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-ink drop-shadow-sm">
          {fullName}
        </h2>
      </motion.div>

      {/* Full Institutional & Academic Breakdown Grid */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-5 w-full max-w-lg grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5 text-left"
      >
        {/* University */}
        <div className="rounded-xl border border-border/80 bg-ground/80 p-2.5 shadow-sm">
          <div className="flex items-center gap-1.5 text-faint font-mono text-[10px] uppercase tracking-wider mb-1">
            <Building2 className="size-3 text-cyan" /> University
          </div>
          <div className="font-display font-semibold text-xs text-ink truncate">
            {university}
          </div>
        </div>

        {/* College / School */}
        <div className="rounded-xl border border-border/80 bg-ground/80 p-2.5 shadow-sm">
          <div className="flex items-center gap-1.5 text-faint font-mono text-[10px] uppercase tracking-wider mb-1">
            <School className="size-3 text-cyan" /> College
          </div>
          <div className="font-display font-semibold text-xs text-ink truncate">
            {college}
          </div>
        </div>

        {/* Course / Program */}
        <div className="rounded-xl border border-border/80 bg-ground/80 p-2.5 shadow-sm">
          <div className="flex items-center gap-1.5 text-faint font-mono text-[10px] uppercase tracking-wider mb-1">
            <GraduationCap className="size-3 text-cyan" /> Course
          </div>
          <div className="font-display font-semibold text-xs text-ink truncate">
            {course}
          </div>
        </div>

        {/* Batch / Cohort */}
        <div className="rounded-xl border border-border/80 bg-ground/80 p-2.5 shadow-sm">
          <div className="flex items-center gap-1.5 text-faint font-mono text-[10px] uppercase tracking-wider mb-1">
            <Calendar className="size-3 text-cyan" /> Batch
          </div>
          <div className="font-display font-semibold text-xs text-ink truncate">
            {batchName}
          </div>
        </div>

        {/* MAHE Roll No */}
        <div className="rounded-xl border border-cyan/30 bg-cyan/10 p-2.5 shadow-sm">
          <div className="flex items-center gap-1.5 text-cyan font-mono text-[10px] uppercase tracking-wider mb-1">
            <Hash className="size-3 text-cyan" /> MAHE Roll No.
          </div>
          <div className="font-mono font-bold text-xs text-cyan truncate">
            {maheId || "261612340020"}
          </div>
        </div>

        {/* Roll Number */}
        <div className="rounded-xl border border-border/80 bg-ground/80 p-2.5 shadow-sm">
          <div className="flex items-center gap-1.5 text-faint font-mono text-[10px] uppercase tracking-wider mb-1">
            <GraduationCap className="size-3 text-cyan" /> Section Roll
          </div>
          <div className="font-mono font-bold text-xs text-ink truncate">
            {rollNo}
          </div>
        </div>
      </motion.div>

      {/* Cool Ass Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mt-4 rounded-2xl border border-border/80 bg-ground/60 backdrop-blur-md p-4 max-w-lg w-full shadow-lg text-left"
      >
        <div className="flex items-start gap-3">
          <div className="size-8 rounded-lg bg-cyan/20 flex items-center justify-center text-cyan shrink-0 mt-0.5">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h3 className="font-display text-sm sm:text-base font-bold text-ink">
              Welcome to Zenith, {firstName}.
            </h3>
            <p className="mt-0.5 text-xs text-dim leading-relaxed font-body">
              Your semester command center is ready. Timetable synced, deadlines armed, attendance safe.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Launch CTA & Auto Countdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="mt-5 w-full max-w-lg space-y-2"
      >
        <button
          type="button"
          onClick={onContinue}
          className="group w-full rounded-xl bg-cyan py-3.5 px-6 font-display text-sm font-bold text-ground shadow-lg shadow-cyan/25 ring-1 ring-cyan/80 border-b-2 border-cyan-600 hover:bg-cyan/95 transition-all flex items-center justify-center gap-2 hover:shadow-cyan/40 active:translate-y-0.5 active:border-b-0 cursor-pointer"
        >
          <span>Enter Zenith Now</span>
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </button>

        <p className="font-mono text-[11px] text-faint">
          Taking you to your dashboard in {countdown}s…
        </p>
      </motion.div>
    </div>
  );
}
