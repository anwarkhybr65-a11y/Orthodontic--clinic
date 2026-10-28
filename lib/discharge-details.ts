export type HealthFlag = "diabetes" | "heart" | "bleeding" | "asthma" | "none" | "other";
export type SkeletalClass = "" | "I" | "II" | "III";
export type Stage = "" | "leveling" | "bite" | "finishing" | "retention";
export type Hygiene = "" | "good" | "fair" | "poor";
export type Attendance = "" | "excellent" | "good" | "irregular";
export type Retainer = "" | "clear" | "hawley" | "fixed";
export type Wear = "" | "full" | "night";
export type WireAlloy = "" | "NiTi" | "SS" | "TMA";

export type ImagingRow = {
  date: string;
  place: string;
  delivered: boolean;
};

export type DischargeVisitRow = {
  date: string;
  upperWire: string;
  lowerWire: string;
  procedure: string;
};

export type DischargeDetails = {
  gender: string;
  nationalId: string;
  treatmentStart: string;
  health: HealthFlag[];
  healthOther: string;
  previousOrtho: boolean;
  toothFracture: boolean;
  rootCanal: boolean;
  activeCaries: boolean;
  gumDisease: boolean;
  allergyNone: boolean;
  allergyNickel: boolean;
  allergyLatex: boolean;
  allergyMeds: boolean;
  allergyMedsText: string;
  historyNotes: string;
  chiefComplaint: string;
  skeletalClass: SkeletalClass;
  incisorRelation: string;
  imaging: {
    opg: ImagingRow;
    ceph: ImagingRow;
    cbct: ImagingRow;
  };
  extraction: "" | "none" | "teeth";
  extractionTeeth: string;
  appliances: {
    comprehensive: boolean;
    limited: boolean;
    metal: boolean;
    ceramic: boolean;
    functional: boolean;
    aligners: boolean;
  };
  bondingDate: string;
  lastVisitDate: string;
  totalVisits: string;
  remainingDuration: string;
  stage: Stage;
  hygiene: Hygiene;
  attendance: Attendance;
  whiteSpots: boolean;
  caries: boolean;
  upperWire: string;
  upperAlloy: WireAlloy;
  lowerWire: string;
  lowerAlloy: WireAlloy;
  recentVisits: DischargeVisitRow[];
  upperRetainer: Retainer;
  lowerRetainer: Retainer;
  wear: Wear;
  handoverNotes: string;
  doctorSpecialty: string;
  doctorLicense: string;
  doctorSignDate: string;
  recipientName: string;
  recipientSignDate: string;
  receivedOriginals: boolean;
};

export const HEALTH_OPTIONS: Array<{ id: HealthFlag; label: string }> = [
  { id: "diabetes", label: "سكري" },
  { id: "heart", label: "أمراض قلب" },
  { id: "bleeding", label: "اضطراب نزف" },
  { id: "asthma", label: "ربو" },
  { id: "none", label: "لا يوجد" },
  { id: "other", label: "أخرى" },
];

export const APPLIANCE_FLAGS: Array<{ id: keyof DischargeDetails["appliances"]; label: string }> = [
  { id: "comprehensive", label: "شامل" },
  { id: "limited", label: "محدود" },
  { id: "metal", label: "ثابت معدني" },
  { id: "ceramic", label: "ثابت خزفي" },
  { id: "functional", label: "وظيفي" },
  { id: "aligners", label: "شفّاف Aligners" },
];

export const STAGE_OPTIONS: Array<{ id: Exclude<Stage, "">; label: string }> = [
  { id: "leveling", label: "تسوية ومحاذاة" },
  { id: "bite", label: "تصحيح العضة وإغلاق الفراغات" },
  { id: "finishing", label: "الإنهاء والتفاصيل" },
  { id: "retention", label: "التثبيت" },
];

export const HYGIENE_OPTIONS: Array<{ id: Exclude<Hygiene, "">; label: string }> = [
  { id: "good", label: "جيدة" },
  { id: "fair", label: "متوسطة" },
  { id: "poor", label: "ضعيفة" },
];

export const ATTENDANCE_OPTIONS: Array<{ id: Exclude<Attendance, "">; label: string }> = [
  { id: "excellent", label: "ممتاز" },
  { id: "good", label: "جيد" },
  { id: "irregular", label: "غير منتظم" },
];

export const RETAINER_OPTIONS: Array<{ id: Exclude<Retainer, "">; label: string }> = [
  { id: "clear", label: "مثبت شفاف" },
  { id: "hawley", label: "هاولي" },
  { id: "fixed", label: "ثابت" },
];

export const WEAR_OPTIONS: Array<{ id: Exclude<Wear, "">; label: string }> = [
  { id: "full", label: "طوال اليوم" },
  { id: "night", label: "ليلاً فقط" },
];

export const CLASS_OPTIONS: Array<{ id: Exclude<SkeletalClass, "">; label: string }> = [
  { id: "I", label: "Class I" },
  { id: "II", label: "Class II" },
  { id: "III", label: "Class III" },
];

export const ALLOY_OPTIONS: WireAlloy[] = ["NiTi", "SS", "TMA"];

const IMAGING_KEYS = ["opg", "ceph", "cbct"] as const;

export function emptyImaging(): ImagingRow {
  return { date: "", place: "", delivered: false };
}

export function emptyVisitRow(): DischargeVisitRow {
  return { date: "", upperWire: "", lowerWire: "", procedure: "" };
}

export function emptyDischargeDetails(): DischargeDetails {
  return {
    gender: "",
    nationalId: "",
    treatmentStart: "",
    health: [],
    healthOther: "",
    previousOrtho: false,
    toothFracture: false,
    rootCanal: false,
    activeCaries: false,
    gumDisease: false,
    allergyNone: false,
    allergyNickel: false,
    allergyLatex: false,
    allergyMeds: false,
    allergyMedsText: "",
    historyNotes: "",
    chiefComplaint: "",
    skeletalClass: "",
    incisorRelation: "",
    imaging: { opg: emptyImaging(), ceph: emptyImaging(), cbct: emptyImaging() },
    extraction: "",
    extractionTeeth: "",
    appliances: {
      comprehensive: false,
      limited: false,
      metal: false,
      ceramic: false,
      functional: false,
      aligners: false,
    },
    bondingDate: "",
    lastVisitDate: "",
    totalVisits: "",
    remainingDuration: "",
    stage: "",
    hygiene: "",
    attendance: "",
    whiteSpots: false,
    caries: false,
    upperWire: "",
    upperAlloy: "",
    lowerWire: "",
    lowerAlloy: "",
    recentVisits: [emptyVisitRow(), emptyVisitRow(), emptyVisitRow()],
    upperRetainer: "",
    lowerRetainer: "",
    wear: "",
    handoverNotes: "",
    doctorSpecialty: "تقويم الأسنان",
    doctorLicense: "",
    doctorSignDate: "",
    recipientName: "",
    recipientSignDate: "",
    receivedOriginals: false,
  };
}

function text(value: unknown, max = 500) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function yes(value: unknown) {
  return value === true;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function imaging(value: unknown): ImagingRow {
  const row = value && typeof value === "object" ? (value as ImagingRow) : emptyImaging();
  return { date: text(row.date, 20), place: text(row.place, 200), delivered: yes(row.delivered) };
}

export function normalizeDischargeDetails(value: unknown, legacy?: { reason?: string; procedures?: string; recommendations?: string }): DischargeDetails {
  const base = emptyDischargeDetails();
  const raw = value && typeof value === "object" ? (value as Partial<DischargeDetails>) : {};
  const health = Array.isArray(raw.health) ? raw.health.filter((item): item is HealthFlag => HEALTH_OPTIONS.some((option) => option.id === item)) : [];
  const visits = Array.isArray(raw.recentVisits)
    ? raw.recentVisits.slice(0, 8).map((row) => ({
        date: text(row?.date, 20),
        upperWire: text(row?.upperWire, 80),
        lowerWire: text(row?.lowerWire, 80),
        procedure: text(row?.procedure, 500),
      }))
    : base.recentVisits;
  const imagingRaw = raw.imaging ?? base.imaging;
  return {
    ...base,
    ...raw,
    gender: oneOf(raw.gender, ["", "ذكر", "أنثى"] as const, ""),
    nationalId: text(raw.nationalId, 20),
    treatmentStart: text(raw.treatmentStart, 20),
    health,
    healthOther: text(raw.healthOther, 200),
    previousOrtho: yes(raw.previousOrtho),
    toothFracture: yes(raw.toothFracture),
    rootCanal: yes(raw.rootCanal),
    activeCaries: yes(raw.activeCaries),
    gumDisease: yes(raw.gumDisease),
    allergyNone: yes(raw.allergyNone),
    allergyNickel: yes(raw.allergyNickel),
    allergyLatex: yes(raw.allergyLatex),
    allergyMeds: yes(raw.allergyMeds),
    allergyMedsText: text(raw.allergyMedsText, 200),
    historyNotes: text(raw.historyNotes, 2000),
    chiefComplaint: text(raw.chiefComplaint, 2000),
    skeletalClass: oneOf(raw.skeletalClass, ["", "I", "II", "III"] as const, ""),
    incisorRelation: text(raw.incisorRelation, 300),
    imaging: {
      opg: imaging(imagingRaw.opg),
      ceph: imaging(imagingRaw.ceph),
      cbct: imaging(imagingRaw.cbct),
    },
    extraction: oneOf(raw.extraction, ["", "none", "teeth"] as const, ""),
    extractionTeeth: text(raw.extractionTeeth, 120),
    appliances: {
      comprehensive: yes(raw.appliances?.comprehensive),
      limited: yes(raw.appliances?.limited),
      metal: yes(raw.appliances?.metal),
      ceramic: yes(raw.appliances?.ceramic),
      functional: yes(raw.appliances?.functional),
      aligners: yes(raw.appliances?.aligners),
    },
    bondingDate: text(raw.bondingDate, 20),
    lastVisitDate: text(raw.lastVisitDate, 20),
    totalVisits: text(raw.totalVisits, 20),
    remainingDuration: text(raw.remainingDuration, 80),
    stage: oneOf(raw.stage, ["", "leveling", "bite", "finishing", "retention"] as const, ""),
    hygiene: oneOf(raw.hygiene, ["", "good", "fair", "poor"] as const, ""),
    attendance: oneOf(raw.attendance, ["", "excellent", "good", "irregular"] as const, ""),
    whiteSpots: yes(raw.whiteSpots),
    caries: yes(raw.caries),
    upperWire: text(raw.upperWire, 80),
    upperAlloy: oneOf(raw.upperAlloy, ["", "NiTi", "SS", "TMA"] as const, ""),
    lowerWire: text(raw.lowerWire, 80),
    lowerAlloy: oneOf(raw.lowerAlloy, ["", "NiTi", "SS", "TMA"] as const, ""),
    recentVisits: visits.length ? visits : base.recentVisits,
    upperRetainer: oneOf(raw.upperRetainer, ["", "clear", "hawley", "fixed"] as const, ""),
    lowerRetainer: oneOf(raw.lowerRetainer, ["", "clear", "hawley", "fixed"] as const, ""),
    wear: oneOf(raw.wear, ["", "full", "night"] as const, ""),
    handoverNotes: text(raw.handoverNotes, 4000) || text(legacy?.reason, 4000),
    doctorSpecialty: text(raw.doctorSpecialty, 120) || "تقويم الأسنان",
    doctorLicense: text(raw.doctorLicense, 40),
    doctorSignDate: text(raw.doctorSignDate, 20),
    recipientName: text(raw.recipientName, 200),
    recipientSignDate: text(raw.recipientSignDate, 20),
    receivedOriginals: yes(raw.receivedOriginals),
  };
}

export function labelOf<T extends string>(options: Array<{ id: T; label: string }>, id: string) {
  return options.find((item) => item.id === id)?.label ?? "";
}

export const IMAGING_ROWS: Array<{ key: (typeof IMAGING_KEYS)[number]; label: string }> = [
  { key: "opg", label: "أشعة بانوراما OPG" },
  { key: "ceph", label: "أشعة سيفالومترية جانبية Lat. Ceph" },
  { key: "cbct", label: "أشعة مقطعية CBCT" },
];
