export const PATIENT_TYPES = [
  { id: "new", label: "جديد" },
  { id: "active", label: "قيد العلاج" },
  { id: "retention", label: "تثبيت" },
] as const;

export const PAYMENT_METHODS = [
  { id: "full", label: "مدفوع كامل" },
  { id: "installments", label: "اقساط" },
  { id: "per_visit", label: "بالزياره" },
] as const;

export const PROCEDURES = [
  { id: "monthly", label: "شد شهري", jaw: true, notes: false },
  { id: "wire", label: "واير جديد", jaw: false, notes: false },
  { id: "bracket", label: "اصلاح براكت فقط", jaw: false, notes: false },
  { id: "bonding", label: "تركيب تقويم", jaw: true, notes: false },
  { id: "removal", label: "فك تقويم", jaw: false, notes: false },
  { id: "retainer", label: "ريتينر", jaw: false, notes: false },
  { id: "consult", label: "استشاره", jaw: false, notes: true },
  { id: "observe", label: "متابعه دون اجراء", jaw: false, notes: true },
] as const;

export const VISIT_JAWS = [
  { id: "one", label: "فك واحد" },
  { id: "both", label: "فكين" },
] as const;

export const BREAK_REASONS = [
  { id: "patient", label: "من المريض" },
  { id: "clinic", label: "من العياده" },
] as const;

export type ProcedureCode = (typeof PROCEDURES)[number]["id"];

export function optionLabel(list: readonly { id: string; label: string }[], id: string) {
  return list.find((item) => item.id === id)?.label ?? "";
}

export function procedureOf(id: string) {
  return PROCEDURES.find((item) => item.id === id);
}

export function priceCatalog() {
  return PROCEDURES.flatMap((item) =>
    item.jaw
      ? [
          { code: `${item.id}:one`, label: `${item.label} — فك واحد` },
          { code: `${item.id}:both`, label: `${item.label} — فكين` },
        ]
      : [{ code: item.id, label: item.label }],
  );
}

export function priceCode(procedureId: string, jaw = "") {
  const procedure = procedureOf(procedureId);
  if (!procedure) return "";
  if (!procedure.jaw) return procedure.id;
  return jaw === "one" || jaw === "both" ? `${procedure.id}:${jaw}` : "";
}
