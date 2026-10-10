import { subjectCanonicalKey } from "./courses";
import type { Deadline } from "./deadlines";
import type { CourseComponent } from "./grading";

export function isCombinedComponent(component: CourseComponent) {
  return /\bquizzes\b|combined|aggregate/i.test(component.name);
}

export function assessmentCandidates(deadline: Deadline, components: CourseComponent[]) {
  const code = (value: string | null) => value?.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const subject = subjectCanonicalKey(deadline.subject);
  return components.filter(
    (component) =>
      component.batch_id === deadline.batch_id &&
      (Boolean(
        deadline.subject_code && code(deadline.subject_code) === code(component.course_code),
      ) ||
        Boolean(subject && subject === subjectCanonicalKey(component.course_name))) &&
      (component.kind === deadline.type ||
        (component.kind === "exam" && ["midterm", "endterm"].includes(deadline.type)) ||
        (component.kind === "project" && ["presentation", "assignment"].includes(deadline.type))),
  );
}

export function suggestedComponent(deadline: Deadline, components: CourseComponent[]) {
  const candidates = assessmentCandidates(deadline, components).filter(
    (c) => !isCombinedComponent(c),
  );
  const number = /\bquiz[\s-]*(\d+)\b/i.exec(deadline.title)?.[1];
  const matches = number
    ? candidates.filter((c) => /\bquiz[\s-]*(\d+)\b/i.exec(c.name)?.[1] === number)
    : candidates;
  return matches.length === 1 ? matches[0] : null;
}
