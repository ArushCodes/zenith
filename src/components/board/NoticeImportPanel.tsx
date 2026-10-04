import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useBatch } from "@/hooks/use-batch";
import { importNotice, noticeImportStatus } from "@/lib/notices.functions";
import { EmailInboxPanel } from "./EmailInboxPanel";
import { formatBatchLabel } from "@/lib/batches";

export function NoticeImportPanel() {
  const { batchId, batch, canManage } = useBatch();
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const queryClient = useQueryClient();
  const runImport = useServerFn(importNotice);
  const getStatus = useServerFn(noticeImportStatus);
  const status = useQuery({
    queryKey: ["notice-provider", batchId],
    enabled: !!batchId && canManage,
    retry: false,
    queryFn: () => getStatus({ data: { batchId: batchId! } }),
  });
  const extract = useMutation({
    mutationFn: () =>
      runImport({ data: { batchId: batchId!, body, subject: subject || "Notice" } }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["email-ingest", batchId] });
      toast.success(
        result.duplicate
          ? "This notice is already in the queue"
          : result.count
            ? `${result.count} drafts ready for review`
            : "No events found",
      );
      if (result.count) {
        setBody("");
        setSubject("");
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });
  if (!canManage) return <p className="text-sm text-dim">Moderators and administrators only.</p>;
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border bg-surface p-4 space-y-3">
        <div className="flex justify-between flex-wrap gap-2">
          <h2 className="font-semibold">New notice</h2>
          <span className="text-xs text-dim">{batch ? formatBatchLabel(batch).code : ""}</span>
        </div>
        <input
          aria-label="Notice subject"
          maxLength={500}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject (optional)"
          className="w-full rounded-lg border border-border bg-ground p-2.5 text-sm"
        />
        <textarea
          aria-label="Notice text"
          maxLength={20000}
          rows={7}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Paste an email or notice"
          className="w-full rounded-lg border border-border bg-ground p-2.5 text-sm resize-y"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-xs cursor-pointer rounded-lg border border-border px-3 py-2 focus-within:ring-2 focus-within:ring-cyan">
            <Upload className="size-3.5" />
            Upload text or email
            <input
              type="file"
              accept=".txt,.eml,.md,text/plain,message/rfc822"
              aria-label="Upload notice file"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                e.target.value = "";
                if (file.size > 20000 || !/\.(txt|eml|md)$/i.test(file.name)) {
                  toast.error("Use a .txt, .eml or .md file under 20 KB");
                  return;
                }
                try {
                  const text = await file.text();
                  if (text.includes("\0")) throw new Error("Not a text file");
                  setBody(text);
                  if (!subject) setSubject(file.name.replace(/\.[^.]+$/, ""));
                } catch {
                  toast.error("Could not read this file");
                }
              }}
            />
          </label>
          <button
            type="button"
            disabled={
              !batchId || body.trim().length < 10 || extract.isPending || !status.data?.configured
            }
            onClick={() => extract.mutate()}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan text-ground px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {extract.isPending && <Loader2 className="size-4 animate-spin" />}Create drafts
          </button>
        </div>
        <p className="text-xs text-dim">
          Text is sent to the configured AI provider. Review drafts before publishing.
        </p>
        {status.error && (
          <p role="alert" className="text-xs text-rose">
            Notice import is unavailable. Check the server connection.
          </p>
        )}
        {status.data && !status.data.configured && (
          <p role="status" className="text-xs text-amber">
            Provider setup required. Manual events remain available.
          </p>
        )}
      </section>
      <EmailInboxPanel />
    </div>
  );
}
