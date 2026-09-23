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
];

export const IPM1_ROSTER: RosterStudent[] = [
  { sno: 1, maheId: "261600130168", last4: "0168", rollNo: "26U01", name: "AANYA BHARDWAJ", dob: "24/05/2008", gender: "F", batchId: IPM1_BATCH_ID },
  { sno: 2, maheId: "261600130148", last4: "0148", rollNo: "26U02", name: "AANYA SUSAN RANIL", dob: "21/02/2009", gender: "F", batchId: IPM1_BATCH_ID },
  { sno: 3, maheId: "261600130080", last4: "0080", rollNo: "26U03", name: "AARUSHI PRABHAKAR SINGH", dob: "05/05/2008", gender: "F", batchId: IPM1_BATCH_ID },
  { sno: 4, maheId: "261600130120", last4: "0120", rollNo: "26U04", name: "AAYUSH CHADHA", dob: "21/06/2008", gender: "M", batchId: IPM1_BATCH_ID },
  { sno: 5, maheId: "261600130006", last4: "0006", rollNo: "26U05", name: "AAYUSH SURYA UPADHYAY", dob: "10/09/2005", gender: "M", batchId: IPM1_BATCH_ID },
  { sno: 6, maheId: "261600130114", last4: "0114", rollNo: "26U06", name: "ABHIJEET SINGH DEWAL", dob: "06/08/2007", gender: "M", batchId: IPM1_BATCH_ID },
  { sno: 7, maheId: "261600130116", last4: "0116", rollNo: "26U07", name: "ABHINAV REDDY", dob: "18/10/2008", gender: "M", batchId: IPM1_BATCH_ID },
  { sno: 8, maheId: "261600130096", last4: "0096", rollNo: "26U08", name: "ABHINAV SUNIL", dob: "19/11/2008", gender: "M", batchId: IPM1_BATCH_ID },
  { sno: 9, maheId: "261600130028", last4: "0028", rollNo: "26U09", name: "ADITI SHANDILYA", dob: "13/04/2008", gender: "F", batchId: IPM1_BATCH_ID },
  { sno: 10, maheId: "261600130176", last4: "0176", rollNo: "26U10", name: "ADITI SUBASHCHANDRA SANKALKAR", dob: "07/11/2008", gender: "F", batchId: IPM1_BATCH_ID },
  { sno: 11, maheId: "261600130150", last4: "0150", rollNo: "26U11", name: "ADRITA SINHA", dob: "29/05/2008", gender: "F", batchId: IPM1_BATCH_ID },
  { sno: 12, maheId: "261600130088", last4: "0088", rollNo: "26U12", name: "AKSH GUPTA", dob: "13/01/2008", gender: "M", batchId: IPM1_BATCH_ID },
  { sno: 13, maheId: "261600130072", last4: "0072", rollNo: "26U13", name: "AKSHAJ NEELESH KUMAR", dob: "13/11/2006", gender: "M", batchId: IPM1_BATCH_ID },
  { sno: 14, maheId: "261600130210", last4: "0210", rollNo: "26U14", name: "ANOUSHKA SINHA", dob: "18/11/2007", gender: "F", batchId: IPM1_BATCH_ID },
  { sno: 15, maheId: "261600130100", last4: "0100", rollNo: "26U15", name: "ANSH JAIN", dob: "16/02/2008", gender: "M", batchId: IPM1_BATCH_ID },
  { sno: 16, maheId: "261600130038", last4: "0038", rollNo: "26U16", name: "ARNAV TAKSALI", dob: "11/02/2008", gender: "M", batchId: IPM1_BATCH_ID },
  { sno: 17, maheId: "261600130020", last4: "0020", rollNo: "26U17", name: "ARUSH VIPUL GAUR", dob: "14/11/2006", gender: "M", batchId: IPM1_BATCH_ID },
  { sno: 18, maheId: "261600130042", last4: "0042", rollNo: "26U18", name: "ARYABIR SINGH SUNDARAY", dob: "25/10/2008", gender: "M", batchId: IPM1_BATCH_ID },
  { sno: 19, maheId: "261600130132", last4: "0132", rollNo: "26U19", name: "ATHARVA TYAGI", dob: "05/09/2008", gender: "M", batchId: IPM1_BATCH_ID },
  { sno: 20, maheId: "261600130078", last4: "0078", rollNo: "26U20", name: "CHERUVU LASYA VAISHNAVI", dob: "14/06/2008", gender: "F", batchId: IPM1_BATCH_ID },
  { sno: 21, maheId: "261600130160", last4: "0160", rollNo: "26U21", name: "DHAIRYA SARDA", dob: "27/07/2007", gender: "M", batchId: IPM1_BATCH_ID },
  { sno: 22, maheId: "261600130186", last4: "0186", rollNo: "26U22", name: "GAURANG SINGH", dob: "07/05/2007", gender: "M", batchId: IPM1_BATCH_ID },
  { sno: 23, maheId: "261600130058", last4: "0058", rollNo: "26U23", name: "GONGALAREDDY KASHVI REDDY", dob: "11/04/2008", gender: "F", batchId: IPM1_BATCH_ID },
  { sno: 24, maheId: "261600130030", last4: "0030", rollNo: "26U24", name: "GURUVALLI DINESH KALINGA", dob: "19/11/2008", gender: "M", batchId: IPM1_BATCH_ID },
  { sno: 25, maheId: "261600130198", last4: "0198", rollNo: "26U25", name: "ISHAN GODBOLE", dob: "02/06/2008", gender: "M", batchId: IPM1_BATCH_ID },
  { sno: 26, maheId: "261600130118", last4: "0118", rollNo: "26U26", name: "ISHIKA SRIVASTAVA", dob: "18/05/2007", gender: "F", batchId: IPM1_BATCH_ID },
  { sno: 27, maheId: "261600130012", last4: "0012", rollNo: "26U27", name: "JIAH SINHA", dob: "05/12/2008", gender: "F", batchId: IPM1_BATCH_ID },
  { sno: 28, maheId: "261600130090", last4: "0090", rollNo: "26U28", name: "JIYA MILIND GUNJKAR", dob: "10/11/2008", gender: "F", batchId: IPM1_BATCH_ID },
  { sno: 29, maheId: "261600130182", last4: "0182", rollNo: "26U29", name: "KANISHKA THATHGUR", dob: "31/01/2007", gender: "F", batchId: IPM1_BATCH_ID },
  { sno: 30, maheId: "261600130004", last4: "0004", rollNo: "26U30", name: "KARISHMA KARTHIHAIVELAN", dob: "10/10/2008", gender: "F", batchId: IPM1_BATCH_ID },
  { sno: 31, maheId: "261600130184", last4: "0184", rollNo: "26U31", name: "KARTIK GANDHI", dob: "19/10/2008", gender: "M", batchId: IPM1_BATCH_ID },
  { sno: 32, maheId: "261600130200", last4: "0200", rollNo: "26U32", name: "KRISHIV ANKIT AGGARWAL", dob: "08/08/2008", gender: "M", batchId: IPM1_BATCH_ID },
  { sno: 33, maheId: "261600130040", last4: "0040", rollNo: "26U33", name: "KUMILI SRI SAI NANDITHA", dob: "21/01/2009", gender: "F", batchId: IPM1_BATCH_ID },
  { sno: 34, maheId: "261600130092", last4: "0092", rollNo: "26U34", name: "LEKSHMI KRISHNAN", dob: "06/05/2008", gender: "F", batchId: IPM1_BATCH_ID },
  { sno: 35, maheId: "261600130202", last4: "0202", rollNo: "26U35", name: "MANSI SINGH", dob: "07/05/2008", gender: "F", batchId: IPM1_BATCH_ID },
  { sno: 36, maheId: "261600130146", last4: "0146", rollNo: "26U36", name: "MILAN SAJI THOMAS", dob: "20/09/2006", gender: "M", batchId: IPM1_BATCH_ID },
  { sno: 37, maheId: "261600130170", last4: "0170", rollNo: "26U37", name: "MOKSH JAIN", dob: "29/08/2008", gender: "M", batchId: IPM1_BATCH_ID },
  { sno: 38, maheId: "261600130074", last4: "0074", rollNo: "26U38", name: "NIMIT VINOD", dob: "29/10/2008", gender: "M", batchId: IPM1_BATCH_ID },
  { sno: 39, maheId: "261600130066", last4: "0066", rollNo: "26U39", name: "NUMANSH MOOKIM", dob: "18/11/2008", gender: "M", batchId: IPM1_BATCH_ID },
  { sno: 40, maheId: "261600130018", last4: "0018", rollNo: "26U40", name: "OM S AGRAWAL", dob: "14/12/2007", gender: "M", batchId: IPM1_BATCH_ID },
  { sno: 41, maheId: "261600130204", last4: "0204", rollNo: "26U41", name: "PALKAR VAIDEHI SACHIN", dob: "18/10/2008", gender: "F", batchId: IPM1_BATCH_ID },
  { sno: 42, maheId: "261600130068", last4: "0068", rollNo: "26U42", name: "PRAKHAR AGARWAL", dob: "09/06/2008", gender: "M", batchId: IPM1_BATCH_ID },
  { sno: 43, maheId: "261600130174", last4: "0174", rollNo: "26U43", name: "PRANAV CHOPRA", dob: "03/09/2008", gender: "M", batchId: IPM1_BATCH_ID },
  { sno: 44, maheId: "261600130044", last4: "0044", rollNo: "26U44", name: "PRIYANSH PRASOON UPADHYAY", dob: "24/11/2007", gender: "M", batchId: IPM1_BATCH_ID },
  { sno: 45, maheId: "261600130152", last4: "0152", rollNo: "26U45", name: "RAAGI PARASHAR", dob: "05/07/2009", gender: "F", batchId: IPM1_BATCH_ID },
  { sno: 46, maheId: "261600130026", last4: "0026", rollNo: "26U46", name: "RAVURI NAGASAI SANJANA", dob: "21/07/2008", gender: "F", batchId: IPM1_BATCH_ID },
  { sno: 47, maheId: "261600130140", last4: "0140", rollNo: "26U47", name: "REDDIBATTULA ROSHAN REDDY", dob: "12/11/2008", gender: "M", batchId: IPM1_BATCH_ID },
  { sno: 48, maheId: "261600130052", last4: "0052", rollNo: "26U48", name: "RISHIL SANDHESH DANDAMUDI", dob: "20/01/2009", gender: "M", batchId: IPM1_BATCH_ID },
  { sno: 49, maheId: "261600130194", last4: "0194", rollNo: "26U49", name: "SAANVI KUMAR KUMAR", dob: "07/06/2007", gender: "F", batchId: IPM1_BATCH_ID },
  { sno: 50, maheId: "261600130138", last4: "0138", rollNo: "26U50", name: "SAANVI RIJHWANI", dob: "01/01/2009", gender: "F", batchId: IPM1_BATCH_ID },
  { sno: 51, maheId: "261600130014", last4: "0014", rollNo: "26U51", name: "SAMITA BHALACHANDRA NAYAK", dob: "18/05/2008", gender: "F", batchId: IPM1_BATCH_ID },
  { sno: 52, maheId: "261600130158", last4: "0158", rollNo: "26U52", name: "SANCHI AGARWAL", dob: "14/10/2006", gender: "F", batchId: IPM1_BATCH_ID },
  { sno: 53, maheId: "261600130050", last4: "0050", rollNo: "26U53", name: "SANJNA SINGH", dob: "28/03/2008", gender: "F", batchId: IPM1_BATCH_ID },
  { sno: 54, maheId: "261600130084", last4: "0084", rollNo: "26U54", name: "SANONA ABDU SHAREEF", dob: "21/07/2006", gender: "F", batchId: IPM1_BATCH_ID },
  { sno: 55, maheId: "261600130060", last4: "0060", rollNo: "26U56", name: "SHARANYA RASTOGI", dob: "14/12/2007", gender: "F", batchId: IPM1_BATCH_ID },
  { sno: 56, maheId: "261600130054", last4: "0054", rollNo: "26U57", name: "SHRAVANI MAHESH MALI", dob: "16/10/2007", gender: "F", batchId: IPM1_BATCH_ID },
  { sno: 57, maheId: "261600130008", last4: "0008", rollNo: "26U58", name: "SIDDHARTH JAYAN", dob: "26/02/2008", gender: "M", batchId: IPM1_BATCH_ID },
  { sno: 58, maheId: "261600130180", last4: "0180", rollNo: "26U59", name: "N SRI NITHYA", dob: "14/07/2008", gender: "F", batchId: IPM1_BATCH_ID },
  { sno: 59, maheId: "261600130172", last4: "0172", rollNo: "26U60", name: "TANISHKA UPADHYAY", dob: "23/07/2007", gender: "F", batchId: IPM1_BATCH_ID },
  { sno: 60, maheId: "261600130076", last4: "0076", rollNo: "26U61", name: "TANMAY BHUTADA", dob: "05/11/2007", gender: "M", batchId: IPM1_BATCH_ID },
  { sno: 61, maheId: "261600130178", last4: "0178", rollNo: "26U62", name: "TUSHITA MISHRA", dob: "27/02/2008", gender: "F", batchId: IPM1_BATCH_ID },
  { sno: 62, maheId: "261600130154", last4: "0154", rollNo: "26U63", name: "UTKARSH AGARWAL", dob: "11/03/2008", gender: "M", batchId: IPM1_BATCH_ID },
  { sno: 63, maheId: "261600130166", last4: "0166", rollNo: "26U64", name: "VANSHAJ CHAWLA", dob: "14/02/2008", gender: "M", batchId: IPM1_BATCH_ID },
  { sno: 64, maheId: "261600130196", last4: "0196", rollNo: "26U65", name: "VASCURI SURYA MANVITH", dob: "06/06/2009", gender: "M", batchId: IPM1_BATCH_ID },
  { sno: 65, maheId: "261600130082", last4: "0082", rollNo: "26U66", name: "VIDULA PRADIP DESAI", dob: "07/12/2008", gender: "F", batchId: IPM1_BATCH_ID },
];

export function normalizeDob(input?: string | null): string {
  if (!input) return "";
  const s = input.trim();

  // YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, "0");
    const d = isoMatch[3].padStart(2, "0");
    return `${d}/${m}/${y}`;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
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

export function findStudentInRoster(regInput: string, rawDob: string): RosterStudent | null {
  const digitsOnly = (regInput || "").trim().replace(/\D/g, "");
  const cleanDob = normalizeDob(rawDob);
  if (!digitsOnly || digitsOnly.length !== 12 || !cleanDob) return null;

  return (
    IPM1_ROSTER.find(
      (s) =>
        s.maheId === digitsOnly &&
        normalizeDob(s.dob) === cleanDob
    ) || null
  );
}

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

