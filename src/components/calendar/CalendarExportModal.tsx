import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Check, Copy, Download, ExternalLink, Smartphone, X } from "lucide-react";
import { toast } from "sonner";
import type { ClassSession } from "@/lib/batches";
import type { Deadline } from "@/lib/deadlines";
import { generateIcalFeed } from "@/lib/ical-generator";
import { trackActivity } from "@/lib/telemetry";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchName: string;
  batchId?: string;
  sessions: ClassSession[];
  deadlines: Deadline[];
};

export function CalendarExportModal({
  open,
  onOpenChange,
  batchName,
  batchId,
  sessions,
  deadlines,
}: Props) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  // Webcal / subscribe URL
  const domain = typeof window !== "undefined" ? window.location.origin : "https://www.zenithfor.me";
  const webcalUrl = `webcal://${domain.replace(/^https?:\/\//, "")}/api/calendar?batchId=${batchId || ""}`;

  function handleDownloadIcs() {
    try {
      const ics = generateIcalFeed({
        batchName,
        sessions,
        deadlines,
      });
      const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zenith_${batchName.toLowerCase().replace(/[\s-]+/g, "_")}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      void trackActivity({
        action: "calendar_export",
        title: "Downloaded .ics Calendar file",
        batchId,
      });

      toast.success("Calendar (.ics) downloaded! Open it to import to Apple or Google Calendar.");
    } catch (e: any) {
      toast.error("Failed to generate calendar: " + e.message);
    }
  }

  function handleCopyWebcal() {
    navigator.clipboard.writeText(webcalUrl).then(() => {
      setCopied(true);
      void trackActivity({
        action: "calendar_export",
        title: "Copied Webcal Subscription link",
        batchId,
      });
      toast.success("Calendar subscription URL copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-cyan/12 text-cyan border border-cyan/25">
              <Calendar className="size-5" />
            </span>
            <div>
              <h3 className="font-display text-base font-bold text-ink">
                Subscribe & Sync Calendar (.ics)
              </h3>
              <p className="text-[11px] text-dim">
                Sync {batchName} classes, exams, and deadlines to your phone lock screen
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-1.5 text-dim hover:text-ink hover:bg-surface2"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Action 1: Direct Download */}
        <div className="rounded-xl border border-border/80 bg-surface2/40 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-display text-xs font-bold text-ink">Option 1: Instant .ics Download</h4>
              <p className="text-[11px] text-dim">
                Download file and open directly in Apple Calendar, Google Calendar, or Outlook.
              </p>
            </div>
            <button
              onClick={handleDownloadIcs}
              className="flex items-center gap-1.5 rounded-xl bg-cyan px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-cyan/90 transition-all cursor-pointer shrink-0"
            >
              <Download className="size-3.5" />
              <span>Download .ics</span>
            </button>
          </div>
        </div>

        {/* Action 2: Webcal Subscription */}
        <div className="rounded-xl border border-border/80 bg-surface2/40 p-4 space-y-2.5">
          <div>
            <h4 className="font-display text-xs font-bold text-ink">Option 2: Live Calendar Subscription</h4>
            <p className="text-[11px] text-dim">
              Subscribe via URL so changes and timetable updates automatically sync in real time.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={webcalUrl}
              className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 font-mono text-[11px] text-dim selection:bg-cyan/20"
            />
            <button
              onClick={handleCopyWebcal}
              className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:border-cyan/40 transition-colors cursor-pointer"
            >
              {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-2 rounded-xl border border-border/50 bg-surface2/20 p-3 text-[11px] text-dim">
          <p className="font-bold text-ink">How to add on phone:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>
              <strong>iPhone (iOS):</strong> Tap Download .ics $\rightarrow$ Open in Calendar $\rightarrow$ "Add All". Or go to Settings $\rightarrow$ Calendar $\rightarrow$ Accounts $\rightarrow$ Add Subscribed Calendar $\rightarrow$ Paste link.
            </li>
            <li>
              <strong>Google Calendar:</strong> Open Google Calendar on web $\rightarrow$ "+ Other calendars" $\rightarrow$ "From URL" $\rightarrow$ Paste the link.
            </li>
          </ul>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-border bg-surface px-4 py-1.5 text-xs font-semibold text-ink hover:bg-surface2 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
