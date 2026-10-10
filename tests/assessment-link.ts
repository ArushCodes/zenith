import assert from "node:assert/strict";
import {
  assessmentCandidates,
  suggestedComponent,
  isCombinedComponent,
} from "../src/lib/assessment-link";
import type { CourseComponent } from "../src/lib/grading";
import type { Deadline } from "../src/lib/deadlines";

export function testAssessmentLinks() {
  const component = (id: string, name: string, kind = "quiz", batch_id = "batch") =>
    ({
      id,
      name,
      kind,
      batch_id,
      course_code: "OPS 1101",
      course_name: "Basic Mathematics - I",
    }) as CourseComponent;
  const event = {
    id: "quiz",
    batch_id: "batch",
    subject: "Mathematics",
    subject_code: "OPS1101",
    title: "Mathematics Quiz 2",
    type: "quiz",
  } as Deadline;
  const choices = [
    component("one", "Quiz 1"),
    component("two", "Quiz 2"),
    component("combined", "Quizzes"),
    component("foreign", "Quiz 2", "quiz", "other"),
  ];
  assert.equal(assessmentCandidates(event, choices).length, 3);
  assert.equal(suggestedComponent(event, choices)?.id, "two");
  assert.equal(suggestedComponent({ ...event, title: "Quiz" }, choices), null);
  assert.equal(suggestedComponent(event, [component("combined", "Quizzes")]), null);
  assert.equal(isCombinedComponent(component("group", "Quizzes (3)")), true);
  assert.equal(
    suggestedComponent({ ...event, type: "endterm", title: "End-term" }, [
      component("end", "Endterm", "endterm"),
    ])?.id,
    "end",
  );
  console.log("Passed: assessment links reject ambiguous combined scores and cross-batch matches.");
}
