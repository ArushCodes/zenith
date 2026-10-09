import assert from "node:assert/strict";
import type { ClassSession } from "../src/lib/batches";
import type { Deadline } from "../src/lib/deadlines";
import type { DayMark } from "../src/lib/day-marks";
import {
  academicLabelKey,
  calendarAcademicDays,
  calendarDisplayMarks,
} from "../src/lib/calendar-academic";

export function testCalendarAcademic() {
  const batch = "ee4a435d-4003-4a22-940b-0ee0e676b6f5";
  function entry(id: string, title: string, start: string, end = start, extra = {}) {
    return {
      id,
      title,
      start_at: `${start}T00:00:00+05:30`,
      end_at: `${end}T23:59:59+05:30`,
      notes: "academic-calendar",
      ...extra,
    } as ClassSession;
  }
  const exams = ["2026-10-15", "2026-10-19"].map(
    (day) =>
      ({
        type: "endterm",
        due_at: `${day}T10:00:00+05:30`,
      }) as Deadline,
  );
  assert.equal(academicLabelKey("Study Holidays – Midterm"), "study-holiday");
  assert.equal(academicLabelKey("Trimester I — End Sem Exams"), "endterm");
  const sessions = [
    entry("period", "Trimester I — End Sem Exams", "2026-10-15", "2026-10-19"),
    entry("ics-exam", "End-sem conceptual exam", "2026-10-15", "2026-10-15", { notes: null }),
    entry("study", "Study Holidays", "2026-10-16", "2026-10-16", { is_holiday: true }),
    entry("study-copy", "Study holiday – End-term", "2026-10-16", "2026-10-16", {
      is_holiday: true,
    }),
    entry("class", "Mathematics", "2026-10-17", "2026-10-17", {
      notes: null,
      course_name: "Mathematics",
    }),
  ];
  const days = calendarAcademicDays(sessions, exams, new Map(), batch);
  assert.equal(days.get("2026-10-15")?.length ?? 0, 0);
  assert.equal(days.get("2026-10-16")?.length, 1);
  assert.equal(
    days.get("2026-10-17")?.some((e) => e.id.startsWith("derived-study:")),
    false,
  );
  assert.equal(days.get("2026-10-18")?.[0]?.title, "Study holiday");
  assert.equal(days.get("2026-10-19")?.length ?? 0, 0);
  assert.equal(calendarAcademicDays([], exams, new Map(), "other-batch").size, 0);
  const marked = new Map([["2026-10-18", { label: "College event" } as DayMark]]);
  assert.equal(calendarAcademicDays([], exams, marked, batch).has("2026-10-18"), false);
  const sameStudy = new Map([["2026-10-16", { label: "Study holidays" } as DayMark]]);
  assert.equal(
    calendarAcademicDays(sessions, exams, sameStudy, batch).get("2026-10-16")?.length,
    0,
  );
  const holiday = entry("holiday", "Campus holiday", "2026-10-18", "2026-10-18", {
    is_holiday: true,
  });
  const protectedDays = calendarAcademicDays([holiday], exams, new Map(), batch);
  assert.equal(protectedDays.get("2026-10-18")?.[0]?.id, "holiday");
  assert.equal(protectedDays.get("2026-10-18")?.length, 1);
  const midterms = exams.map((d) => ({ ...d, type: "midterm" }) as Deadline);
  assert.equal(
    calendarAcademicDays([], midterms, new Map(), batch).get("2026-10-18")?.[0]?.title,
    "Study holiday",
  );
  const originalMark = { label: "Endterm (conceptual)", color: "#f00" } as DayMark;
  const displayMarks = calendarDisplayMarks(new Map([["2026-10-15", originalMark]]), exams);
  assert.equal(displayMarks.get("2026-10-15")?.label, null);
  assert.equal(displayMarks.get("2026-10-15")?.color, "#f00");
  assert.equal(originalMark.label, "Endterm (conceptual)");
}
