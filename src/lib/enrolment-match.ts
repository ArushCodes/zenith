import { normalizeDob } from "./roster.data";

export function matchesEnrolment(
  record: { mahe_id: string; dob: string; email: string; batch_id: string },
  input: { regNo: string; dob: string; email: string; batchId?: string },
) {
  return (
    record.mahe_id === input.regNo &&
    record.email === input.email &&
    normalizeDob(record.dob) === normalizeDob(input.dob) &&
    (!input.batchId || record.batch_id === input.batchId)
  );
}
