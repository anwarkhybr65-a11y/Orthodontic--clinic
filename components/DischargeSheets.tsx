import {
  APPLIANCE_FLAGS,
  ATTENDANCE_OPTIONS,
  CLASS_OPTIONS,
  HEALTH_OPTIONS,
  HYGIENE_OPTIONS,
  IMAGING_ROWS,
  RETAINER_OPTIONS,
  STAGE_OPTIONS,
  WEAR_OPTIONS,
  labelOf,
  type DischargeDetails,
} from "@/lib/discharge-details";
import { formatDate } from "@/lib/format";

export type DischargeSheetInput = {
  facilityName: string;
  reportDate: string;
  patientName: string;
  fileNumber: string;
  age: string;
  phone: string;
  doctor: string;
  details: DischargeDetails;
  doctorSignedName: string;
  patientSignedName: string;
  doctorSignature: string;
  patientSignature: string;
  proceduresDone?: string;
  recommendations?: string;
  disclaimer?: string;
  reason?: string;
};

export function DischargeSheets({ data }: { data: DischargeSheetInput }) {
  const details = data.details;
  const health = details.health
    .map((item) => (item === "other" && details.healthOther ? `أخرى: ${details.healthOther}` : labelOf(HEALTH_OPTIONS, item)))
    .filter(Boolean);
  const dental = [
    details.previousOrtho ? "تقويم سابق" : "",
    details.toothFracture ? "كسر أسنان" : "",
    details.rootCanal ? "علاج عصب" : "",
    details.activeCaries ? "تسوس نشط" : "",
    details.gumDisease ? "أمراض لثة" : "",
  ].filter(Boolean);
  const allergies = [
    details.allergyNone ? "لا يوجد" : "",
    details.allergyNickel ? "نيكل" : "",
    details.allergyLatex ? "لاتكس" : "",
    details.allergyMeds ? (details.allergyMedsText ? `أدوية: ${details.allergyMedsText}` : "أدوية") : "",
  ].filter(Boolean);
  const appliances = APPLIANCE_FLAGS.filter((item) => details.appliances[item.id]).map((item) => item.label);
  const visits = details.recentVisits.filter((row) => row.date || row.upperWire || row.lowerWire || row.procedure).slice(0, 4);
  const teeth = [details.whiteSpots ? "بقع بيضاء" : "", details.caries ? "تسوس" : ""].filter(Boolean).join(" · ");
  const legacyProcedures =
    !details.bondingDate && !details.stage && !details.upperWire && !details.lowerWire && data.proceduresDone && data.proceduresDone !== "—"
      ? data.proceduresDone
      : "";
  const legacyAdvice =
    !details.upperRetainer && !details.lowerRetainer && !details.wear && data.recommendations && data.recommendations !== "—"
      ? data.recommendations
      : "";
  const legacyDisclaimer =
    data.disclaimer && data.disclaimer !== "أقرّ باستلام أصل الخطة العلاجية والمرفقات التشخيصية." ? data.disclaimer : "";

  return (
    <div>
      <article className="a4-sheet flex flex-col">
        <header className="border-b border-slate-300 pb-2">
          <p className="text-[11px] font-bold text-slate-500">{data.facilityName || "مجمع أنوار خيبر الطبي"}</p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <h1 className="text-xl font-extrabold text-slate-900">ملخص حالة وتصفية علاج التقويم</h1>
            <p className="text-[11px] text-slate-600">رقم الملف {data.fileNumber || "—"} · {formatDate(data.reportDate)}</p>
          </div>
        </header>
        <div className="mt-3 grid grid-cols-4 gap-2">
          <Cell label="اسم المريض" value={data.patientName} />
          <Cell label="رقم الملف" value={data.fileNumber} />
          <Cell label="العمر" value={data.age} />
          <Cell label="الجنس" value={details.gender} />
          <Cell label="رقم الهوية" value={details.nationalId} />
          <Cell label="رقم الجوال" value={data.phone} />
          <Cell label="تاريخ بدء العلاج" value={formatDate(details.treatmentStart)} />
          <Cell label="الطبيب المعالج" value={data.doctor} />
        </div>
        <Block title="الحالة الصحية" text={health.join(" · ")} />
        <div className="mt-2 grid gap-2">
          <Cell label="التاريخ السنّي" value={dental.join(" · ")} />
          <Cell label="الحساسية والأدوية" value={allergies.join(" · ")} />
        </div>
        {details.historyNotes ? <Block title="ملاحظات التاريخ" text={details.historyNotes} lines={2} /> : null}
        <Block title="الشكوى الرئيسية" text={details.chiefComplaint} lines={2} />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Cell label="النمط الهيكلي" value={labelOf(CLASS_OPTIONS, details.skeletalClass)} />
          <Cell label="علاقة القواطع" value={details.incisorRelation} />
        </div>
        <h2 className="mt-3 text-[12px] font-extrabold text-slate-800">السجلات التشخيصية المرفقة</h2>
        <table className="mt-1 w-full border-collapse text-right text-[11px]">
          <thead>
            <tr className="text-[10px] font-bold text-slate-500">
              <th className="border border-slate-200 px-2 py-1">السجل</th>
              <th className="border border-slate-200 px-2 py-1">التاريخ</th>
              <th className="border border-slate-200 px-2 py-1">جهة الإجراء</th>
              <th className="border border-slate-200 px-2 py-1">التسليم</th>
            </tr>
          </thead>
          <tbody>
            {IMAGING_ROWS.map((row) => (
              <tr key={row.key}>
                <td className="border border-slate-200 px-2 py-1 font-bold">{row.label}</td>
                <td className="border border-slate-200 px-2 py-1">{formatDate(details.imaging[row.key].date)}</td>
                <td className="border border-slate-200 px-2 py-1">{details.imaging[row.key].place || "—"}</td>
                <td className="border border-slate-200 px-2 py-1">{details.imaging[row.key].delivered ? "تم التسليم" : "لم يُسلَّم"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Cell label="الخلع" value={details.extraction === "teeth" ? `مع خلع ${details.extractionTeeth}` : details.extraction === "none" ? "بدون خلع" : ""} />
          <Cell label="نوع الجهاز" value={appliances.join(" · ")} />
        </div>
        <p className="mt-auto pt-2 text-[10px] text-slate-400">الصفحة 1 من 2</p>
      </article>

      <article className="a4-sheet flex flex-col">
        <header className="border-b border-slate-300 pb-2">
          <div className="flex items-end justify-between gap-3">
            <h1 className="text-lg font-extrabold text-slate-900">ما تم إنجازه وخطة التثبيت</h1>
            <p className="text-[11px] text-slate-600">{data.patientName || "—"} · {data.fileNumber || "—"}</p>
          </div>
        </header>
        <div className="mt-3 grid grid-cols-4 gap-2">
          <Cell label="تاريخ التركيب" value={formatDate(details.bondingDate)} />
          <Cell label="آخر زيارة" value={formatDate(details.lastVisitDate)} />
          <Cell label="عدد الزيارات" value={details.totalVisits} />
          <Cell label="المدة المتبقية" value={details.remainingDuration} />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Cell label="المرحلة الحالية" value={labelOf(STAGE_OPTIONS, details.stage)} />
          <Cell label="نظافة الفم" value={labelOf(HYGIENE_OPTIONS, details.hygiene)} />
          <Cell label="الالتزام" value={labelOf(ATTENDANCE_OPTIONS, details.attendance)} />
          <Cell label="تأثر الأسنان" value={teeth} />
          <Cell label="السلك العلوي" value={[details.upperWire, details.upperAlloy].filter(Boolean).join(" ")} />
          <Cell label="السلك السفلي" value={[details.lowerWire, details.lowerAlloy].filter(Boolean).join(" ")} />
        </div>
        {legacyProcedures ? <Block title="ما أُنجز" text={legacyProcedures} lines={2} /> : null}
        <h2 className="mt-3 text-[12px] font-extrabold text-slate-800">سجل آخر الزيارات</h2>
        <table className="mt-1 w-full border-collapse text-right text-[11px]">
          <thead>
            <tr className="text-[10px] font-bold text-slate-500">
              <th className="border border-slate-200 px-2 py-1">التاريخ</th>
              <th className="border border-slate-200 px-2 py-1">السلك العلوي</th>
              <th className="border border-slate-200 px-2 py-1">السلك السفلي</th>
              <th className="border border-slate-200 px-2 py-1">الإجراء والملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {visits.length === 0 ? (
              <tr>
                <td className="border border-slate-200 px-2 py-1 text-slate-500" colSpan={4}>لا توجد زيارات مسجّلة.</td>
              </tr>
            ) : (
              visits.map((row, index) => (
                <tr key={index}>
                  <td className="border border-slate-200 px-2 py-1">{formatDate(row.date)}</td>
                  <td className="border border-slate-200 px-2 py-1">{row.upperWire || "—"}</td>
                  <td className="border border-slate-200 px-2 py-1">{row.lowerWire || "—"}</td>
                  <td className="border border-slate-200 px-2 py-1">{row.procedure || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Cell label="مثبت الفك العلوي" value={labelOf(RETAINER_OPTIONS, details.upperRetainer)} />
          <Cell label="مثبت الفك السفلي" value={labelOf(RETAINER_OPTIONS, details.lowerRetainer)} />
          <Cell label="طريقة اللبس" value={labelOf(WEAR_OPTIONS, details.wear)} />
        </div>
        {legacyAdvice ? <Block title="التوصيات" text={legacyAdvice} lines={2} /> : null}
        <Block title="ملاحظات لطبيب التقويم المستقبل" text={details.handoverNotes || data.reason || ""} lines={3} />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Sign
            title="الطبيب المعالج"
            name={[data.doctorSignedName, details.doctorSpecialty, details.doctorLicense ? `تصنيف ${details.doctorLicense}` : ""].filter(Boolean).join(" · ")}
            date={formatDate(details.doctorSignDate)}
            image={data.doctorSignature}
          />
          <Sign
            title="المريض أو ولي الأمر"
            name={[data.patientSignedName, details.receivedOriginals ? "تم استلام أصل الخطة والمرفقات" : ""].filter(Boolean).join(" · ")}
            date={formatDate(details.recipientSignDate)}
            image={data.patientSignature}
          />
        </div>
        {legacyDisclaimer ? <p className="mt-2 line-clamp-3 text-[10px] leading-4 text-slate-500">{legacyDisclaimer}</p> : null}
        <p className="mt-auto pt-2 text-[10px] text-slate-400">الصفحة 2 من 2</p>
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

function Block({ title, text, lines = 2 }: { title: string; text: string; lines?: number }) {
  return (
    <div className="mt-2">
      <h2 className="text-[12px] font-extrabold text-slate-800">{title}</h2>
      <p className="mt-1 whitespace-pre-wrap text-[12px] leading-5 text-slate-800" style={{ maxHeight: `${lines * 1.25}rem`, overflow: "hidden" }}>
        {text || "—"}
      </p>
    </div>
  );
}

function Sign({ title, name, date, image }: { title: string; name: string; date: string; image: string }) {
  return (
    <div className="rounded border border-slate-200 px-2 py-2">
      <p className="text-[10px] font-bold text-slate-500">{title}</p>
      {image ? <img src={image} alt="" className="mt-1 h-12 w-full object-contain object-right" /> : <div className="mt-1 h-8 border-b border-slate-200" />}
      <p className="truncate text-[12px] font-extrabold text-slate-900">{name || "—"}</p>
      <p className="text-[10px] text-slate-500">{date}</p>
    </div>
  );
}
