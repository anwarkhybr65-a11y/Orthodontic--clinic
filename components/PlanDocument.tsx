import { PrintButton } from "@/components/PrintButton";
import { APPLIANCE_OPTIONS, GOAL_LABELS, RECORD_OPTIONS, jawLabel } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { Patient } from "@/lib/types";

export function PlanDocument({ patient }: { patient: Patient }) {
  const records = RECORD_OPTIONS.filter((item) => patient.records[item.key]);
  const appliances = APPLIANCE_OPTIONS.filter((item) => patient.appliances[item.key]);

  return (
    <div className="plan-print-root">
      <div className="no-print mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-sage-800">الخطة جاهزة للطباعة على صفحتين A4.</p>
        <PrintButton label="طباعة الخطة العلاجية" />
      </div>
      <article className="a4-sheet">
        <header className="border-b border-slate-300 pb-2">
          <p className="text-[11px] font-bold text-slate-500">{patient.facilityName}</p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <h1 className="text-xl font-extrabold text-slate-900">خطة علاجية</h1>
            <p className="text-[11px] text-slate-600">رقم الملف {patient.fileNumber} · {formatDate(patient.registeredAt)}</p>
          </div>
        </header>
        <div className="mt-3 grid grid-cols-4 gap-2 text-[12px]">
          <Cell label="المريضة" value={patient.name} />
          <Cell label="العمر" value={patient.age} />
          <Cell label="الجوال" value={patient.phone} />
          <Cell label="الطبيبة" value={patient.doctor} />
        </div>
        <Block title="الشكوى الرئيسية" text={patient.chiefComplaint} lines={3} />
        <Block title="التشخيص السريري" text={patient.clinicalDiagnosis} lines={3} />
        <div className="mt-3">
          <h2 className="text-[12px] font-extrabold text-slate-800">السجلات المتوفرة</h2>
          <p className="mt-1 text-[12px] leading-5 text-slate-800">{records.length ? records.map((item) => item.label).join(" · ") : "—"}</p>
        </div>
        <div className="mt-3 space-y-1">
          <h2 className="text-[12px] font-extrabold text-slate-800">أهداف العلاج</h2>
          {GOAL_LABELS.map((label, index) => (
            <p key={label} className="text-[12px] leading-5 text-slate-800">
              <span className="font-bold">{label}: </span>
              {patient.goals[index] || "—"}
            </p>
          ))}
        </div>
      </article>
      <article className="a4-sheet">
        <header className="border-b border-slate-300 pb-2">
          <div className="flex items-end justify-between gap-3">
            <h1 className="text-lg font-extrabold text-slate-900">الخطة العلاجية المقترحة</h1>
            <p className="text-[11px] text-slate-600">{patient.name} · {patient.fileNumber}</p>
          </div>
        </header>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
          <Cell label="الأجهزة" value={appliances.length ? appliances.map((item) => item.label).join(" · ") : "—"} />
          <Cell label="الفك" value={jawLabel(patient.jaw)} />
          <Cell label="المدة التقديرية" value={patient.estimatedDuration} />
          <Cell label="خطة أخرى" value={patient.appliances.otherText || "—"} />
        </div>
        <Block title="مراحل العلاج والإجراءات الرئيسية" text={patient.treatmentStages} lines={5} />
        <Block title="المخاطر المحتملة" text={patient.risks} lines={4} />
        <Block title="التعليمات الخاصة / الحاجة لخلع" text={patient.specialInstructions} lines={4} />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Sign title="توقيع المريضة" name={patient.patientSignedName} image={patient.patientSignature} />
          <Sign title="توقيع الطبيبة" name={patient.doctorSignedName} image={patient.doctorSignature} />
        </div>
        <p className="mt-3 text-[10px] leading-4 text-slate-500">
          {patient.consent ? "تم اعتماد الموافقة على الخطة العلاجية." : "لم تُسجَّل موافقة على هذه النسخة."}
        </p>
      </article>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 px-2 py-1">
      <p className="text-[10px] font-bold text-slate-500">{label}</p>
      <p className="truncate text-[12px] font-extrabold text-slate-900">{value || "—"}</p>
    </div>
  );
}

function Block({ title, text, lines }: { title: string; text: string; lines: number }) {
  return (
    <div className="mt-3">
      <h2 className="text-[12px] font-extrabold text-slate-800">{title}</h2>
      <p className="mt-1 whitespace-pre-wrap text-[12px] leading-5 text-slate-800" style={{ maxHeight: `${lines * 1.25}rem`, overflow: "hidden" }}>
        {text || "—"}
      </p>
    </div>
  );
}

function Sign({ title, name, image }: { title: string; name: string; image: string }) {
  return (
    <div className="rounded border border-slate-200 px-2 py-2">
      <p className="text-[10px] font-bold text-slate-500">{title}</p>
      {image ? <img src={image} alt="" className="mt-1 h-14 w-full object-contain" /> : <div className="mt-1 h-14" />}
      <p className="text-[12px] font-extrabold text-slate-900">{name || "—"}</p>
    </div>
  );
}
