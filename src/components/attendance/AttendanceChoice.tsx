import { Check, X } from "lucide-react";

export function AttendanceChoice({
  absent,
  disabled,
  muted = false,
  authoritative = false,
  label,
  onChange,
}: {
  absent: boolean;
  disabled?: boolean;
  muted?: boolean;
  authoritative?: boolean;
  label: string;
  onChange: (absent: boolean) => void;
}) {
  return (
    <div
      role="group"
      aria-label={`Attendance for ${label}`}
      className="inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-surface2/50 p-0.5"
    >
      {authoritative && (
        <span
          className="self-center px-1 text-xs text-dim"
          title="Representative record takes priority"
        >
          Rep
        </span>
      )}
      {[false, true].map((value) => {
        const selected = absent === value;
        const Icon = value ? X : Check;
        return (
          <button
            key={String(value)}
            type="button"
            aria-pressed={selected}
            aria-label={`${value ? "Absent" : "Present"}: ${label}`}
            disabled={disabled || authoritative}
            onClick={() => {
              if (!selected) onChange(value);
            }}
            className={`inline-flex min-h-9 items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan disabled:cursor-default ${selected ? (value ? "bg-rose/10 text-rose" : "bg-surface text-ink") : "text-dim hover:bg-surface hover:text-ink"} ${muted ? "opacity-70" : ""}`}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {value ? "Absent" : "Present"}
          </button>
        );
      })}
    </div>
  );
}
