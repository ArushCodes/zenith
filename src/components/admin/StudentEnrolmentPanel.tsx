import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useBatch } from "@/hooks/use-batch";
import { addStudentEnrolment } from "@/lib/enrolments.functions";
import { toast } from "sonner";

export function StudentEnrolmentPanel() {
  const { batches } = useBatch();
  const [batchId, setBatchId] = useState("");
  const save = useMutation({
    mutationFn: addStudentEnrolment,
    onSuccess: () => toast.success("Student record added. They can now register."),
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <details className="my-4 rounded-xl border border-border bg-surface p-4">
      <summary className="cursor-pointer text-sm font-semibold">Add MBA student</summary>
      <p className="mt-2 text-xs text-dim">
        Use the official roster. Students create their own password after matching this record.
      </p>
      <form
        className="mt-3 grid gap-3 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          save.mutate(
            {
              data: {
                batchId,
                maheId: String(data.get("maheId")),
                rollNo: String(data.get("rollNo")),
                name: String(data.get("name")),
                dob: String(data.get("dob")),
                email: String(data.get("email")),
              },
            },
            { onSuccess: () => form.reset() },
          );
        }}
      >
        <label className="text-xs text-dim">
          Batch
          <select
            required
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-border bg-ground p-2 text-ink"
          >
            <option value="">Select batch</option>
            {batches
              .filter((b) => b.slug.startsWith("tapmi-mba-"))
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
          </select>
        </label>
        {[
          { name: "name", label: "Full name", type: "text" },
          { name: "maheId", label: "MAHE ID (12 digits)", type: "text" },
          { name: "rollNo", label: "Student roll number", type: "text" },
          { name: "dob", label: "Date of birth", type: "date" },
          { name: "email", label: "Learner email", type: "email" },
        ].map((field) => (
          <label key={field.name} className="text-xs text-dim">
            {field.label}
            <input
              required
              name={field.name}
              type={field.type}
              className="mt-1 block w-full rounded-lg border border-border bg-ground p-2 text-ink"
            />
          </label>
        ))}
        <button
          disabled={save.isPending}
          className="rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-ground"
          type="submit"
        >
          {save.isPending ? "Saving…" : "Add verified record"}
        </button>
      </form>
    </details>
  );
}
