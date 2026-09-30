import type { AttendanceMark, ClassSession } from "@/lib/batches";
import { sessionLabel, subjectCanonicalKey } from "@/lib/courses";

/** Planned number of sessions per subject:
 *  Rule: 1 Credit = 8 sessions (3-credit = 24 sessions, 2-credit = 16 sessions, 1-credit = 8 sessions).
 *  Never sourced from Registro timetable. */
export const COURSE_CREDITS: Record<string, number> = {
  psychology: 3,
  sociology: 3,
  mathematics: 3,
  maths: 3,
  statistics: 3,
  english: 3,
  spreadsheets: 2,
  ai: 2,
  "team building": 1,
  "team-building": 1,
  economics: 3,
  accounting: 3,
  marketing: 3,
  finance: 3,
  operations: 3,
  law: 3,
  python: 2,
  analytics: 2,
};

export const PLANNED_SESSIONS: Record<string, number> = {
  psychology: 24,
  sociology: 24,
  english: 24,
  mathematics: 24,
  maths: 24,
  statistics: 24,
  spreadsheets: 16,
  ai: 16,
  "team building": 8,
  "team-building": 8,
  economics: 24,
  accounting: 24,
  marketing: 24,
  finance: 24,
  operations: 24,
  law: 24,
  python: 16,
  analytics: 16,
};

export function subjectKeyOf(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Determine credits for any course (1, 2, or 3). Defaults to 3 credits for standard IPM core courses. */
export function courseCredits(subject: string): number {
  const key = subjectKeyOf(subject);
  if (COURSE_CREDITS[key]) return COURSE_CREDITS[key];
  for (const [k, c] of Object.entries(COURSE_CREDITS)) {
    if (key.includes(k)) return c;
  }
  if (key.includes("team") || key.includes("workshop") || key.includes("1 credit")) return 1;
  if (key.includes("spreadsheet") || key.includes("ai") || key.includes("lab") || key.includes("2 credit")) return 2;
  return 3;
}

/** Nicely shortened label for tight mobile layouts. */
export function shortSubject(name: string, max = 18) {
  const clean = name.replace(/\s*-\s*S\d+\s*-\s*.*$/i, "").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/** Planned total for a subject: strictly 8, 16, or 24 based on credits (never from Registro). */
export function plannedFor(subject: string, _fallback?: number): number {
  return courseCredits(subject) * 8;
}

export type Band = "good" | "warn" | "risk";

export function bandFor(pct: number): Band {
  if (pct >= SAFE_LINE) return "good";
  if (pct >= HARD_LINE) return "warn";
  return "risk";
}

/* ---------------------------------------------------------------------------
 * IPM handbook policy
 * ------------------------------------------------------------------------ */

/** 85%+ = no penalty, 70–85% = 0.5 grade points per session missed below 85%,
 *  below 70% = automatic Incomplete. */
export const SAFE_LINE = 85;
export const HARD_LINE = 70;
/** TAPMI 75% Minimum Attendance Debarment Line */
export const DEBARMENT_LINE = 75;

/**
 * Calculates consecutive upcoming sessions needed to recover to >= 75% attendance.
 * Formula: (A + X) / (H + X) >= 0.75  =>  4A + 4X >= 3H + 3X  =>  X >= 3H - 4A
 */
export function consecutiveNeededFor75(held: number, attended: number): number {
  if (held <= 0) return 0;
  const currentPct = (attended / held) * 100;
  if (currentPct >= DEBARMENT_LINE) return 0;
  return Math.max(0, Math.ceil(3 * held - 4 * attended));
}

/**
 * Calculates safe classes that can be missed before falling below 75% attendance.
 * Formula: A / (H + Y) >= 0.75  =>  4A >= 3H + 3Y  =>  3Y <= 4A - 3H  =>  Y <= floor((4A - 3H) / 3)
 */
export function safeMissBufferFor75(held: number, attended: number): number {
  if (held <= 0) return 0;
  const currentPct = (attended / held) * 100;
  if (currentPct < DEBARMENT_LINE) return 0;
  return Math.max(0, Math.floor((4 * attended) / 3 - held));
}

/** Personal Leave: personal / domestic / medical. Capped at 15% of sessions. */
export const PL_CAP_PCT = 15;
/** Institutional Leave: approved extracurricular / placement duty. 15% by
 *  default, extendable up to 30% when Personal Leave is left unused. */
export const IL_CAP_PCT = 15;
/** Absolute ceiling on PL + IL combined — beyond it the grade is Incomplete. */
export const TOTAL_CAP_PCT = 30;
/** Grade points lost per session missed below the 85% bracket. */
export const PENALTY_PER_SESSION = 0.5;
/** Continuous absence beyond this many calendar days forces a withdrawal
 *  unless the Director has approved it. */
export const CONTINUOUS_ABSENCE_DAYS = 13;

export type LeaveType = "personal" | "institutional";

export const LEAVE_COPY: Record<LeaveType, { short: string; label: string; detail: string }> = {
  personal: {
    short: "PL",
    label: "Personal leave",
    detail: "Personal, domestic or medical. No exam or quiz is ever re-conducted for it.",
  },
  institutional: {
    short: "IL",
    label: "Institutional leave",
    detail: "Approved extracurricular or placement duty, signed off by the institute.",
  },
};

export const BAND_COPY: Record<Band, { label: string; detail: string }> = {
  good: {
    label: "No penalty",
    detail: "85% or above — fully eligible for every exam, no grade deduction.",
  },
  warn: {
    label: "Grade deduction",
    detail:
      "70–85% — 0.5 grade points are cut for every session missed below the 85% mark.",
  },
  risk: {
    label: "Incomplete (I)",
    detail:
      "Below 70% — barred from the End-Term and Make-Up exams; the course must be repeated next year.",
  },
};

/** Leave budgets for a course, straight from the handbook percentages. */
export function leaveCaps(planned: number, personalUsed = 0) {
  const total = Math.floor((planned * TOTAL_CAP_PCT) / 100);
  const personal = Math.floor((planned * PL_CAP_PCT) / 100);
  const institutionalBase = Math.floor((planned * IL_CAP_PCT) / 100);
  // Unused Personal Leave can be handed to Institutional Leave, up to the 30% wall.
  const institutional = Math.min(total, Math.max(institutionalBase, total - personalUsed));
  return { total, personal, institutionalBase, institutional };
}

/** Allowed misses: strictly 1 class per credit (1-credit = 1, 2-credit = 2, 3-credit = 3). */
export function safeMisses(plannedOrCredits: number): number {
  if (plannedOrCredits <= 4) {
    return Math.max(1, plannedOrCredits);
  }
  // Planned sessions: 8 -> 1 miss, 16 -> 2 misses, 24 -> 3 misses
  return Math.max(1, Math.round(plannedOrCredits / 8));
}

/** Sessions you may still miss before the 70% eligibility line. */
export function eligibilityMisses(planned: number) {
  return Math.floor((planned * (100 - HARD_LINE)) / 100);
}

/** Grade points cut: 0.5 GPA cut for every subsequent class missed beyond the allowed 1 miss per credit. */
export function gradePenalty(planned: number, absent: number): number {
  const allowed = safeMisses(planned);
  const over = Math.max(0, absent - allowed);
  return over * PENALTY_PER_SESSION;
}

export type BunkStatus = {
  credits: number;
  planned: number;
  allowed: number;
  safeLeft: number;
  excess: number;
  penalty: number;
  label: string;
  tone: string;
  badge: string;
  isDanger: boolean;
  isCut: boolean;
};

/** Computes real-time bunk safety & GPA penalty status for a course. */
export function getBunkStatus(courseOrCredits: string | number, absent: number): BunkStatus {
  const credits = typeof courseOrCredits === "number" ? courseOrCredits : courseCredits(courseOrCredits);
  const planned = credits * 8;
  const allowed = credits * 1;
  const safeLeft = allowed - absent;
  const excess = Math.max(0, absent - allowed);
  const penalty = excess * PENALTY_PER_SESSION;

  if (excess > 0) {
    return {
      credits,
      planned,
      allowed,
      safeLeft: 0,
      excess,
      penalty,
      label: `-${penalty.toFixed(1)} GPA Cut (${excess} excess missed)`,
      tone: "text-rose font-bold",
      badge: `-${penalty.toFixed(1)} GPA`,
      isDanger: true,
      isCut: true,
    };
  }

  if (safeLeft === 0) {
    return {
      credits,
      planned,
      allowed,
      safeLeft: 0,
      excess: 0,
      penalty: 0,
      label: "0 bunks left — at the limit! Next miss cuts 0.5 GPA",
      tone: "text-amber-500 font-bold",
      badge: "0 Bunks Left",
      isDanger: true,
      isCut: false,
    };
  }

  if (safeLeft === 1) {
    return {
      credits,
      planned,
      allowed,
      safeLeft: 1,
      excess: 0,
      penalty: 0,
      label: "⚠️ 1 class left — danger zone! Next miss triggers GPA cut",
      tone: "text-amber-500 font-bold",
      badge: "1 Class Left",
      isDanger: true,
      isCut: false,
    };
  }

  return {
    credits,
    planned,
    allowed,
    safeLeft,
    excess: 0,
    penalty: 0,
    label: `Safe · ${safeLeft} of ${allowed} bunks remaining`,
    tone: "text-emerald-500 font-semibold",
    badge: `${safeLeft} Bunks Left`,
    isDanger: false,
    isCut: false,
  };
}

/** Longest unbroken stretch of missed classes, measured in calendar days —
 *  more than 13 days means a withdrawal unless the Director approved it. */
export function longestAbsenceRun(
  classes: ClassSession[],
  isAbsent: (s: ClassSession) => boolean,
  now: number,
) {
  const past = [...classes]
    .filter((s) => new Date(s.end_at).getTime() <= now)
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

  let best = { days: 0, from: 0, to: 0 };
  let start: number | null = null;
  let end = 0;

  const close = () => {
    if (start === null) return;
    const days = Math.round((end - start) / 86_400_000) + 1;
    if (days > best.days) best = { days, from: start, to: end };
    start = null;
  };

  for (const s of past) {
    const day = new Date(s.start_at).setHours(0, 0, 0, 0);
    if (isAbsent(s)) {
      if (start === null) start = day;
      end = day;
    } else {
      close();
    }
  }
  close();
  return best;
}



/** Green above 85 (deeper green the higher), amber 70–85, red below 70. */
export function meterColor(pct: number) {
  if (pct >= 85) {
    const t = Math.min(1, Math.max(0, (pct - 85) / 15));
    const hue = 96 + t * 52; // 96 → 148
    return `hsl(${hue.toFixed(0)} 70% ${(52 - t * 8).toFixed(0)}%)`;
  }
  if (pct >= 70) {
    const t = (pct - 70) / 15;
    const hue = 34 + t * 16; // 34 → 50
    return `hsl(${hue.toFixed(0)} 92% 55%)`;
  }
  const t = Math.min(1, Math.max(0, pct / 70));
  const hue = 0 + t * 14;
  return `hsl(${hue.toFixed(0)} 82% 58%)`;
}

/** Course label used to group sessions for attendance — deduplicated by canonical subject. */
export function sessionSubject(s: ClassSession) {
  return sessionLabel(s);
}

/** Rep marks win over self marks for the same session. */
export function resolveMarks(marks: AttendanceMark[], userId: string | undefined) {
  const resolved = new Map<string, AttendanceMark>();
  for (const m of marks) {
    if (m.user_id !== userId) continue;
    const existing = resolved.get(m.session_id);
    if (!existing || m.mark_source === "rep") resolved.set(m.session_id, m);
  }
  return resolved;
}

/** Last scheduled class of the current trimester — read straight from the
 *  timetable, so the quota window follows the calendar rather than a constant. */
export function trimesterEnd(sessions: ClassSession[], now: number) {
  let last = 0;
  for (const s of sessions) {
    const t = new Date(s.end_at).getTime();
    if (t > last) last = t;
  }
  return last > now ? last : null;
}

/** "2 months, 3 days" — how long until the holiday quota resets. */
export function untilReset(endMs: number, now: number) {
  const from = new Date(now);
  const to = new Date(endMs);
  let months =
    (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  const anchor = new Date(from);
  anchor.setMonth(anchor.getMonth() + months);
  if (anchor.getTime() > endMs) {
    months -= 1;
    anchor.setMonth(anchor.getMonth() - 1);
  }
  const days = Math.max(0, Math.round((endMs - anchor.getTime()) / 86_400_000));
  const parts: string[] = [];
  if (months > 0) parts.push(`${months} month${months === 1 ? "" : "s"}`);
  parts.push(`${days} day${days === 1 ? "" : "s"}`);
  return parts.join(", ");
}
