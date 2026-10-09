import type { ClassSession } from "./batches";
import { dayKey, type Deadline } from "./deadlines";
import { isTeachingClass } from "./courses";

/** Facts only: tomorrow's schedule, or the next scheduled day after a clear tomorrow. */
export function nextDayBrief(sessions: ClassSession[], deadlines: Deadline[], now: number) {
  const tomorrow = dayKey(
    new Date(Date.parse(`${dayKey(new Date(now))}T12:00:00+05:30`) + 86400000),
  );
  const classes = sessions
    .filter((s) => !s.is_cancelled && isTeachingClass(s) && dayKey(s.start_at) >= tomorrow)
    .sort((a, b) => Date.parse(a.start_at) - Date.parse(b.start_at));
  const events = deadlines
    .filter((d) => (d.status ?? "approved") === "approved" && dayKey(d.due_at) >= tomorrow)
    .sort((a, b) => Date.parse(a.due_at) - Date.parse(b.due_at));
  const dates = [classes[0] && dayKey(classes[0].start_at), events[0] && dayKey(events[0].due_at)]
    .filter((d): d is string => Boolean(d))
    .sort();
  const day = dates[0] ?? tomorrow;
  return {
    day,
    tomorrow,
    classes: classes.filter((s) => dayKey(s.start_at) === day),
    events: events.filter((d) => dayKey(d.due_at) === day),
  };
}
