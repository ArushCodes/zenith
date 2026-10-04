import { getBunkStatus } from "@/lib/attendance";

export function MissAllowance({ course, missed }: { course: string; missed: number }) {
  const budget = getBunkStatus(course, missed);
  return (
    <div
      aria-label={`${course}: ${Math.max(0, budget.safeLeft)} of ${budget.allowed} penalty-free misses remaining`}
    >
      <p
        className={`text-lg font-semibold tabular-nums ${budget.safeLeft <= 0 ? "text-rose" : "text-cyan"}`}
      >
        {budget.excess > 0 ? `${budget.excess} over` : `${budget.safeLeft} left`}
        <span className="ml-1 text-[10px] font-normal text-dim">/ {budget.allowed} misses</span>
      </p>
      <div className="mt-1 flex gap-1" aria-hidden="true">
        {Array.from({ length: budget.allowed }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < Math.max(0, budget.safeLeft) ? "bg-cyan" : "bg-rose/40"}`}
          />
        ))}
      </div>
    </div>
  );
}
