import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { PrintButton } from "@/components/PrintButton";
import { PrintLogo } from "@/components/PrintLogo";
import { getFacilityName, listDebts } from "@/lib/cached";
import { formatDate, formatMoney, todayISO } from "@/lib/format";
import { requirePage } from "@/lib/guard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "المديونيات" };

export default async function DebtsPage() {
  await requirePage("debts");
  const [facilityName, debts] = await Promise.all([getFacilityName(), listDebts()]);
  const total = debts.reduce((sum, item) => sum + item.remaining, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="الحسابات"
        title="المديونيات"
        description="الحالات التي بقي عليها مبلغ بعد آخر زيارة مسجّلة، مع الإجراء الذي تم."
        action={<PrintButton label="طباعة المديونيات" />}
      />
      <article className="print-sheet rounded-[1.75rem] border border-white bg-white p-5 shadow-sm">
        <header className="mb-4 hidden items-center justify-between gap-3 border-b border-slate-200 pb-3 print:flex">
          <PrintLogo className="h-10" />
          <div>
            <p className="text-sm font-bold text-slate-500">{facilityName}</p>
            <h2 className="text-xl font-extrabold">كشف المديونيات</h2>
            <p className="text-xs text-slate-500">{formatDate(todayISO())}</p>
          </div>
        </header>
        <p className="mb-4 text-sm font-bold text-sage-800">إجمالي المتبقي: {formatMoney(total)} · {debts.length} حالة</p>
        {debts.length === 0 ? (
          <p className="px-2 py-10 text-center text-sm text-slate-500">لا توجد مبالغ متبقية.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-right text-sm">
              <thead className="bg-sage-50 text-xs font-bold text-sage-800">
                <tr>
                  <th className="px-4 py-3">الاسم</th>
                  <th className="px-4 py-3">رقم الملف</th>
                  <th className="px-4 py-3">الجوال</th>
                  <th className="px-4 py-3">الطبيبة</th>
                  <th className="px-4 py-3">الإجراء</th>
                  <th className="px-4 py-3">تاريخ الزيارة</th>
                  <th className="px-4 py-3">المستحق</th>
                  <th className="px-4 py-3">المدفوع</th>
                  <th className="px-4 py-3">المتبقي</th>
                </tr>
              </thead>
              <tbody>
                {debts.map((item) => (
                  <tr key={item.patientId} className="border-t border-sage-100">
                    <td className="px-4 py-3 font-extrabold">
                      <Link href={`/patients/${item.patientId}`} className="hover:underline print:no-underline">{item.patientName}</Link>
                    </td>
                    <td className="px-4 py-3" dir="ltr">{item.fileNumber}</td>
                    <td className="px-4 py-3" dir="ltr">{item.phone || "—"}</td>
                    <td className="px-4 py-3">{item.doctor || "—"}</td>
                    <td className="px-4 py-3">{item.procedureText || "—"}</td>
                    <td className="px-4 py-3">{formatDate(item.visitDate)}</td>
                    <td className="px-4 py-3">{formatMoney(item.due)}</td>
                    <td className="px-4 py-3">{formatMoney(item.paid)}</td>
                    <td className="px-4 py-3 font-extrabold text-rose-700">{formatMoney(item.remaining)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </div>
  );
}
