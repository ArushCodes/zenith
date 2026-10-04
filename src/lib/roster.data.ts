export interface RosterStudent {
  sno: number;
  maheId: string;
  last4: string;
  rollNo: string;
  name: string;
  dob: string; // DD/MM/YYYY
  gender?: "M" | "F";
  batchId: string;
}

export const IPM1_BATCH_ID = "ee4a435d-4003-4a22-940b-0ee0e676b6f5"; // Batch 2026–2031
export const IPM2_BATCH_ID = "0a8267da-7cb7-4c05-9571-b9aaac94a2f7"; // Batch 2025–2030
export const IPM3_BATCH_ID = "92e4710b-3c3e-433c-a3bc-23a02b98e385"; // Batch 2024–2029
export const MBA1_BATCH_ID = "edda3f8e-2a44-4b6a-bbfd-ca52fc7d0365";
export const MBA2_BATCH_ID = "a2055f1c-6551-4514-bc8c-72bc48d03b2e";

export interface IPMBatchOption {
  id: string;
  code: string;
  name: string;
  years: string;
  slug: string;
  hasRoster: boolean;
}

export const IPM_BATCHES: IPMBatchOption[] = [
  {
    id: MBA1_BATCH_ID,
    code: "MBA 1",
    name: "MBA Batch 1",
    years: "2026–2028",
    slug: "tapmi-mba-2026",
    hasRoster: true,
  },
  {
    id: MBA2_BATCH_ID,
    code: "MBA 2",
    name: "MBA Batch 2",
    years: "2025–2027",
    slug: "tapmi-mba-2025",
    hasRoster: true,
  },
  {
    id: IPM1_BATCH_ID,
    code: "IPM 1",
    name: "IPM Batch 1",
    years: "2026–2031",
    slug: "tapmi-ipm-2026",
    hasRoster: true,
  },
  {
    id: IPM2_BATCH_ID,
    code: "IPM 2",
    name: "IPM Batch 2",
    years: "2025–2030",
    slug: "tapmi-ipm-2025",
    hasRoster: false,
  },
  {
    id: IPM3_BATCH_ID,
    code: "IPM 3",
    name: "IPM Batch 3",
    years: "2024–2029",
    slug: "tapmi-ipm-2024",
    hasRoster: false,
  },
].sort((a, b) => a.code.localeCompare(b.code));

export function normalizeDob(input?: string | null): string {
  if (!input) return "";
  const s = input.trim();

  // YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch && isoMatch[1] && isoMatch[2] && isoMatch[3]) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, "0");
    const d = isoMatch[3].padStart(2, "0");
    return `${d}/${m}/${y}`;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch && dmyMatch[1] && dmyMatch[2] && dmyMatch[3]) {
    const d = dmyMatch[1].padStart(2, "0");
    const m = dmyMatch[2].padStart(2, "0");
    const y = dmyMatch[3];
    return `${d}/${m}/${y}`;
  }

  return s;
}

export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export const INSTITUTION_INFO = {
  university: "MAHE Manipal",
  universityFullName: "Manipal Academy of Higher Education",
  college: "TAPMI",
  collegeFullName: "T. A. Pai Management Institute",
  course: "IPM (BBA/MBA)",
  courseFullName: "Integrated Programme in Management (BBA/MBA)",
  defaultBatch: "Batch 2026–2031",
};

export function getBatchInfo(batchId?: string) {
  const found = IPM_BATCHES.find((b) => b.id === batchId);
  if (found) {
    return {
      batchName: `Batch ${found.years}`,
      batchCode: found.code,
      years: found.years,
    };
  }
  return {
    batchName: INSTITUTION_INFO.defaultBatch,
    batchCode: "IPM 1",
    years: "2026–2031",
  };
}
