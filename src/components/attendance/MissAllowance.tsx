import { attendanceColor } from "@/lib/attendance-colors";
import { getBunkStatus } from "@/lib/attendance";

export function MissAllowance({ course, missed }: { course: string; missed: number }) {
  const budget = getBunkStatus(course, missed);
  const color = attendanceColor(budget.safeLeft, budget.allowed, budget.excess);
  return (
    <div
      aria-label={`${course}: ${budget.excess > 0 ? `${budget.excess} over allowance` : `${budget.safeLeft} misses left before penalty`}`}
    >
      <p className="text-lg font-semibold tabular-nums" style={{ color }}>
        {budget.excess > 0 ? `${budget.excess}` : `${budget.safeLeft} left`}
        <span className="ml-1 text-[10px] font-normal text-dim">
          {budget.excess > 0 ? "over allowance" : "before penalty"}
        </span>
      </p>
      {budget.safeLeft === 0 && (
        <p className="text-[10px]" style={{ color }}>
          Next miss: −0.5 grade points
        </p>
      )}
      <div className="mt-1 flex gap-1" aria-hidden="true">
        {Array.from({ length: budget.allowed }, (_, i) => (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={{ backgroundColor: color, opacity: i < Math.max(0, budget.safeLeft) ? 1 : 0.25 }}
          />
        ))}
      </div>
    </div>
  );
}
