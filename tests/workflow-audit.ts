import assert from "node:assert/strict";
import { feedState, assessmentBadge, dayKey, type Deadline } from "../src/lib/deadlines";
import { classSlotIndex } from "../src/lib/class-slots";
export function testWorkflowAudit() {
  const task = {
    type: "assignment",
    title: "English Book Review",
    due_at: "2026-10-08T10:00:00+05:30",
    end_at: null,
    all_day: false,
  } as Deadline;
  const now = Date.parse("2026-10-09T12:00:00+05:30");
  assert.equal(feedState(task, now), "overdue");
  assert.equal(feedState(task, now, true), "done");
  assert.equal(feedState({ ...task, type: "midterm" }, now), "past");
  assert.equal(
    feedState({ ...task, type: "midterm", due_at: "2026-10-15T10:00:00+05:30" }, now, true),
    "upcoming",
  );
  assert.equal(assessmentBadge({ type: "quiz", title: "AI Quiz-2" }), "Quiz 2");
  assert.equal(dayKey("2026-10-08T20:00:00Z"), "2026-10-09");
  assert.equal(classSlotIndex("2026-10-09T06:15:00Z"), 1);
  assert.equal(classSlotIndex("2026-10-09T10:30:00Z"), 3);
  console.log(
    "Passed: overdue versus completed work, premature exam flags, assessment numbers and IST slots.",
  );
}
