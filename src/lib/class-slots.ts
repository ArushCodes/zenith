const indiaTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export const IPM_CLASS_SLOTS = [
  { start: "10:15", end: "11:30" },
  { start: "11:45", end: "13:00" },
  { start: "14:30", end: "15:45" },
  { start: "16:00", end: "17:15" },
] as const;

/** Assign by India time, never by the browser's local timezone or list order. */
export function classSlotIndex(startAt: string) {
  const time = indiaTime.format(new Date(startAt));
  return IPM_CLASS_SLOTS.findIndex((slot) => time >= slot.start && time < slot.end);
}
