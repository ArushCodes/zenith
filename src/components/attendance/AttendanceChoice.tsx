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
      className="inline-flex shrink-0 gap-1 rounded-xl border border-border bg-surface2/60 p-1"
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
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${muted ? (selected ? (value ? "bg-rose/5 text-rose/70 ring-1 ring-rose/15" : "bg-emerald-400/5 text-emerald-400/70 ring-1 ring-emerald-400/15") : "text-dim hover:bg-surface hover:text-ink") : selected ? (value ? "bg-rose/20 text-rose ring-1 ring-rose/40" : "bg-emerald-400/15 text-emerald-400 ring-1 ring-emerald-400/35") : value ? "text-rose/80 hover:bg-rose/10 hover:text-rose" : "text-emerald-400/80 hover:bg-emerald-400/10 hover:text-emerald-400"}`}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {value ? "Absent" : "Present"}
          </button>
        );
      })}
    </div>
  );
}
