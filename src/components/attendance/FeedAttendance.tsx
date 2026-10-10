import { useState } from "react";
import { ChevronDown, UserCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { attendanceColor } from "@/lib/attendance-colors";
import { getBunkStatus, type CreditCourse } from "@/lib/attendance";
import { sessionSubject } from "@/lib/attendance";
import { isTeachingClass, subjectFullName, subjectShortName } from "@/lib/courses";
import type { ClassSession } from "@/lib/batches";

export function FeedAttendance({
  catalog,
  sessions,
  records,
  loading,
  error,
  onSeeAll,
}: {
  catalog: CreditCourse[];
  sessions: ClassSession[];
  records: Map<string, { held: number; absent: number }>;
  loading: boolean;
  error: boolean;
  onSeeAll?: () => void;
}) {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const normalize = (code: string) => code.toLowerCase().replace(/[^a-z0-9]/g, "");
  const rows = [...new Map(catalog.map((course) => [normalize(course.code), course])).values()]
    .map((course) => {
      const subjectKeys = new Set(
        sessions
          .filter(
            (s) =>
              isTeachingClass(s) &&
              (normalize(s.course_code ?? "") === normalize(course.code) ||
                subjectFullName(sessionSubject(s)) === subjectFullName(course.name)),
          )
          .map(sessionSubject),
      );
      const counted = [...subjectKeys].map((key) => records.get(key));
      const absent = counted.reduce((sum, row) => sum + (row?.absent ?? 0), 0);
      const held = counted.reduce((sum, row) => sum + (row?.held ?? 0), 0);
      const budget = getBunkStatus(course.credits, absent);
      return {
        ...course,
        absent,
        held,
        budget,
        left: course.credits - absent,
        color: attendanceColor(budget.safeLeft, budget.allowed, budget.excess),
      };
    })
    .sort((a, b) => a.left - b.left || a.name.localeCompare(b.name));
  const selected = rows.find((row) => row.code === selectedCode) ?? rows[0];
  const label = subjectShortName;
  const allowance = (row: (typeof rows)[number]) =>
    row.left < 0 ? `${-row.left} over` : `${row.left} left`;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={loading || error || !selected}
          className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-xl border border-border bg-surface2/70 px-3 py-2 text-sm font-semibold hover:border-cyan/50 disabled:opacity-60"
          aria-label="Show attendance for all subjects"
        >
          <UserCheck className="size-4 shrink-0 text-dim" />
          <span className="truncate">
            {loading
              ? "Attendance…"
              : error
                ? "Attendance unavailable"
                : selected
                  ? label(selected.name)
                  : "Attendance"}
          </span>
          {selected && !loading && !error && (
            <span className="shrink-0 tabular-nums" style={{ color: selected.color }}>
              {allowance(selected)}
            </span>
          )}
          <ChevronDown className="size-3.5 shrink-0 text-dim" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 max-w-[calc(100vw-2rem)] rounded-2xl border-border bg-surface p-2 text-ink"
      >
        <div className="flex items-center justify-between px-2 py-2 text-sm font-semibold">
          <span>Attendance</span>
          <span className="text-xs text-dim">Leaves left</span>
        </div>
        <div className="max-h-[min(65vh,400px)] overflow-y-auto">
          {rows.map((row) => (
            <button
              key={row.code}
              type="button"
              aria-pressed={selected?.code === row.code}
              onClick={() => setSelectedCode(row.code)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-surface2 ${selected?.code === row.code ? "bg-surface2" : ""}`}
            >
              <span className="min-w-0">
                <span className="block font-semibold">{label(row.name)}</span>
                <span className="text-xs text-dim">
                  {row.absent} missed · {row.held} held
                </span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums" style={{ color: row.color }}>
                {allowance(row)}
              </span>
            </button>
          ))}
        </div>
        {onSeeAll && (
          <button
            type="button"
            onClick={onSeeAll}
            className="mt-1 w-full rounded-xl py-2 text-sm font-semibold text-cyan hover:bg-cyan/10"
          >
            Full attendance
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
