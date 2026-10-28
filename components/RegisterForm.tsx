"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { ExamFields, GoalsFields, PlanFields, RiskFields, type ClinicalValue } from "@/components/ClinicalFields";
import { SignaturePad } from "@/components/SignaturePad";
import { Button, Choice, Field, SectionCard, TextInput } from "@/components/ui";
import { mutate } from "@/lib/api-client";
import { emptyAppliances, emptyRecords } from "@/lib/constants";
import type { ClinicUser } from "@/lib/db";
import type { PatientInput } from "@/lib/types";

const steps = ["بيانات", "فحص", "أهداف", "خطة", "مخاطر", "توقيع"];

export async function RegisterForm({
  defaults,
  doctors = [],
}: {
  defaults: { facilityName: string; fileNumber: string; date: string };
  doctors?: ClinicUser[];
}) {
  const router = useRouter();
  const firstDoctor = doctors[0];
  const [form, setForm] = useState<PatientInput>({
    facilityName: defaults.facilityName,
    fileNumber: defaults.fileNumber,
    registeredAt: defaults.date,
    name: "",
    age: "",
    phone: "",
    doctor: firstDoctor?.name ?? "",
    doctorId: firstDoctor?.id ?? "",
    chiefComplaint: "",
    clinicalDiagnosis: "",
    records: emptyRecords(),
    goals: ["", "", ""],
    appliances: emptyAppliances(),
    jaw: "",
    estimatedDuration: "",
    treatmentStages: "",
    risks: "",
    specialInstructions: "",
    patientSignature: "",
    doctorSignature: "",
    patientSignedName: "",
    doctorSignedName: "",
    consent: false,
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function update(patch: Partial<PatientInput>) {
    setDirty(true);
    setForm((current) => ({ ...current, ...patch }));
  }

  const clinical: ClinicalValue = form;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const created = await mutate<{ id: string }>("/api/patients", "POST", form);
      setDirty(false);
      router.push(`/patients/${created.id}`);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حفظ النموذج");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form autoComplete="off" onSubmit={onSubmit} className="space-y-5">
      <ol className="grid grid-cols-3 gap-2 lg:grid-cols-6">
        {steps.map((step, index) => (
          <li key={step} className="rounded-2xl border border-white bg-white/80 px-3 py-2 text-center shadow-sm">
            <span className="block text-xs font-bold text-sage-600">{index + 1}</span>
            <span className="text-sm font-extrabold text-sage-900">{step}</span>
          </li>
        ))}
      </ol>
      {error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</p>
      ) : null}

      <SectionCard index="١" title="بيانات المريض">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="رقم الملف" required>
            <TextInput dir="ltr" className="text-right" value={form.fileNumber} maxLength={40} onChange={(event) => update({ fileNumber: event.target.value })} />
          </Field>
          <Field label="التاريخ" required>
            <TextInput type="date" dir="ltr" className="text-right" value={form.registeredAt} onChange={(event) => update({ registeredAt: event.target.value })} />
          </Field>
          <Field label="اسم المريض" required>
            <TextInput value={form.name} maxLength={200} onChange={(event) => update({ name: event.target.value })} />
          </Field>
          <Field label="العمر" required>
            <TextInput value={form.age} maxLength={40} placeholder="مثال: 14" onChange={(event) => update({ age: event.target.value })} />
          </Field>
          <Field label="رقم التواصل" required>
            <TextInput dir="ltr" className="text-right" inputMode="tel" placeholder="05xxxxxxxx" value={form.phone} maxLength={30} onChange={(event) => update({ phone: event.target.value })} />
          </Field>
          <Field label="الطبيب المعالج" required>
            {doctors.length > 0 ? (
              <select
                value={form.doctorId ?? ""}
                required
                onChange={(event) => {
                  const doctor = doctors.find((item) => item.id === event.target.value);
                  update({ doctorId: doctor?.id ?? "", doctor: doctor?.name ?? "" });
                }}
                className="w-full rounded-2xl border border-sage-200 bg-white px-4 py-3 text-sm"
              >
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
                ))}
              </select>
            ) : (
              <TextInput value={form.doctor} maxLength={200} placeholder="د." onChange={(event) => update({ doctor: event.target.value })} />
            )}
          </Field>
        </div>
      </SectionCard>

      <SectionCard index="٢" title="الفحص والتأشير">
        <ExamFields value={clinical} onChange={update} />
      </SectionCard>
      <SectionCard index="٣" title="أهداف العلاج">
        <GoalsFields value={clinical} onChange={update} />
      </SectionCard>
      <SectionCard index="٤" title="الخطة العلاجية المقترحة">
        <PlanFields value={clinical} onChange={update} />
      </SectionCard>
      <SectionCard index="٥" title="المخاطر والتعليمات">
        <RiskFields value={clinical} onChange={update} />
      </SectionCard>
      <SectionCard index="٦" title="التوقيع والموافقة">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <Field label="اسم المريض عند التوقيع" required>
              <TextInput value={form.patientSignedName} maxLength={200} onChange={(event) => update({ patientSignedName: event.target.value })} />
            </Field>
            <SignaturePad label="توقيع المريض" value={form.patientSignature} onChange={(patientSignature) => update({ patientSignature })} />
          </div>
          <div className="space-y-3">
            <Field label="اسم الطبيب عند التوقيع" required>
              <TextInput value={form.doctorSignedName} maxLength={200} onChange={(event) => update({ doctorSignedName: event.target.value })} />
            </Field>
            <SignaturePad label="توقيع الطبيب" value={form.doctorSignature} onChange={(doctorSignature) => update({ doctorSignature })} />
          </div>
        </div>
        <div className="mt-4">
          <Choice
            checked={form.consent}
            label="أقرّ بأنه تم شرح الخطة العلاجية والأهداف والمخاطر، وأن البيانات أعلاه صحيحة، وأوافق على البدء بالعلاج وفق هذه الخطة."
            onChange={() => update({ consent: !form.consent })}
          />
        </div>
      </SectionCard>

      <div className="sticky bottom-4 z-20 rounded-[1.5rem] border border-sage-200 bg-white/95 p-4 shadow-[0_18px_50px_-28px_rgba(36,63,50,0.65)] backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-slate-600">سيُنشأ ملف المريض وتنتقل مباشرة إلى صفحته ضمن قائمة الحالات.</p>
          <Button type="submit" disabled={saving} className="sm:min-w-44">
            <Save size={16} />
            {saving ? "جارٍ الحفظ..." : "حفظ النموذج"}
          </Button>
        </div>
      </div>
    </form>
  );
}
