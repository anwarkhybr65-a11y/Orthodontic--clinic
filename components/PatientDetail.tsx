"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarPlus, FileOutput, Hash, Phone, Stethoscope, Trash2, UserRound } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { ClinicalGallery } from "@/components/ClinicalGallery";
import { ExamFields, GoalsFields, PlanFields, RiskFields, type ClinicalValue } from "@/components/ClinicalFields";
import { PrintButton } from "@/components/PrintButton";
import { PrintLogo } from "@/components/PrintLogo";
import { SignaturePad } from "@/components/SignaturePad";
import { StatusBadge } from "@/components/StatusBadge";
import { Button, Choice, Field, SectionCard, TextArea, TextInput } from "@/components/ui";
import { mutate } from "@/lib/api-client";
import { APPLIANCE_OPTIONS, GOAL_LABELS, RECORD_OPTIONS, jawLabel } from "@/lib/constants";
import type { ClinicUser } from "@/lib/db";
import { formatDate, formatLong, formatMoney, todayISO } from "@/lib/format";
import { BREAK_REASONS, PATIENT_TYPES, PAYMENT_METHODS, PROCEDURES, VISIT_JAWS, optionLabel, priceCode, procedureOf } from "@/lib/procedures";
import { can, type Role } from "@/lib/permissions";
import type { Patient, ProcedurePrice, Status, Visit } from "@/lib/types";

const tabs = [
  { id: "plan", label: "الخطة العلاجية" },
  { id: "visits", label: "سجل الزيارات" },
  { id: "images", label: "الصور والأشعة" },
] as const;

type Tab = (typeof tabs)[number]["id"];

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-sage-50/80 px-4 py-3">
      <div className="mb-1 flex items-center gap-2 text-xs font-bold text-sage-700">
        {icon}
        {label}
      </div>
      <p className="font-extrabold text-ink">{value || "—"}</p>
    </div>
  );
}

function SignatureView({ title, image, name }: { title: string; image: string; name: string }) {
  return (
    <div className="rounded-2xl border border-sage-100 bg-sage-50/50 p-4">
      <p className="text-xs font-bold text-sage-700">{title}</p>
      {image ? <img src={image} alt={title} className="mt-2 h-24 w-full object-contain" /> : null}
      <p className="mt-2 font-extrabold text-sage-900">{name || "—"}</p>
    </div>
  );
}

export function PatientDetail({
  patient,
  role = "admin",
  doctors = [],
  prices = [],
}: {
  patient: Patient;
  role?: Role;
  doctors?: ClinicUser[];
  prices?: ProcedurePrice[];
}) {
  const allow = {
    plan: can(role, "plan"),
    images: can(role, "images"),
    visits: can(role, "visits"),
    appointments: can(role, "appointments"),
    discharge: can(role, "discharge"),
  };
  const showPlan = allow.plan || role === "nurse";
  const visibleTabs = tabs.filter((item) => {
    if (item.id === "plan") return showPlan;
    if (item.id === "visits") return allow.visits;
    return allow.images;
  });
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(visibleTabs[0]?.id ?? "plan");
  const [editingPlan, setEditingPlan] = useState(!patient.planReady && allow.plan);
  const [editingInfo, setEditingInfo] = useState(false);
  const [draft, setDraft] = useState<Patient>(patient);
  const [info, setInfo] = useState(patient);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(patch: Record<string, unknown>, success: string) {
    setBusy(true);
    setError("");
    try {
      await mutate(`/api/patients/${patient.id}`, "PATCH", patch);
      setMessage(success);
      setEditingPlan(false);
      setEditingInfo(false);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر الحفظ");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(status: Status) {
    if (status === patient.status) return;
    await save({ status }, "تم تحديث حالة الملف");
  }

  const selectedRecords = RECORD_OPTIONS.filter((item) => patient.records[item.key]);
  const selectedAppliances = APPLIANCE_OPTIONS.filter((item) => patient.appliances[item.key]);
  const canDischarge = !patient.discharge && patient.status !== "completed" && patient.status !== "discharged";

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <BackLink href="/patients">قائمة الحالات</BackLink>
        <PrintButton label="طباعة الخطة" />
      </div>

      <section className="print-sheet rounded-[1.75rem] border border-white bg-white p-5 shadow-[0_18px_50px_-30px_rgba(36,63,50,0.5)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-bold text-sage-700">{patient.facilityName}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">{patient.name}</h1>
              <StatusBadge status={patient.status} />
            </div>
            <p className="mt-2 text-sm text-slate-500">تاريخ التسجيل: {formatLong(patient.registeredAt)}</p>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            {allow.appointments ? (
              <Link href={role === "doctor" ? "/appointments" : `/appointments?patient=${patient.id}`} className="inline-flex items-center gap-2 rounded-2xl border border-sage-200 bg-white px-4 py-3 text-sm font-bold text-sage-900">
                <CalendarPlus size={16} />
                {role === "doctor" ? "سجل المراجعين" : "حجز موعد"}
              </Link>
            ) : null}
            {allow.discharge && patient.discharge ? (
              <Link href={`/discharge/${patient.discharge.id}`} className="inline-flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
                <FileOutput size={16} />
                عرض المخالصة
              </Link>
            ) : allow.discharge && canDischarge ? (
              <Link href={`/discharge?patient=${patient.id}`} className="inline-flex items-center gap-2 rounded-2xl bg-sage-700 px-4 py-3 text-sm font-bold text-white">
                <FileOutput size={16} />
                تقرير مخالصة
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Info icon={<UserRound size={14} />} label="الاسم" value={patient.name} />
          <Info icon={<Hash size={14} />} label="رقم الملف" value={patient.fileNumber} />
          <Info icon={<UserRound size={14} />} label="العمر" value={patient.age} />
          <Info icon={<Phone size={14} />} label="الجوال" value={patient.phone} />
          <Info icon={<Stethoscope size={14} />} label="الطبيب المعالج" value={patient.doctor} />
        </div>

        {allow.plan ? (
        <>
        <div className="no-print mt-5 flex flex-col gap-3 border-t border-sage-100 pt-4 sm:flex-row sm:items-end sm:justify-between">
          <label className="block text-sm font-bold text-sage-900">
            حالة الملف
            <select
              value={patient.status}
              onChange={(event) => changeStatus(event.target.value as Status)}
              disabled={busy}
              className="mt-2 block rounded-2xl border border-sage-200 bg-white px-3 py-2 text-sm"
            >
              <option value="active">بلا خطة</option>
              <option value="incomplete">قيد العلاج</option>
              <option value="completed">منتهية</option>
              {patient.status === "discharged" ? <option value="discharged">مخالصة</option> : null}
            </select>
            <span className="mt-1 block text-xs font-medium text-slate-500">المخالصة تُسجَّل من تقرير المخالصة فقط.</span>
          </label>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setInfo(patient);
              setEditingInfo((value) => !value);
            }}
          >
            {editingInfo ? "إغلاق التعديل" : "تعديل البيانات الأساسية"}
          </Button>
        </div>
        {editingInfo ? (
          <div className="no-print mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="اسم المنشأة"><TextInput value={info.facilityName} onChange={(event) => setInfo({ ...info, facilityName: event.target.value })} /></Field>
            <Field label="رقم الملف"><TextInput dir="ltr" className="text-right" value={info.fileNumber} onChange={(event) => setInfo({ ...info, fileNumber: event.target.value })} /></Field>
            <Field label="التاريخ"><TextInput type="date" dir="ltr" className="text-right" value={info.registeredAt} onChange={(event) => setInfo({ ...info, registeredAt: event.target.value })} /></Field>
            <Field label="اسم المريض"><TextInput value={info.name} onChange={(event) => setInfo({ ...info, name: event.target.value })} /></Field>
            <Field label="العمر"><TextInput value={info.age} onChange={(event) => setInfo({ ...info, age: event.target.value })} /></Field>
            <Field label="الجوال"><TextInput dir="ltr" className="text-right" value={info.phone} onChange={(event) => setInfo({ ...info, phone: event.target.value })} /></Field>
            <Field label="الطبيب المعالج" className="sm:col-span-2">
              {doctors.length > 0 ? (
                <select
                  value={info.doctorId}
                  onChange={(event) => {
                    const doctor = doctors.find((item) => item.id === event.target.value);
                    setInfo({ ...info, doctorId: doctor?.id ?? "", doctor: doctor?.name ?? info.doctor });
                  }}
                  className="w-full rounded-2xl border border-sage-200 bg-white px-4 py-3 text-sm"
                >
                  <option value={info.doctorId || ""}>{info.doctor || "بدون حساب مرتبط"}</option>
                  {doctors.filter((doctor) => doctor.id !== info.doctorId).map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
                  ))}
                </select>
              ) : (
                <TextInput value={info.doctor} onChange={(event) => setInfo({ ...info, doctor: event.target.value })} />
              )}
            </Field>
            <div className="sm:col-span-2">
              <Button
                type="button"
                disabled={busy}
                onClick={() =>
                  save(
                    {
                      facilityName: info.facilityName,
                      fileNumber: info.fileNumber,
                      registeredAt: info.registeredAt,
                      name: info.name,
                      age: info.age,
                      phone: info.phone,
                      doctor: info.doctor,
                      doctorId: info.doctorId,
                    },
                    "تم تحديث بيانات المريض",
                  )
                }
              >
                حفظ البيانات الأساسية
              </Button>
            </div>
          </div>
        ) : null}
        </>
        ) : null}
        {!patient.planReady ? (
          <p className="no-print mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">هذا الملف بانتظار إكمال الخطة العلاجية.</p>
        ) : null}
        {message ? <p className="no-print mt-4 rounded-2xl bg-sage-50 px-4 py-3 text-sm font-bold text-sage-800">{message}</p> : null}
        {error ? <p className="no-print mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">{error}</p> : null}
      </section>

      {visibleTabs.length > 0 ? (
      <div className="no-print flex gap-2 overflow-x-auto rounded-[1.5rem] bg-white/80 p-2">
        {visibleTabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-extrabold transition ${
              tab === item.id ? "bg-sage-700 text-white" : "text-sage-800 hover:bg-sage-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      ) : null}

      {tab === "plan" && showPlan ? (
        <div className="space-y-5">
          {allow.plan ? (
          <div className="no-print flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setDraft(patient);
                setEditingPlan((value) => !value);
              }}
            >
              {editingPlan ? "إلغاء التعديل" : "تعديل الخطة"}
            </Button>
          </div>
          ) : null}
          {editingPlan && allow.plan ? (
            <div className="space-y-5">
              <SectionCard index="٢" title="الفحص والتأشير"><ExamFields value={draft} onChange={(patch) => setDraft({ ...draft, ...patch } as Patient)} /></SectionCard>
              <SectionCard index="٣" title="أهداف العلاج"><GoalsFields value={draft as ClinicalValue} onChange={(patch) => setDraft({ ...draft, ...patch })} /></SectionCard>
              <SectionCard index="٤" title="الخطة العلاجية المقترحة"><PlanFields value={draft as ClinicalValue} onChange={(patch) => setDraft({ ...draft, ...patch })} /></SectionCard>
              <SectionCard index="٥" title="المخاطر والتعليمات"><RiskFields value={draft as ClinicalValue} onChange={(patch) => setDraft({ ...draft, ...patch })} /></SectionCard>
              <SectionCard index="٦" title="التوقيع والموافقة">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3">
                    <Field label="اسم المريض عند التوقيع">
                      <TextInput value={draft.patientSignedName} onChange={(event) => setDraft({ ...draft, patientSignedName: event.target.value })} />
                    </Field>
                    <SignaturePad label="توقيع المريض" value={draft.patientSignature} onChange={(patientSignature) => setDraft({ ...draft, patientSignature })} />
                  </div>
                  <div className="space-y-3">
                    <Field label="اسم الطبيب عند التوقيع">
                      <TextInput value={draft.doctorSignedName} onChange={(event) => setDraft({ ...draft, doctorSignedName: event.target.value })} />
                    </Field>
                    <SignaturePad label="توقيع الطبيب" value={draft.doctorSignature} onChange={(doctorSignature) => setDraft({ ...draft, doctorSignature })} />
                  </div>
                </div>
                <div className="mt-4">
                  <Choice
                    checked={draft.consent}
                    label="أقرّ بأنه تم شرح الخطة العلاجية والأهداف والمخاطر، وأوافق على البدء بالعلاج وفق هذه الخطة."
                    onChange={() => setDraft({ ...draft, consent: !draft.consent })}
                  />
                </div>
              </SectionCard>
              <Button
                type="button"
                disabled={busy}
                onClick={() =>
                  save(
                    {
                      chiefComplaint: draft.chiefComplaint,
                      clinicalDiagnosis: draft.clinicalDiagnosis,
                      records: draft.records,
                      goals: draft.goals,
                      appliances: draft.appliances,
                      jaw: draft.jaw,
                      estimatedDuration: draft.estimatedDuration,
                      treatmentStages: draft.treatmentStages,
                      risks: draft.risks,
                      specialInstructions: draft.specialInstructions,
                      patientSignature: draft.patientSignature,
                      doctorSignature: draft.doctorSignature,
                      patientSignedName: draft.patientSignedName,
                      doctorSignedName: draft.doctorSignedName,
                      consent: draft.consent,
                      completePlan: !patient.planReady,
                    },
                    "تم حفظ الخطة العلاجية",
                  )
                }
              >
                {busy ? "جارٍ الحفظ..." : "حفظ التعديلات"}
              </Button>
            </div>
          ) : (
            <article className="print-sheet space-y-6 rounded-[1.75rem] border border-white bg-white p-5 shadow-sm sm:p-6">
              <header className="flex items-center gap-4 border-b border-sage-100 pb-4">
                <PrintLogo className="h-12" />
                <div>
                  <p className="text-sm font-bold text-sage-700">{patient.facilityName}</p>
                  <h2 className="mt-1 text-xl font-extrabold">خطة علاجية</h2>
                  <p className="mt-1 text-sm text-slate-500">رقم الملف {patient.fileNumber} · {formatDate(patient.registeredAt)}</p>
                </div>
              </header>
              <Block title="الشكوى الرئيسية" text={patient.chiefComplaint} />
              <Block title="التشخيص السريري" text={patient.clinicalDiagnosis} />
              <div>
                <h3 className="mb-2 text-sm font-extrabold text-sage-800">السجلات المتوفرة</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedRecords.length === 0 ? <span className="text-sm text-slate-500">لم تُحدَّد سجلات</span> : selectedRecords.map((item) => <Pill key={item.key}>{item.label}</Pill>)}
                </div>
              </div>
              <div className="grid gap-3">
                {GOAL_LABELS.map((label, index) => (
                  <div key={label} className="rounded-2xl bg-sage-50 px-4 py-3">
                    <p className="text-xs font-bold text-sage-700">{label}</p>
                    <p className="mt-1 text-sm leading-7">{patient.goals[index] || "—"}</p>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="mb-2 text-sm font-extrabold text-sage-800">الخطة العلاجية المقترحة</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedAppliances.length === 0 ? <span className="text-sm text-slate-500">—</span> : selectedAppliances.map((item) => <Pill key={item.key}>{item.label}</Pill>)}
                </div>
                {patient.appliances.other && patient.appliances.otherText ? <p className="mt-2 text-sm leading-7">{patient.appliances.otherText}</p> : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Block title="الفك" text={jawLabel(patient.jaw)} />
                <Block title="مدة العلاج التقديرية" text={patient.estimatedDuration} />
              </div>
              <Block title="مراحل العلاج والإجراءات الرئيسية" text={patient.treatmentStages} />
              <Block title="المخاطر المحتملة" text={patient.risks} />
              <Block title="التعليمات الخاصة / الحاجة لخلع" text={patient.specialInstructions} />
              <div className="grid gap-3 sm:grid-cols-2">
                <SignatureView title="توقيع المريض" image={patient.patientSignature} name={patient.patientSignedName} />
                <SignatureView title="توقيع الطبيب" image={patient.doctorSignature} name={patient.doctorSignedName} />
              </div>
            </article>
          )}
        </div>
      ) : null}

      {tab === "visits" && allow.visits ? <Visits patient={patient} prices={prices} onDone={() => router.refresh()} /> : null}
      {tab === "images" && allow.images ? <ClinicalGallery patient={patient} onDone={() => router.refresh()} /> : null}
    </div>
  );
}

function Block({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h3 className="mb-1 text-sm font-extrabold text-sage-800">{title}</h3>
      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{text || "—"}</p>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-sage-100 px-3 py-1 text-xs font-bold text-sage-800">{children}</span>;
}

function carriedVisit(visits: Visit[]) {
  return visits.find((visit) => visit.patientType && visit.paymentMethod) ?? null;
}

function Visits({ patient, prices, onDone }: { patient: Patient; prices: ProcedurePrice[]; onDone: () => void }) {
  const carried = carriedVisit(patient.visits);
  const [visitDate, setVisitDate] = useState(todayISO());
  const [nextVisit, setNextVisit] = useState("");
  const [patientType, setPatientType] = useState(carried?.patientType ?? "");
  const [paymentMethod, setPaymentMethod] = useState(carried?.paymentMethod ?? "");
  const [procedureCode, setProcedureCode] = useState("");
  const [jaw, setJaw] = useState("");
  const [brokenBrackets, setBrokenBrackets] = useState("0");
  const [breakReason, setBreakReason] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const procedure = procedureOf(procedureCode);
  const broken = Math.max(0, Math.floor(Number(brokenBrackets) || 0));
  const selectedPrice = priceCode(procedureCode, jaw);
  const due = prices.find((item) => item.code === selectedPrice)?.price ?? 0;

  function reset(keepContract = true) {
    const previous = carriedVisit(patient.visits);
    setVisitDate(todayISO());
    setNextVisit("");
    setPatientType(keepContract ? patientType || previous?.patientType || "" : "");
    setPaymentMethod(keepContract ? paymentMethod || previous?.paymentMethod || "" : "");
    setProcedureCode("");
    setJaw("");
    setBrokenBrackets("0");
    setBreakReason("");
    setNotes("");
    setEditingId("");
  }

  function loadVisit(visit: Visit) {
    setEditingId(visit.id);
    setVisitDate(visit.visitDate);
    setNextVisit(visit.nextVisit);
    setPatientType(visit.patientType);
    setPaymentMethod(visit.paymentMethod);
    setProcedureCode(visit.procedureCode);
    setJaw(visit.jaw);
    setBrokenBrackets(String(visit.brokenBrackets || 0));
    setBreakReason(visit.breakReason);
    setNotes(visit.notes);
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = {
        visitDate,
        nextVisit,
        notes,
        patientType,
        paymentMethod,
        procedureCode,
        jaw: procedure?.jaw ? jaw : "",
        brokenBrackets: broken,
        breakReason: broken > 0 ? breakReason : "",
      };
      if (editingId) await mutate(`/api/visits/${editingId}`, "PATCH", body);
      else await mutate(`/api/patients/${patient.id}/visits`, "POST", body);
      reset();
      onDone();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حفظ الزيارة");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setError("");
    try {
      await mutate(`/api/visits/${id}`, "DELETE");
      if (editingId === id) reset();
      onDone();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حذف الزيارة");
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="grid gap-4 rounded-[1.75rem] border border-white bg-white p-5 shadow-sm sm:grid-cols-2">
        <Field label="تاريخ الزيارة" required>
          <TextInput type="date" dir="ltr" className="text-right" value={visitDate} onChange={(event) => setVisitDate(event.target.value)} required />
        </Field>
        <Field label="الزيارة القادمة">
          <TextInput type="date" dir="ltr" className="text-right" value={nextVisit} onChange={(event) => setNextVisit(event.target.value)} />
        </Field>
        <Field label="نوع المريض" required>
          <Select value={patientType} required onChange={setPatientType} placeholder="اختاري نوع المريض" options={PATIENT_TYPES} />
        </Field>
        <Field label="طريقة الدفع في العقد" required>
          <Select value={paymentMethod} required onChange={setPaymentMethod} placeholder="اختاري طريقة الدفع" options={PAYMENT_METHODS} />
        </Field>
        <Field label="الإجراء / الخدمة المقدمة" required>
          <Select
            value={procedureCode}
            required
            onChange={(value) => {
              setProcedureCode(value);
              if (!procedureOf(value)?.jaw) setJaw("");
            }}
            placeholder="اختاري الإجراء"
            options={PROCEDURES}
          />
        </Field>
        {procedure?.jaw ? (
          <Field label="الفك" required>
            <Select value={jaw} required onChange={setJaw} placeholder="فك واحد أو فكين" options={VISIT_JAWS} />
          </Field>
        ) : (
          <div className="hidden sm:block" />
        )}
        <Field label="عدد البراكتات المكسورة">
          <TextInput
            dir="ltr"
            className="text-right"
            type="number"
            min={0}
            step={1}
            value={brokenBrackets}
            onChange={(event) => {
              setBrokenBrackets(event.target.value);
              if (Math.floor(Number(event.target.value) || 0) <= 0) setBreakReason("");
            }}
          />
        </Field>
        {broken > 0 ? (
          <Field label="سبب الكسر" required>
            <Select value={breakReason} required onChange={setBreakReason} placeholder="اختاري سبب الكسر" options={BREAK_REASONS} />
          </Field>
        ) : null}
        {selectedPrice ? <p className="text-sm font-extrabold text-sage-800 sm:col-span-2">سعر الإجراء: {formatMoney(due)}</p> : null}
        <Field label="ملاحظات" required={Boolean(procedure?.notes)}>
          <TextArea value={notes} maxLength={4000} required={Boolean(procedure?.notes)} onChange={(event) => setNotes(event.target.value)} />
        </Field>
        {procedure?.notes ? <p className="text-sm font-bold text-amber-800 sm:col-span-2">هذا الإجراء لا يُحفظ دون كتابة ملاحظات.</p> : null}
        {error ? <p className="text-sm font-semibold text-rose-700 sm:col-span-2">{error}</p> : null}
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" disabled={busy}>{busy ? "جارٍ الحفظ..." : editingId ? "حفظ التعديل" : "حفظ الزيارة"}</Button>
          {editingId ? <Button type="button" variant="ghost" onClick={() => reset()}>إلغاء</Button> : null}
        </div>
      </form>
      {patient.visits.length === 0 ? (
        <p className="rounded-[1.5rem] bg-white px-4 py-8 text-center text-sm text-slate-500">لا توجد زيارات مسجّلة بعد.</p>
      ) : (
        <div className="overflow-x-auto rounded-[1.75rem] border border-white bg-white shadow-sm">
          <table className="w-full min-w-[52rem] text-right text-sm">
            <thead className="bg-sage-50 text-xs font-bold text-sage-800">
              <tr>
                <th className="px-4 py-3">تاريخ الزيارة</th>
                <th className="px-4 py-3">الزيارة القادمة</th>
                <th className="px-4 py-3">نوع المريض</th>
                <th className="px-4 py-3">الدفع</th>
                <th className="px-4 py-3">الإجراء / الخدمة المقدمة</th>
                <th className="px-4 py-3">ملاحظات</th>
                <th className="px-4 py-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {patient.visits.map((visit) => (
                <tr key={visit.id} className="border-t border-sage-100 align-top">
                  <td className="px-4 py-3 font-extrabold text-sage-900">{formatLong(visit.visitDate)}</td>
                  <td className="px-4 py-3">{visit.nextVisit ? formatLong(visit.nextVisit) : "—"}</td>
                  <td className="px-4 py-3">{optionLabel(PATIENT_TYPES, visit.patientType) || "—"}</td>
                  <td className="px-4 py-3">{optionLabel(PAYMENT_METHODS, visit.paymentMethod) || "—"}</td>
                  <td className="px-4 py-3">
                    {optionLabel(PROCEDURES, visit.procedureCode) || visit.procedures || "—"}
                    {visit.jaw ? <p className="mt-1 text-xs text-slate-500">{optionLabel(VISIT_JAWS, visit.jaw)}</p> : null}
                    {visit.brokenBrackets > 0 ? (
                      <p className="mt-1 text-xs text-slate-500">براكت مكسور: {visit.brokenBrackets} · {optionLabel(BREAK_REASONS, visit.breakReason) || "—"}</p>
                    ) : null}
                    {visit.automatic ? <p className="mt-1 text-xs font-bold text-sage-600">من تأكيد الحضور</p> : null}
                  </td>
                  <td className="px-4 py-3 whitespace-pre-wrap text-slate-600">{visit.notes || "—"}</td>
                  <td className="px-4 py-3">
                    {visit.automatic ? null : (
                      <div className="flex gap-2">
                        <button type="button" className="rounded-xl bg-sage-50 px-3 py-2 text-xs font-bold text-sage-800" onClick={() => loadVisit(visit)}>
                          تعديل
                        </button>
                        <button type="button" onClick={() => remove(visit.id)} className="text-slate-400 hover:text-rose-700" aria-label="حذف الزيارة">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly { id: string; label: string }[];
  placeholder: string;
  required?: boolean;
}) {
  return (
    <select value={value} required={required} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-sage-200 bg-white px-4 py-3 text-sm">
      <option value="">{placeholder}</option>
      {options.map((item) => (
        <option key={item.id} value={item.id}>{item.label}</option>
      ))}
    </select>
  );
}
