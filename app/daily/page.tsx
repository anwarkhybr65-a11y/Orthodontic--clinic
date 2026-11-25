import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminDailyReport } from "@/components/AdminDailyReport";
import { PageHeader } from "@/components/PageHeader";
import { getAdminDayReport, listDailyVisits } from "@/lib/cached";
import { formatClock, formatMoney } from "@/lib/format";
import { requirePage } from "@/lib/guard";
import { scopeFor } from "@/lib/permissions";
import { BREAK_REASONS, PATIENT_TYPES, PAYMENT_METHODS, PROCEDURES, VISIT_JAWS, optionLabel } from "@/lib/procedures";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "التقارير اليومية" };

export default async function DailyReportPage() {
  const user = await requirePage("dailyReport");
  if (user.role !== "doctor" && user.role !== "admin") notFound();
  if (user.role === "admin") {
    const report = await getAdminDayReport();
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="الإدارة"
          title="التقارير اليومية"
          description="موجز الحضور والمبالغ وتنبيهات اليوم. إقفال اليوم يحفظ النسخة في أرشيف الإدارة فقط."
        />
        <AdminDailyReport report={report} allowClose />
      </div>
    );
  }
  const rows = await listDailyVisits(scopeFor(user));
  const due = rows.reduce((sum, row) => sum + row.due, 0);
  const paid = rows.reduce((sum, row) => sum + row.paid, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="اليوم"
        title="التقارير اليومية"
        description="جدول زيارات اليوم يتعبأ من حضور اليوم، والمبالغ من الإجراء المسجّل في ملف المريضة."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="زيارات اليوم" value={String(rows.length)} />
        <Stat label="المستحقات" value={formatMoney(due)} />
        <Stat label="المدفوع" value={formatMoney(paid)} />
      </div>
      {rows.length === 0 ? (
        <p className="rounded-[1.5rem] bg-white px-4 py-12 text-center text-sm text-slate-500">لا زيارات في حضور اليوم.</p>
      ) : (
        <div className="overflow-x-auto rounded-[1.75rem] border border-white bg-white shadow-sm">
          <table className="w-full min-w-[52rem] text-right text-sm">
            <thead className="bg-sage-50 text-xs font-bold text-sage-800">
              <tr>
                <th className="px-4 py-3">الاسم</th>
                <th className="px-4 py-3">رقم الملف</th>
                <th className="px-4 py-3">الوقت</th>
                <th className="px-4 py-3">نوع المريض</th>
                <th className="px-4 py-3">الإجراء</th>
                <th className="px-4 py-3">الدفع</th>
                <th className="px-4 py-3">المستحق</th>
                <th className="px-4 py-3">المدفوع</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-sage-100 align-top">
                  <td className="px-4 py-3 font-extrabold">
                    <Link href={`/patients/${row.patientId}`} className="hover:underline">{row.patientName}</Link>
                  </td>
                  <td className="px-4 py-3" dir="ltr">{row.fileNumber}</td>
                  <td className="px-4 py-3">{formatClock(row.recordedAt)}</td>
                  <td className="px-4 py-3">{optionLabel(PATIENT_TYPES, row.patientType) || "—"}</td>
                  <td className="px-4 py-3">
                    {optionLabel(PROCEDURES, row.procedureCode) || row.procedureText || "—"}
                    {row.jaw ? <p className="mt-1 text-xs text-slate-500">{optionLabel(VISIT_JAWS, row.jaw)}</p> : null}
                    {row.brokenBrackets > 0 ? (
                      <p className="mt-1 text-xs text-slate-500">براكت مكسور: {row.brokenBrackets} · {optionLabel(BREAK_REASONS, row.breakReason) || "—"}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{optionLabel(PAYMENT_METHODS, row.paymentMethod) || "—"}</td>
                  <td className="px-4 py-3">{formatMoney(row.due)}</td>
                  <td className="px-4 py-3 font-bold text-sage-800">{formatMoney(row.paid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white bg-white px-5 py-4 shadow-sm">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-sage-800">{value}</p>
    </div>
  );
}
