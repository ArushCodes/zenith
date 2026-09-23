import type { ClassSession, Course } from "@/lib/batches";

export const FALLBACK_COURSE_COLOR = "#64748B";

/** Permanent, stable colors assigned to subject canonical keys so every subject retains its exact color everywhere. */
export const STABLE_SUBJECT_COLORS: Record<string, string> = {
  ai: "#F472B6",              // Pink
  english: "#FB923C",         // Orange
  mathematics: "#F59E0B",     // Amber
  maths: "#F59E0B",
  psychology: "#22D3EE",      // Cyan
  sociology: "#60A5FA",       // Blue
  spreadsheets: "#34D399",    // Emerald
  statistics: "#A78BFA",      // Violet
  "team-building": "#E879F9", // Fuchsia / Magenta
  economics: "#38BDF8",       // Sky
  accounting: "#FACC15",      // Yellow
  marketing: "#4ADE80",       // Mint
  finance: "#C084FC",         // Purple
  operations: "#2DD4BF",      // Teal
  law: "#F87171",             // Red
};

export type SubjectDetails = {
  canonical: string;
  shortName: string;
  shortAbbrev: string;
  fullName: string;
  code?: string;
};

export const SUBJECT_REGISTRY: Record<string, SubjectDetails> = {
  psychology: {
    canonical: "psychology",
    shortName: "Psychology",
    shortAbbrev: "Psych",
    fullName: "Foundations of Psychology",
    code: "HRM 1101",
  },
  sociology: {
    canonical: "sociology",
    shortName: "Sociology",
    shortAbbrev: "Sociology",
    fullName: "Introduction to Sociology",
    code: "MGT 1101",
  },
  mathematics: {
    canonical: "mathematics",
    shortName: "Mathematics",
    shortAbbrev: "Maths",
    fullName: "Basic Mathematics – I",
    code: "OPS 1101",
  },
  maths: {
    canonical: "mathematics",
    shortName: "Mathematics",
    shortAbbrev: "Maths",
    fullName: "Basic Mathematics – I",
    code: "OPS 1101",
  },
  statistics: {
    canonical: "statistics",
    shortName: "Statistics",
    shortAbbrev: "Stats",
    fullName: "Basics of Statistics",
    code: "OPS 1102",
  },
  spreadsheets: {
    canonical: "spreadsheets",
    shortName: "Spreadsheets",
    shortAbbrev: "Spreadsheets",
    fullName: "Working with Spreadsheets",
    code: "ANT 1101",
  },
  "team-building": {
    canonical: "team-building",
    shortName: "Team Building",
    shortAbbrev: "Team Building",
    fullName: "Working in Groups and Team building",
    code: "HRM 1103",
  },
  english: {
    canonical: "english",
    shortName: "English",
    shortAbbrev: "English",
    fullName: "English Language and Literature - I",
    code: "HRM 1102",
  },
  ai: {
    canonical: "ai",
    shortName: "AI",
    shortAbbrev: "AI",
    fullName: "Introduction to AI",
    code: "ITS 1101",
  },
  economics: {
    canonical: "economics",
    shortName: "Economics",
    shortAbbrev: "Macro",
    fullName: "Managerial Economics",
    code: "ECO 1101",
  },
  accounting: {
    canonical: "accounting",
    shortName: "Accounting",
    shortAbbrev: "Acct",
    fullName: "Financial Accounting",
    code: "ACT 1101",
  },
  marketing: {
    canonical: "marketing",
    shortName: "Marketing",
    shortAbbrev: "Marketing",
    fullName: "Marketing Management",
    code: "MKT 1101",
  },
  finance: {
    canonical: "finance",
    shortName: "Finance",
    shortAbbrev: "Finance",
    fullName: "Corporate Finance",
    code: "FIN 1101",
  },
  operations: {
    canonical: "operations",
    shortName: "Operations",
    shortAbbrev: "Ops",
    fullName: "Operations Management",
    code: "OPS 1103",
  },
  law: {
    canonical: "law",
    shortName: "Law",
    shortAbbrev: "Law",
    fullName: "Business Law & Ethics",
    code: "LAW 1101",
  },
};

/** Returns short name of subject (e.g. "Sociology", "Psychology", "Maths") - never clips */
export function subjectShortName(raw: string | null | undefined): string {
  if (!raw) return "";
  const key = subjectCanonicalKey(raw);
  if (SUBJECT_REGISTRY[key]?.shortName) {
    return SUBJECT_REGISTRY[key].shortName;
  }
  const clean = raw
    .replace(/^Term\s*\d+\s*:\s*/i, "")
    .replace(/^(Introduction to|Foundations of|Basics of|Working with|Working in)\s+/i, "")
    .replace(/\s*[-–—·]\s*(I|II|1|2|S\d+).*$/i, "")
    .trim();
  return clean || raw.trim();
}

/** Returns full formal course title (e.g. "Foundations of Psychology", "Basic Mathematics – I") */
export function subjectFullName(raw: string | null | undefined): string {
  if (!raw) return "";
  const key = subjectCanonicalKey(raw);
  if (SUBJECT_REGISTRY[key]?.fullName) {
    return SUBJECT_REGISTRY[key].fullName;
  }
  return raw.trim();
}

/** Returns the short, clear subject label for period chips so they NEVER clip */
export function sessionPeriodLabel(s: ClassSession): string {
  if (s.short_name) return s.short_name;
  const name = s.course_name || s.course_code || s.title;
  return subjectShortName(name) || s.course_code || s.title;
}

export const CANONICAL_SUBJECT_LABELS: Record<string, { label: string; code?: string }> = {
  ai: { label: "AI", code: "ITS 1101" },
  english: { label: "English", code: "HRM 1102" },
  mathematics: { label: "Mathematics", code: "OPS 1101" },
  maths: { label: "Mathematics", code: "OPS 1101" },
  psychology: { label: "Psychology", code: "HRM 1101" },
  sociology: { label: "Sociology", code: "MGT 1101" },
  spreadsheets: { label: "Spreadsheets", code: "ANT 1101" },
  statistics: { label: "Statistics", code: "OPS 1102" },
  "team-building": { label: "Team Building", code: "HRM 1103" },
  economics: { label: "Economics" },
  accounting: { label: "Accounting" },
  marketing: { label: "Marketing" },
  finance: { label: "Finance" },
  operations: { label: "Operations" },
  law: { label: "Law" },
};

export type BatchSubject = {
  key: string;
  label: string;
  fullName: string;
  code?: string;
  color: string;
};

/** Palette used when a custom subject has no preset color — every distinct
 *  subject still gets a deterministic stable color. */
const AUTO_PALETTE = [
  "#22D3EE",
  "#A78BFA",
  "#F59E0B",
  "#34D399",
  "#F472B6",
  "#60A5FA",
  "#FB923C",
  "#4ADE80",
  "#E879F9",
  "#38BDF8",
  "#FACC15",
  "#FCA5A5",
  "#2DD4BF",
  "#C084FC",
  "#F87171",
  "#818CF8",
];

/** Normalizes any subject title/code/short name to a clean canonical key */
export function subjectCanonicalKey(raw: string | null | undefined): string {
  if (!raw) return "";
  const clean = raw
    .replace(/^\s*S\d+\s*[-–·]\s*/i, "")
    .replace(/\s*[-–·]\s*S\d+\b.*$/i, "")
    .replace(/Term\s*\d+\s*:\s*/i, "")
    .replace(/-\s*S\d+\b.*$/i, "")
    .trim()
    .toLowerCase();

  if (/psychology|hrm\s*1101/i.test(clean)) return "psychology";
  if (/sociology|mgt\s*1101/i.test(clean)) return "sociology";
  if (/mathemat|maths|ops\s*1101/i.test(clean)) return "mathematics";
  if (/statistic|ops\s*1102/i.test(clean)) return "statistics";
  if (/english|hrm\s*1102/i.test(clean)) return "english";
  if (/spreadsheet|ant\s*1101/i.test(clean)) return "spreadsheets";
  if (/artificial intelligence|\bai\b|its\s*1101/i.test(clean)) return "ai";
  if (/team build|working in group|hrm\s*1103/i.test(clean)) return "team-building";
  if (/econom/i.test(clean)) return "economics";
  if (/account/i.test(clean)) return "accounting";
  if (/marketing/i.test(clean)) return "marketing";
  if (/finance|financial/i.test(clean)) return "finance";
  if (/operation/i.test(clean)) return "operations";
  if (/law|legal/i.test(clean)) return "law";

  return clean.replace(/[^a-z0-9]+/g, "-");
}

/** Clean display label for any subject title/code/short name */
export function canonicalSubject(raw: string | null | undefined): string {
  const key = subjectCanonicalKey(raw);
  if (CANONICAL_SUBJECT_LABELS[key]?.label) {
    return CANONICAL_SUBJECT_LABELS[key].label;
  }
  return raw ? raw.trim() : "";
}

/** Deterministic stable color for any subject label, consistent on EVERY component and surface. */
export function autoColor(key: string) {
  const canonical = subjectCanonicalKey(key);
  if (STABLE_SUBJECT_COLORS[canonical]) {
    return STABLE_SUBJECT_COLORS[canonical];
  }
  let h = 0;
  for (let i = 0; i < canonical.length; i += 1) h = (h * 31 + canonical.charCodeAt(i)) >>> 0;
  return AUTO_PALETTE[h % AUTO_PALETTE.length]!;
}

/** Lookup of course code / short name / session key → colour.
 *  Deterministic and uniform across all surfaces. */
export function buildColorMap(courses: Course[], sessions: ClassSession[] = []) {
  const m = new Map<string, string>();

  for (const c of courses) {
    const color = c.color || autoColor(c.code) || autoColor(c.name);
    if (c.code) m.set(c.code.toLowerCase(), color);
    if (c.short_name) m.set(c.short_name.toLowerCase(), color);
    if (c.name) m.set(c.name.toLowerCase(), color);
    m.set(subjectCanonicalKey(c.name), color);
  }

  for (const s of sessions) {
    if (s.is_holiday || isAcademicEvent(s)) continue;
    const name = s.course_code || s.short_name || s.course_name || s.title;
    const color = autoColor(name);
    if (s.course_code) m.set(s.course_code.toLowerCase(), color);
    if (s.short_name) m.set(s.short_name.toLowerCase(), color);
    if (s.course_name) m.set(s.course_name.toLowerCase(), color);
    m.set(sessionKey(s), color);
    m.set(subjectCanonicalKey(name), color);
  }

  return m;
}

export function sessionColor(s: ClassSession, map?: Map<string, string>) {
  if (s.is_holiday) return null;
  const canonical = subjectCanonicalKey(s.course_code || s.short_name || s.course_name || s.title);
  if (map && map.has(canonical)) return map.get(canonical)!;
  if (s.course_code && map && map.has(s.course_code.toLowerCase())) return map.get(s.course_code.toLowerCase())!;
  if (s.short_name && map && map.has(s.short_name.toLowerCase())) return map.get(s.short_name.toLowerCase())!;
  return autoColor(canonical);
}



/** Academic-calendar entries are stored as custom sessions tagged in notes. */
export function isAcademicEvent(s: ClassSession) {
  return s.notes === "academic-calendar";
}

/** Every holiday collapses into one filter bucket instead of one chip each. */
export const HOLIDAY_KEY = "__holiday";

export function isHoliday(s: ClassSession) {
  return s.is_holiday;
}

/** Assessments (quizzes, tests, exams…) live on the timetable but are never
 *  taught classes, so attendance must ignore them. */
const ASSESSMENT_RE =
  /\b(quiz|test|exam|midterm|mid-?term|endterm|end-?term|viva|presentation)\b/i;

export function isAssessmentSession(s: ClassSession) {
  return (
    ASSESSMENT_RE.test(s.title) ||
    ASSESSMENT_RE.test(s.course_name ?? "") ||
    ASSESSMENT_RE.test(s.short_name ?? "")
  );
}

/** A real, attendance-bearing class: not a holiday, not an academic-calendar
 *  milestone, not an assessment, and tied to an actual course. Used by every
 *  surface (feed, timetable, attendance, calendar) so all batches behave the
 *  same way. */
export function isTeachingClass(s: ClassSession) {
  return (
    !s.is_holiday &&
    !isAcademicEvent(s) &&
    !isAssessmentSession(s) &&
    Boolean(s.course_name || s.course_code)
  );
}

/** Sundays are off across the whole institute — one rule, every batch. */
export function isDayOff(d: Date | string) {
  return new Date(d).getDay() === 0;
}

/** A free stretch between two classes on the same day. */
export type Gap = {
  /** Id of the class that starts right after this gap — used as a render key. */
  beforeId: string;
  start: number;
  end: number;
  minutes: number;
};

/** Gaps between consecutive classes are break time. Anything shorter than
 *  `minMinutes` is just a corridor walk and is ignored. */
export function breaksBetween(list: ClassSession[], minMinutes = 10): Gap[] {
  const sorted = [...list].sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
  );
  const gaps: Gap[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const next = sorted[i]!;
    const start = new Date(prev.end_at).getTime();
    const end = new Date(next.start_at).getTime();
    const minutes = Math.round((end - start) / 60000);
    if (minutes >= minMinutes) gaps.push({ beforeId: next.id, start, end, minutes });
  }
  return gaps;
}

/** Break gaps keyed by the class that follows them. */
export function breakMap(list: ClassSession[], minMinutes = 10) {
  return new Map(breaksBetween(list, minMinutes).map((g) => [g.beforeId, g]));
}

export function formatBreak(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m break` : `${h}h break`;
  return `${m}m break`;
}



/** Clean display name — uses canonical standardized subject name across the whole app. */
export function sessionLabel(s: ClassSession) {
  if (s.is_holiday) return s.title;
  const canonical = subjectCanonicalKey(s.course_code || s.short_name || s.course_name || s.title);
  if (CANONICAL_SUBJECT_LABELS[canonical]?.label) {
    return CANONICAL_SUBJECT_LABELS[canonical].label;
  }
  const base = s.short_name ?? s.course_name ?? s.title;
  const clean = base
    .replace(/Term\s*\d+\s*:\s*/i, "")
    .replace(/^\s*S\d+\s*[-–·]\s*/i, "")
    .replace(/\s*[-–·]\s*S\d+\b.*$/i, "")
    .replace(/\s*[-–·]\s*MMT\(S\d+\).*$/i, "")
    .trim();
  return clean || s.title;
}

/** Full subject name for titles — prefers the complete formal course name. */
export function sessionFullName(s: ClassSession) {
  if (s.is_holiday) return s.title;
  const base = s.course_name ?? s.short_name ?? s.title;
  const clean = base
    .replace(/Term\s*\d+\s*:\s*/i, "")
    .replace(/^\s*S\d+\s*[-–·]\s*/i, "")
    .replace(/\s*[-–·]\s*S\d+\b.*$/i, "")
    .replace(/\s*[-–·]\s*MMT\(S\d+\).*$/i, "")
    .trim();
  return clean || s.title;
}

/**
 * Extracts, unifies, and alphabetizes all subjects across the batch from courses,
 * sessions, and deadlines so every single surface (Feed, Calendar, Timetable, etc.)
 * displays the exact same subjects in the exact same consistent order and color theme.
 */
export function getBatchSubjects(
  courses: Course[] = [],
  sessions: ClassSession[] = [],
  deadlines: { subject?: string | null; subject_code?: string | null }[] = [],
): BatchSubject[] {
  const map = new Map<string, BatchSubject>();

  // 1. From catalog courses
  for (const c of courses) {
    const canonical = subjectCanonicalKey(c.name || c.short_name || c.code);
    if (!canonical) continue;
    const standard = CANONICAL_SUBJECT_LABELS[canonical];
    const label = standard?.label || c.short_name || c.name || c.code;
    const color = c.color || autoColor(canonical);
    map.set(canonical, {
      key: canonical,
      label,
      fullName: c.name || label,
      code: c.code || standard?.code,
      color,
    });
  }

  // 2. From timetable sessions
  for (const s of sessions) {
    if (s.is_holiday || isAcademicEvent(s)) continue;
    const canonical = sessionKey(s);
    if (!canonical || canonical === HOLIDAY_KEY) continue;
    const standard = CANONICAL_SUBJECT_LABELS[canonical];
    const existing = map.get(canonical);
    const label = standard?.label || s.short_name || sessionLabel(s);
    const fullName = s.course_name || s.title || label;
    const code = s.course_code || standard?.code || existing?.code;
    const color = existing?.color || autoColor(canonical);

    map.set(canonical, {
      key: canonical,
      label: existing?.label || label,
      fullName: existing?.fullName || fullName,
      code,
      color,
    });
  }

  // 3. From deadlines/events
  for (const d of deadlines) {
    if (!d.subject) continue;
    const canonical = subjectCanonicalKey(d.subject);
    if (!canonical) continue;
    const standard = CANONICAL_SUBJECT_LABELS[canonical];
    const existing = map.get(canonical);
    const label = standard?.label || d.subject;
    map.set(canonical, {
      key: canonical,
      label: existing?.label || label,
      fullName: existing?.fullName || label,
      code: d.subject_code || standard?.code || existing?.code,
      color: existing?.color || autoColor(canonical),
    });
  }

  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/** Small detail chips: session no., code, faculty, room. */
export function sessionMeta(s: ClassSession) {
  const out: string[] = [];
  const n = sessionNumberOf(s);
  if (n) out.push(`S${n}`);
  if (s.course_code) out.push(s.course_code);
  if (s.faculty_name) out.push(s.faculty_name);
  if (s.classroom) out.push(s.classroom);

  return out;
}

/** Session number if the feed encoded one, e.g. "… - S10 - Pratik". */
export function sessionNumberOf(s: ClassSession) {
  if (s.session_number) return s.session_number;
  const m = /[-–·]\s*S(\d+)\b/i.exec(s.title);
  return m ? Number(m[1]) : null;
}

/** Key used for subject filtering — canonical key for absolute deduplication across the app. */
export function sessionKey(s: ClassSession) {
  if (s.is_holiday) return HOLIDAY_KEY;
  const combined = [s.course_code, s.short_name, s.course_name, s.title].filter(Boolean).join(" ");
  return subjectCanonicalKey(combined);
}


export function courseKey(c: Course) {
  return c.code.toLowerCase();
}

/** "1h 15m" / "45m" — the hour+minute form used for class and break lengths. */
export function formatDuration(minutes: number) {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h > 0) return rest > 0 ? `${h}h ${rest}m` : `${h}h`;
  return `${rest}m`;
}

/** Length of a session in the hour+minute form. */
export function sessionDuration(s: ClassSession) {
  return formatDuration((new Date(s.end_at).getTime() - new Date(s.start_at).getTime()) / 60000);
}


/** Short subject abbreviations for tight calendar pills: Socio, Psych, AI... */
const ABBREV: [RegExp, string][] = [
  [/sociolog/i, "Socio"],
  [/psycholog/i, "Psych"],
  [/english|communicat/i, "English"],
  [/mathemat|maths/i, "Math"],
  [/statistic/i, "Stats"],
  [/artificial intelligence|\bai\b/i, "AI"],
  [/spreadsheet/i, "Sheets"],
  [/team build/i, "Team"],
  [/behaviou?ral econom/i, "Beh Econ"],
  [/econom/i, "Econ"],
  [/account/i, "Acct"],
  [/operations research/i, "Ops Res"],
  [/marketing/i, "Mktg"],
  [/finance|financial/i, "Fin"],
  [/computer|programming/i, "CS"],
  [/political/i, "Pol Sci"],
  [/philosoph/i, "Philo"],
  [/histor/i, "History"],
  [/physic/i, "Physics"],
  [/chemistr/i, "Chem"],
  [/biolog/i, "Bio"],
  [/environment/i, "Env"],
  [/law|legal/i, "Law"],
];

export function abbrevSubject(name: string) {
  const clean = name.trim();
  if (!clean) return clean;
  for (const [re, short] of ABBREV) if (re.test(clean)) return short;
  const words = clean.split(/[\s/&-]+/).filter(Boolean);
  if (words.length > 1) {
    return words
      .filter((w) => !/^(of|the|and|to|in|for|a|an)$/i.test(w))
      .map((w) => w[0]!.toUpperCase())
      .join("")
      .slice(0, 4);
  }
  return clean.length > 8 ? `${clean.slice(0, 6)}.` : clean;
}

/** Abbreviated label for a class session: "Socio-S4" (subject + lecture no.). */
export function sessionShortLabel(s: ClassSession) {
  if (s.is_holiday) return s.title;
  const subject = abbrevSubject(sessionFullName(s));
  const n = sessionNumberOf(s);
  return n ? `${subject}-S${n}` : subject;
}

