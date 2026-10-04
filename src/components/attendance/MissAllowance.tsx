import { getBunkStatus } from "@/lib/attendance";

export function MissAllowance({ course, missed }: { course: string; missed: number }) {
  const budget = getBunkStatus(course, missed);
  return (
    <div
      aria-label={`${course}: ${budget.excess > 0 ? `${budget.excess} over allowance` : `${budget.safeLeft} misses left before penalty`}`}
    >
      <p
        className={`text-lg font-semibold tabular-nums ${budget.safeLeft <= 0 ? "text-rose" : "text-cyan"}`}
      >
        {budget.excess > 0 ? `${budget.excess}` : `${budget.safeLeft} left`}
        <span className="ml-1 text-[10px] font-normal text-dim">
          {budget.excess > 0 ? "over allowance" : "before penalty"}
        </span>
      </p>
      {budget.safeLeft === 0 && (
        <p className="text-[10px] text-rose">Next miss: −0.5 grade points</p>
      )}
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
