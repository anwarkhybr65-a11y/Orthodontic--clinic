"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save } from "lucide-react";
import { DischargeSheets } from "@/components/DischargeSheets";
import { SignaturePad } from "@/components/SignaturePad";
import { Button, Choice, Field, SectionCard, TextArea, TextInput } from "@/components/ui";
import { mutate } from "@/lib/api-client";
import {
  ALLOY_OPTIONS,
  APPLIANCE_FLAGS,
  ATTENDANCE_OPTIONS,
  CLASS_OPTIONS,
  HEALTH_OPTIONS,
  HYGIENE_OPTIONS,
  IMAGING_ROWS,
  RETAINER_OPTIONS,
  STAGE_OPTIONS,
  WEAR_OPTIONS,
  emptyDischargeDetails,
  emptyVisitRow,
  type DischargeDetails,
  type HealthFlag,
} from "@/lib/discharge-details";
import { matchesPatientQuery, todayISO } from "@/lib/format";
import type { PatientSummary } from "@/lib/types";

export function DischargeForm({
  patients,
  initialPatientId = "",
}: {
  patients: PatientSummary[];
  initialPatientId?: string;
}) {
  const router = useRouter();
  const initial = patients.find((patient) => patient.id === initialPatientId);
  const [query, setQuery] = useState("");
  const [patientId, setPatientId] = useState(initial?.id ?? "");
  const [facilityName, setFacilityName] = useState(initial?.facilityName ?? "مجمع أنوار خيبر الطبي");
  const [fileNumber, setFileNumber] = useState(initial?.fileNumber ?? "");
  const [patientName, setPatientName] = useState(initial?.name ?? "");
  const [age, setAge] = useState(initial?.age ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [doctor, setDoctor] = useState(initial?.doctor ?? "");
  const [reportDate, setReportDate] = useState(todayISO());
  const [details, setDetails] = useState<DischargeDetails>(() => ({
    ...emptyDischargeDetails(),
    treatmentStart: initial?.registeredAt ?? "",
    doctorSignDate: todayISO(),
    recipientSignDate: todayISO(),
    recipientName: initial?.name ?? "",
  }));
  const [doctorSignature, setDoctorSignature] = useState("");
  const [patientSignature, setPatientSignature] = useState("");
  const [doctorSignedName, setDoctorSignedName] = useState(initial?.doctor ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(
    () => patients.filter((patient) => patient.id === patientId || matchesPatientQuery(patient.name, patient.fileNumber, patient.phone, query)),
    [patients, query, patientId],
  );

  function patch(next: Partial<DischargeDetails>) {
    setDetails((current) => ({ ...current, ...next }));
  }

  function choose(id: string) {
    const patient = patients.find((item) => item.id === id);
    setPatientId(id);
    if (!patient) return;
    setFacilityName(patient.facilityName || "مجمع أنوار خيبر الطبي");
    setFileNumber(patient.fileNumber);
    setPatientName(patient.name);
    setAge(patient.age);
    setPhone(patient.phone);
    setDoctor(patient.doctor);
    setDoctorSignedName(patient.doctor);
    patch({ treatmentStart: patient.registeredAt, recipientName: patient.name });
  }

  function toggleHealth(id: HealthFlag) {
    setDetails((current) => {
      if (id === "none") return { ...current, health: current.health.includes("none") ? [] : ["none"], healthOther: "" };
      const withoutNone = current.health.filter((item) => item !== "none" && item !== id);
      const health = current.health.includes(id) ? withoutNone : [...withoutNone, id];
      return { ...current, health };
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const report = await mutate<{ id: string }>("/api/discharges", "POST", {
        patientId,
        facilityName,
        fileNumber,
        patientName,
        age,
        phone,
        doctor,
        reportDate,
        acknowledged: details.receivedOriginals,
        doctorSignature,
        patientSignature,
        doctorSignedName,
        patientSignedName: details.recipientName,
        details,
      });
      router.push(`/archive/discharged?notice=${report.id}`);
      router.refresh();
    } catch (reasonError) {
      setError(reasonError instanceof Error ? reasonError.message : "تعذر حفظ التقرير");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  }

  const sheet = {
    facilityName,
    reportDate,
    patientName,
    fileNumber,
    age,
    phone,
    doctor,
    details,
    doctorSignedName,
    patientSignedName: details.recipientName,
    doctorSignature,
    patientSignature,
  };

  return (
    <>
    <div className="discharge-print-only">
      <DischargeSheets data={sheet} />
    </div>
    <form onSubmit={onSubmit} className="no-print space-y-5" autoComplete="off">
      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">{error}</p> : null}
      <p className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-sage-800">ملخص حالة وتصفية علاج التقويم — مجمع أنوار خيبر الطبي</p>
      <SectionCard index="١" title="بيانات المريض الأساسية">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="بحث عن الحالة" className="sm:col-span-2">
            <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="الاسم أو رقم الملف أو الجوال" />
          </Field>
          <Field label="اختيار المريض" required className="sm:col-span-2">
            <select value={patientId} onChange={(event) => choose(event.target.value)} className="w-full rounded-2xl border border-sage-200 bg-white px-4 py-3 text-sm">
              <option value="">اختر ملفاً</option>
              {filtered.map((patient) => (
                <option key={patient.id} value={patient.id}>{patient.name} — {patient.fileNumber}</option>
              ))}
            </select>
          </Field>
          <Field label="اسم المريض" required><TextInput value={patientName} onChange={(event) => setPatientName(event.target.value)} /></Field>
          <Field label="رقم الملف" required><TextInput dir="ltr" className="text-right" value={fileNumber} onChange={(event) => setFileNumber(event.target.value)} /></Field>
          <Field label="العمر"><TextInput value={age} onChange={(event) => setAge(event.target.value)} /></Field>
          <Field label="الجنس">
            <div className="grid grid-cols-2 gap-2">
              {["ذكر", "أنثى"].map((item) => (
                <Choice key={item} type="radio" name="gender" checked={details.gender === item} onChange={() => patch({ gender: item })} label={item} />
              ))}
            </div>
          </Field>
          <Field label="رقم الهوية"><TextInput dir="ltr" className="text-right" value={details.nationalId} onChange={(event) => patch({ nationalId: event.target.value })} /></Field>
          <Field label="رقم الجوال"><TextInput dir="ltr" className="text-right" value={phone} onChange={(event) => setPhone(event.target.value)} /></Field>
          <Field label="تاريخ بدء العلاج"><TextInput type="date" dir="ltr" className="text-right" value={details.treatmentStart} onChange={(event) => patch({ treatmentStart: event.target.value })} /></Field>
          <Field label="تاريخ التقرير" required><TextInput type="date" dir="ltr" className="text-right" value={reportDate} onChange={(event) => setReportDate(event.target.value)} /></Field>
        </div>
      </SectionCard>

      <SectionCard index="٢" title="التاريخ الطبي والسنّي والعادات">
        <p className="mb-3 text-sm font-bold text-sage-800">الحالة الصحية</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {HEALTH_OPTIONS.map((item) => (
            <Choice key={item.id} checked={details.health.includes(item.id)} onChange={() => toggleHealth(item.id)} label={item.label} />
          ))}
        </div>
        {details.health.includes("other") ? (
          <div className="mt-3">
            <Field label="حالة أخرى"><TextInput value={details.healthOther} onChange={(event) => patch({ healthOther: event.target.value })} /></Field>
          </div>
        ) : null}
        <p className="mb-3 mt-5 text-sm font-bold text-sage-800">التاريخ السنّي</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Choice checked={details.previousOrtho} onChange={() => patch({ previousOrtho: !details.previousOrtho })} label="تقويم سابق" />
          <Choice checked={details.toothFracture} onChange={() => patch({ toothFracture: !details.toothFracture })} label="كسر أسنان" />
          <Choice checked={details.rootCanal} onChange={() => patch({ rootCanal: !details.rootCanal })} label="علاج عصب" />
          <Choice checked={details.activeCaries} onChange={() => patch({ activeCaries: !details.activeCaries })} label="تسوس نشط" />
          <Choice checked={details.gumDisease} onChange={() => patch({ gumDisease: !details.gumDisease })} label="أمراض لثة" />
        </div>
        <p className="mb-3 mt-5 text-sm font-bold text-sage-800">الحساسية والأدوية</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Choice checked={details.allergyNone} onChange={() => patch({ allergyNone: !details.allergyNone, allergyNickel: false, allergyLatex: false, allergyMeds: false, allergyMedsText: "" })} label="لا يوجد" />
          <Choice checked={details.allergyNickel} onChange={() => patch({ allergyNickel: !details.allergyNickel, allergyNone: false })} label="نيكل" />
          <Choice checked={details.allergyLatex} onChange={() => patch({ allergyLatex: !details.allergyLatex, allergyNone: false })} label="لاتكس" />
          <Choice checked={details.allergyMeds} onChange={() => patch({ allergyMeds: !details.allergyMeds, allergyNone: false, allergyMedsText: details.allergyMeds ? "" : details.allergyMedsText })} label="أدوية" />
        </div>
        {details.allergyMeds ? (
          <div className="mt-3">
            <Field label="نوع الأدوية"><TextInput value={details.allergyMedsText} onChange={(event) => patch({ allergyMedsText: event.target.value })} placeholder="اكتب نوع الأدوية" /></Field>
          </div>
        ) : null}
        <div className="mt-3">
          <Field label="ملاحظات إضافية"><TextArea value={details.historyNotes} onChange={(event) => patch({ historyNotes: event.target.value })} /></Field>
        </div>
      </SectionCard>

      <SectionCard index="٣" title="الشكوى الرئيسية وقائمة المشكلات التشخيصية">
        <Field label="الشكوى الرئيسية بكلمات المريض">
          <TextArea value={details.chiefComplaint} onChange={(event) => patch({ chiefComplaint: event.target.value })} />
        </Field>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-bold text-sage-900">النمط الهيكلي</p>
            <div className="grid gap-2">
              {CLASS_OPTIONS.map((item) => (
                <Choice key={item.id} type="radio" name="class" checked={details.skeletalClass === item.id} onChange={() => patch({ skeletalClass: item.id })} label={item.label} />
              ))}
            </div>
          </div>
          <Field label="علاقة القواطع"><TextArea value={details.incisorRelation} onChange={(event) => patch({ incisorRelation: event.target.value })} /></Field>
        </div>
      </SectionCard>

      <SectionCard index="٤" title="السجلات التشخيصية المرفقة">
        <div className="space-y-3">
          {IMAGING_ROWS.map((row) => (
            <div key={row.key} className="grid gap-3 rounded-2xl bg-sage-50 p-3 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-end">
              <p className="text-sm font-extrabold text-sage-900">{row.label}</p>
              <Field label="التاريخ"><TextInput type="date" dir="ltr" className="text-right" value={details.imaging[row.key].date} onChange={(event) => patch({ imaging: { ...details.imaging, [row.key]: { ...details.imaging[row.key], date: event.target.value } } })} /></Field>
              <Field label="جهة الإجراء"><TextInput value={details.imaging[row.key].place} onChange={(event) => patch({ imaging: { ...details.imaging, [row.key]: { ...details.imaging[row.key], place: event.target.value } } })} /></Field>
              <Choice checked={details.imaging[row.key].delivered} onChange={() => patch({ imaging: { ...details.imaging, [row.key]: { ...details.imaging[row.key], delivered: !details.imaging[row.key].delivered } } })} label="تم التسليم" />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard index="٥" title="خطة العلاج المعتمدة ونوع الجهاز">
        <div className="grid gap-2 sm:grid-cols-2">
          <Choice type="radio" name="extraction" checked={details.extraction === "none"} onChange={() => patch({ extraction: "none", extractionTeeth: "" })} label="بدون خلع" />
          <Choice type="radio" name="extraction" checked={details.extraction === "teeth"} onChange={() => patch({ extraction: "teeth" })} label="مع خلع" />
        </div>
        {details.extraction === "teeth" ? (
          <div className="mt-3">
            <Field label="أرقام الأسنان المخلوعة"><TextInput value={details.extractionTeeth} placeholder="مثال: 14 و 24" onChange={(event) => patch({ extractionTeeth: event.target.value })} /></Field>
          </div>
        ) : null}
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {APPLIANCE_FLAGS.map((item) => (
            <Choice key={item.id} checked={details.appliances[item.id]} onChange={() => patch({ appliances: { ...details.appliances, [item.id]: !details.appliances[item.id] } })} label={item.label} />
          ))}
        </div>
      </SectionCard>

      <SectionCard index="٦" title="ما تم إنجازه حتى تاريخ التسليم">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="تاريخ التركيب Bonding"><TextInput type="date" dir="ltr" className="text-right" value={details.bondingDate} onChange={(event) => patch({ bondingDate: event.target.value })} /></Field>
          <Field label="تاريخ آخر زيارة"><TextInput type="date" dir="ltr" className="text-right" value={details.lastVisitDate} onChange={(event) => patch({ lastVisitDate: event.target.value })} /></Field>
          <Field label="عدد الزيارات الإجمالية"><TextInput value={details.totalVisits} onChange={(event) => patch({ totalVisits: event.target.value })} /></Field>
          <Field label="المدة المتبقية المتوقعة"><TextInput value={details.remainingDuration} onChange={(event) => patch({ remainingDuration: event.target.value })} /></Field>
        </div>
        <p className="mb-2 mt-4 text-sm font-bold text-sage-900">المرحلة الحالية</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {STAGE_OPTIONS.map((item) => (
            <Choice key={item.id} type="radio" name="stage" checked={details.stage === item.id} onChange={() => patch({ stage: item.id })} label={item.label} />
          ))}
        </div>
        <p className="mb-2 mt-4 text-sm font-bold text-sage-900">نظافة الفم</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {HYGIENE_OPTIONS.map((item) => (
            <Choice key={item.id} type="radio" name="hygiene" checked={details.hygiene === item.id} onChange={() => patch({ hygiene: item.id })} label={item.label} />
          ))}
        </div>
        <p className="mb-2 mt-4 text-sm font-bold text-sage-900">التزام المراجعات</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {ATTENDANCE_OPTIONS.map((item) => (
            <Choice key={item.id} type="radio" name="attendance" checked={details.attendance === item.id} onChange={() => patch({ attendance: item.id })} label={item.label} />
          ))}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Choice checked={details.whiteSpots} onChange={() => patch({ whiteSpots: !details.whiteSpots })} label="بقع بيضاء" />
          <Choice checked={details.caries} onChange={() => patch({ caries: !details.caries })} label="تسوس" />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="السلك العلوي"><TextInput value={details.upperWire} placeholder="المقاس" onChange={(event) => patch({ upperWire: event.target.value })} /></Field>
          <Field label="نوع السلك العلوي">
            <select value={details.upperAlloy} onChange={(event) => patch({ upperAlloy: event.target.value as DischargeDetails["upperAlloy"] })} className="w-full rounded-2xl border border-sage-200 bg-white px-4 py-3 text-sm">
              <option value="">—</option>
              {ALLOY_OPTIONS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="السلك السفلي"><TextInput value={details.lowerWire} placeholder="المقاس" onChange={(event) => patch({ lowerWire: event.target.value })} /></Field>
          <Field label="نوع السلك السفلي">
            <select value={details.lowerAlloy} onChange={(event) => patch({ lowerAlloy: event.target.value as DischargeDetails["lowerAlloy"] })} className="w-full rounded-2xl border border-sage-200 bg-white px-4 py-3 text-sm">
              <option value="">—</option>
              {ALLOY_OPTIONS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
        </div>
      </SectionCard>

      <SectionCard index="٧" title="سجل آخر الزيارات والإجراءات">
        <div className="space-y-3">
          {details.recentVisits.map((row, index) => (
            <div key={index} className="grid gap-3 rounded-2xl bg-sage-50 p-3 sm:grid-cols-4">
              <Field label="التاريخ"><TextInput type="date" dir="ltr" className="text-right" value={row.date} onChange={(event) => updateVisit(index, { date: event.target.value })} /></Field>
              <Field label="السلك العلوي"><TextInput value={row.upperWire} onChange={(event) => updateVisit(index, { upperWire: event.target.value })} /></Field>
              <Field label="السلك السفلي"><TextInput value={row.lowerWire} onChange={(event) => updateVisit(index, { lowerWire: event.target.value })} /></Field>
              <Field label="الإجراء والملاحظات"><TextInput value={row.procedure} onChange={(event) => updateVisit(index, { procedure: event.target.value })} /></Field>
            </div>
          ))}
        </div>
        {details.recentVisits.length < 8 ? (
          <button type="button" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-sage-800" onClick={() => patch({ recentVisits: [...details.recentVisits, emptyVisitRow()] })}>
            <Plus size={16} /> إضافة زيارة
          </button>
        ) : null}
      </SectionCard>

      <SectionCard index="٨" title="خطة التثبيت المتفق عليها">
        <p className="mb-2 text-sm font-bold text-sage-900">الفك العلوي</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {RETAINER_OPTIONS.map((item) => (
            <Choice key={item.id} type="radio" name="upper-retainer" checked={details.upperRetainer === item.id} onChange={() => patch({ upperRetainer: item.id })} label={item.label} />
          ))}
        </div>
        <p className="mb-2 mt-4 text-sm font-bold text-sage-900">الفك السفلي</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {RETAINER_OPTIONS.map((item) => (
            <Choice key={item.id} type="radio" name="lower-retainer" checked={details.lowerRetainer === item.id} onChange={() => patch({ lowerRetainer: item.id })} label={item.label} />
          ))}
        </div>
        <p className="mb-2 mt-4 text-sm font-bold text-sage-900">طريقة ومدة اللبس</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {WEAR_OPTIONS.map((item) => (
            <Choice key={item.id} type="radio" name="wear" checked={details.wear === item.id} onChange={() => patch({ wear: item.id })} label={item.label} />
          ))}
        </div>
      </SectionCard>

      <SectionCard index="٩" title="ملاحظات لطبيب التقويم المستقبل">
        <TextArea value={details.handoverNotes} placeholder="سبب المخالصة ومرحلة الانتقال للطبيب القادم" onChange={(event) => patch({ handoverNotes: event.target.value })} />
      </SectionCard>

      <SectionCard index="١٠" title="الاعتماد والتوقيع وإقرار الاستلام">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm font-extrabold text-sage-900">إقرار الطبيب المعالج</p>
            <Field label="الاسم" required><TextInput value={doctorSignedName} onChange={(event) => setDoctorSignedName(event.target.value)} /></Field>
            <Field label="التخصص"><TextInput value={details.doctorSpecialty} onChange={(event) => patch({ doctorSpecialty: event.target.value })} /></Field>
            <Field label="رقم التصنيف"><TextInput dir="ltr" className="text-right" value={details.doctorLicense} onChange={(event) => patch({ doctorLicense: event.target.value })} /></Field>
            <Field label="التاريخ"><TextInput type="date" dir="ltr" className="text-right" value={details.doctorSignDate} onChange={(event) => patch({ doctorSignDate: event.target.value })} /></Field>
            <SignaturePad label="توقيع الطبيب" value={doctorSignature} onChange={setDoctorSignature} />
          </div>
          <div className="space-y-3">
            <p className="text-sm font-extrabold text-sage-900">إقرار استلام المريض أو ولي الأمر</p>
            <Field label="الاسم" required><TextInput value={details.recipientName} onChange={(event) => patch({ recipientName: event.target.value })} /></Field>
            <Field label="التاريخ"><TextInput type="date" dir="ltr" className="text-right" value={details.recipientSignDate} onChange={(event) => patch({ recipientSignDate: event.target.value })} /></Field>
            <Choice checked={details.receivedOriginals} onChange={() => patch({ receivedOriginals: !details.receivedOriginals })} label="استلام أصل الخطة العلاجية والمرفقات التشخيصية." />
            <SignaturePad label="توقيع المريض أو ولي الأمر" value={patientSignature} onChange={setPatientSignature} />
          </div>
        </div>
      </SectionCard>

      <div className="sticky bottom-4 z-20 rounded-[1.5rem] border border-sage-200 bg-white/95 p-4 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-slate-600">عند الحفظ تُنقل الحالة تلقائياً إلى حالات المخالصة في الأرشيف.</p>
          <Button type="submit" disabled={saving}>
            <Save size={16} />
            {saving ? "جارٍ الحفظ..." : "حفظ التقرير ونقل الحالة"}
          </Button>
        </div>
      </div>
    </form>
    </>
  );

  function updateVisit(index: number, next: Partial<DischargeDetails["recentVisits"][number]>) {
    setDetails((current) => ({
      ...current,
      recentVisits: current.recentVisits.map((row, rowIndex) => (rowIndex === index ? { ...row, ...next } : row)),
    }));
  }
}
