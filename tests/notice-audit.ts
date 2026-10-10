import assert from "node:assert/strict";
import { fromIstInput, noticeDateTime, noticeDraftSchema } from "../src/lib/notice-drafts";
export function testNoticeAudit() {
  assert.equal(noticeDateTime("2026-10-15"), "2026-10-14T18:30:00.000Z");
  assert.equal(noticeDateTime("2026-10-15", "10:00"), "2026-10-15T04:30:00.000Z");
  assert.equal(fromIstInput("2026-02-30T10:00"), null);
  assert.equal(fromIstInput("2026-10-15T24:00"), null);
  assert.equal(noticeDateTime(""), null);
  const base = { title: "Quiz", type: "quiz", due_at: noticeDateTime("2026-10-15") };
  assert.equal(noticeDraftSchema.parse({ ...base, all_day: true }).all_day, true);
  assert.throws(() =>
    noticeDraftSchema.parse({
      ...base,
      all_day: true,
      end_at: noticeDateTime("2026-10-15", "12:00"),
    }),
  );
  assert.throws(() =>
    noticeDraftSchema.parse({
      ...base,
      due_at: noticeDateTime("2026-10-15", "10:00"),
      end_at: noticeDateTime("2026-10-15", "09:00"),
    }),
  );
  assert.equal(
    noticeDraftSchema.parse({
      ...base,
      due_at: noticeDateTime("2026-10-15", "10:00"),
      end_at: noticeDateTime("2026-10-15", "12:00"),
    }).end_at,
    "2026-10-15T06:30:00.000Z",
  );
  console.log("Passed: reviewed notice unknown times, IST dates and end windows.");
}
