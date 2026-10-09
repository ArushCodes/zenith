import type { ClassSession } from "./batches";

/** Uses actual class boundaries, including gaps spanning empty slots. */
export function classProgress(classes: ClassSession[], now: number) {
  const ordered = [...classes].sort((a, b) => Date.parse(a.start_at) - Date.parse(b.start_at));
  const done = ordered.filter((s) => Date.parse(s.end_at) <= now).length;
  const current = ordered.find((s) => Date.parse(s.start_at) <= now && Date.parse(s.end_at) > now);
  const next = ordered.find((s) => Date.parse(s.start_at) > now);
  const previous = ordered.filter((s) => Date.parse(s.end_at) <= now).at(-1);
  const start = current
    ? Date.parse(current.start_at)
    : previous && next
      ? Date.parse(previous.end_at)
      : null;
  const end = current ? Date.parse(current.end_at) : next ? Date.parse(next.start_at) : null;
  return {
    done,
    remaining: ordered.length - done,
    state: current
      ? "class"
      : next
        ? previous
          ? "break"
          : "upcoming"
        : ordered.length
          ? "over"
          : "empty",
    session: current ?? next,
    minutesLeft: end === null ? 0 : Math.max(0, Math.ceil((end - now) / 60000)),
    elapsed:
      start === null || end === null
        ? 0
        : Math.min(100, Math.max(0, ((now - start) / Math.max(1, end - start)) * 100)),
  };
}
