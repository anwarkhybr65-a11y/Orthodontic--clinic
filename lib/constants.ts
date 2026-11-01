import type { AppliancesState, Jaw, RecordsMap, Status } from "@/lib/types";

export const RECORD_OPTIONS = [
  { key: "photos", label: "صور فوتوغرافية" },
  { key: "panoramic", label: "أشعة بانورامية" },
  { key: "lateral", label: "أشعة جانبية" },
  { key: "scan", label: "مسح / قوالب" },
  { key: "intraoral", label: "صور داخل الفم" },
] as const;

export const APPLIANCE_OPTIONS = [
  { key: "metal", label: "تقويم ثابت معدني" },
  { key: "ceramic", label: "تقويم خزفي" },
  { key: "aligners", label: "مصففات شفافة" },
  { key: "removable", label: "تقويم متحرك" },
  { key: "other", label: "خطة أخرى" },
] as const;

export const JAW_OPTIONS: Array<{ value: Exclude<Jaw, "">; label: string }> = [
  { value: "upper", label: "علوي" },
  { value: "lower", label: "سفلي" },
  { value: "both", label: "كلاهما" },
];

export const GOAL_LABELS = ["الهدف الأول", "الهدف الثاني", "الهدف الثالث"] as const;

export const CLINICAL_IMAGE_SLOTS = [
  { key: "frontal", label: "Frontal" },
  { key: "buccal-right", label: "Buccal right" },
  { key: "buccal-left", label: "Buccal left" },
  { key: "upper", label: "Upper" },
  { key: "lower", label: "Lower" },
  { key: "extra-oral-frontal", label: "Extra oral frontal" },
  { key: "smiling", label: "Smiling" },
  { key: "extra-oral-profil", label: "Extra oral profil" },
  { key: "panorama", label: "Panorama" },
  { key: "ceph", label: "Ceph" },
] as const;

export const RECORD_TITLES = [
  "ملاحظة سريرية",
  "صور فوتوغرافية",
  "أشعة بانورامية",
  "أشعة جانبية",
  "مسح / قوالب",
  "صور داخل الفم",
  "أخرى",
] as const;

export const STATUS_META: Record<Status, { label: string; className: string }> = {
  active: { label: "بلا خطة", className: "bg-amber-100 text-amber-800" },
  incomplete: { label: "قيد العلاج", className: "bg-sage-100 text-sage-800" },
  completed: { label: "منتهية", className: "bg-emerald-100 text-emerald-800" },
  discharged: { label: "مخالصة", className: "bg-rose-100 text-rose-800" },
  other: { label: "عامة", className: "bg-slate-100 text-slate-700" },
};

export const DEFAULT_DISCLAIMER =
  "أقرّ بأنني أرغب في عدم استكمال العلاج التقويمي في هذه العيادة، وقد فُهمت عليّ الإجراءات التي أُنجزت حتى تاريخه والمخاطر المحتملة للتوقف، بما في ذلك انتكاس الحركة السنية وتأثر الإطباق. أُخلي مسؤولية الطبيب والعيادة عن أي تبعات تترتب على عدم إكمال الخطة بعد هذا التاريخ، وقد استلمت التوصيات الطبية اللازمة.";

export function emptyRecords(): RecordsMap {
  return {
    photos: false,
    panoramic: false,
    lateral: false,
    scan: false,
    intraoral: false,
  };
}

export function emptyAppliances(): AppliancesState {
  return {
    metal: false,
    ceramic: false,
    aligners: false,
    removable: false,
    other: false,
    otherText: "",
  };
}

export function jawLabel(jaw: Jaw) {
  return JAW_OPTIONS.find((item) => item.value === jaw)?.label ?? "—";
}
