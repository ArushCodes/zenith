import type { ClassSession } from "./batches";
import type { Deadline } from "./deadlines";
import { dayKey } from "./deadlines";
import { isAcademicEvent, isAssessmentSession, isTeachingClass } from "./courses";
import type { DayMark } from "./day-marks";

const IPM1 = "ee4a435d-4003-4a22-940b-0ee0e676b6f5";
export const isDerivedStudyDay = (entry: ClassSession) => entry.id.startsWith("derived-study:");

/** Identity for duplicate imported calendar labels, independent of punctuation. */
export function academicLabelKey(label: string) {
  const clean = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (/\bstudy\s+(holiday|holidays|leave|day|days)\b/.test(clean)) return "study-holiday";
  if (/\bmid\s*(term|sem|semester)\b/.test(clean)) return "midterm";
  if (/\bend\s*(term|sem|semester)\b/.test(clean)) return "endterm";
  return clean;
}

export function calendarDisplayMarks(marks: Map<string, DayMark>, deadlines: Deadline[]) {
  const examDays = new Set(
    deadlines
      .filter((d) => d.type === "midterm" || d.type === "endterm")
      .map((d) => dayKey(d.due_at)),
  );
  return new Map(
    [...marks].map(([day, mark]) => [
      day,
      examDays.has(day) &&
      mark.label &&
      ["midterm", "endterm", "study-holiday"].includes(academicLabelKey(mark.label))
        ? { ...mark, label: null }
        : mark,
    ]),
  );
}

/** Display-only normalization. Stored imports and moderator day marks stay untouched. */
export function calendarAcademicDays(
  sessions: ClassSession[],
  deadlines: Deadline[],
  marks: Map<string, DayMark>,
  batchId: string | null,
) {
  const result = new Map<string, ClassSession[]>();
  const deadlineExamDays = new Set(
    deadlines
      .filter((d) => d.type === "midterm" || d.type === "endterm")
      .map((d) => dayKey(d.due_at)),
  );
  const examDays = new Set(deadlineExamDays);
  for (const s of sessions) {
    if (
      !s.is_cancelled &&
      !isAcademicEvent(s) &&
      isAssessmentSession(s) &&
      (s.course_name || s.course_code)
    )
      examDays.add(dayKey(s.start_at));
  }
  for (const entry of sessions.filter(
    (s) =>
      !s.is_cancelled &&
      (isAcademicEvent(s) ||
        s.is_holiday ||
        isAssessmentSession(s) ||
        ["midterm", "endterm", "study-holiday"].includes(academicLabelKey(s.title))),
  )) {
    const last = dayKey(entry.end_at);
    let date = new Date(`${dayKey(entry.start_at)}T12:00:00+05:30`);
    for (
      let i = 0;
      i < 370 && dayKey(date) <= last;
      i++, date = new Date(date.getTime() + 86400000)
    ) {
      const key = dayKey(date);
      const identity = academicLabelKey(entry.title);
      // Specific exams already communicate the assessment; the broad imported period adds no information.
      if (
        deadlineExamDays.has(key) &&
        (identity === "midterm" || identity === "endterm" || identity === "study-holiday")
      )
        continue;
      const list = result.get(key) ?? [];
      const duplicateKey = (e: ClassSession) =>
        !isAcademicEvent(e) && (e.course_name || e.course_code) && identity !== "study-holiday"
          ? e.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, " ")
              .trim()
          : academicLabelKey(e.title);
      if (!list.some((e) => duplicateKey(e) === duplicateKey(entry)))
        result.set(key, [...list, entry]);
    }
  }

  if (batchId === IPM1) {
    const teachingDays = new Set(
      sessions.filter((s) => !s.is_cancelled && isTeachingClass(s)).map((s) => dayKey(s.start_at)),
    );
    for (const type of ["midterm", "endterm"] as const) {
      const dates = [
        ...new Set(deadlines.filter((d) => d.type === type).map((d) => dayKey(d.due_at))),
      ].sort();
      for (let i = 1; i < dates.length; i++) {
        const start = new Date(`${dates[i - 1]}T12:00:00+05:30`).getTime();
        const end = new Date(`${dates[i]}T12:00:00+05:30`).getTime();
        // Separate exam seasons should never turn the whole term into study leave.
        if (end - start > 14 * 86400000) continue;
        for (let at = start + 86400000; at < end; at += 86400000) {
          const key = dayKey(new Date(at));
          const list = result.get(key) ?? [];
          if (
            examDays.has(key) ||
            teachingDays.has(key) ||
            marks.has(key) ||
            list.some((e) => e.is_holiday || academicLabelKey(e.title) === "study-holiday")
          )
            continue;
          const entry = {
            id: `derived-study:${key}`,
            batch_id: batchId,
            title: "Study holiday",
            notes: "academic-calendar",
            start_at: `${key}T00:00:00+05:30`,
            end_at: `${key}T23:59:59+05:30`,
            is_holiday: true,
          } as ClassSession;
          result.set(key, [
            ...list.filter((e) => !["midterm", "endterm"].includes(academicLabelKey(e.title))),
            entry,
          ]);
        }
      }
    }
  }
  for (const [key, list] of result) {
    const mark = marks.get(key);
    const study =
      list.some((e) => academicLabelKey(e.title) === "study-holiday") ||
      (mark?.label && academicLabelKey(mark.label) === "study-holiday");
    result.set(
      key,
      list.filter((e) => {
        const identity = academicLabelKey(e.title);
        if (study && ["midterm", "endterm"].includes(identity)) return false;
        return !mark?.label || identity !== academicLabelKey(mark.label);
      }),
    );
  }
  return result;
}
