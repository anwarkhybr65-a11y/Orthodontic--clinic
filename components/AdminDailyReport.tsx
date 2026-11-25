import Link from "next/link";
import { CloseDayButton } from "@/components/CloseDayButton";
import { formatDate, formatMoney } from "@/lib/format";
import { BREAK_REASONS, VISIT_JAWS, optionLabel } from "@/lib/procedures";
import type { AdminDayReport } from "@/lib/types";

export function AdminDailyReport({ report, allowClose }: { report: AdminDayReport; allowClose: boolean }) {
  return (
    <div className="space-y-6">
      {report.closed ? (
        <p className="rounded-[1.5rem] border border-sage-200 bg-sage-50 px-5 py-4 text-sm font-bold text-sage-900">
          أُقفل هذا اليوم{report.closedAt ? ` في ${formatDate(report.closedAt)}` : ""} ومحفوظ في أرشيف الإدارة. لا يمكن تعديله.
        </p>
      ) : null}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="فرق الحضور والمسجّلين" value={String(report.gap)} warn={report.gap !== 0} />
        <Stat label="المبالغ المستحقة" value={formatMoney(report.due)} />
        <Stat label="المدفوع" value={formatMoney(report.paid)} />
        <Stat label="الباقي غير المحصّل" value={formatMoney(report.remaining)} warn={report.remaining > 0} />
        <Stat label="زيارات دون مبالغ" value={String(report.unpriced)} warn={report.unpriced > 0} />
      </section>
      <section className="rounded-[1.75rem] border border-white bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold">تنبيهات اليوم</h2>
        {report.alerts.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">لا تنبيهات. الحضور مطابق والمبالغ مسجّلة.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {report.alerts.map((alert) => (
              <li key={alert} className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold leading-7 text-amber-950">
                {alert}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">تفاصيل الحالات</h2>
        {report.lines.length === 0 ? (
          <p className="rounded-[1.5rem] bg-white px-4 py-12 text-center text-sm text-slate-500">لا زيارات مسجّلة في سجل الزيارات لهذا اليوم.</p>
        ) : (
          <div className="overflow-x-auto rounded-[1.75rem] border border-white bg-white shadow-sm">
            <table className="w-full min-w-[58rem] text-right text-sm">
              <thead className="bg-sage-50 text-xs font-bold text-sage-800">
                <tr>
                  <th className="px-4 py-3">اسم المريض</th>
                  <th className="px-4 py-3">الإجراء</th>
                  <th className="px-4 py-3">الفك</th>
                  <th className="px-4 py-3">البراكتات</th>
                  <th className="px-4 py-3">المستحق</th>
                  <th className="px-4 py-3">المدفوع</th>
                  <th className="px-4 py-3">الفرق</th>
                  <th className="px-4 py-3">السبب</th>
                </tr>
              </thead>
              <tbody>
                {report.lines.map((line) => (
                  <tr key={line.id} className="border-t border-sage-100 align-top">
                    <td className="px-4 py-3 font-extrabold">
                      <Link href={`/patients/${line.patientId}`} className="hover:underline">{line.patientName}</Link>
                    </td>
                    <td className="px-4 py-3">{line.procedureText || "—"}</td>
                    <td className="px-4 py-3">{optionLabel(VISIT_JAWS, line.jaw) || "—"}</td>
                    <td className="px-4 py-3">
                      {line.brokenBrackets > 0 ? `${line.brokenBrackets}${line.breakReason ? ` · ${optionLabel(BREAK_REASONS, line.breakReason)}` : ""}` : "—"}
                    </td>
                    <td className="px-4 py-3">{formatMoney(line.due)}</td>
                    <td className="px-4 py-3">{formatMoney(line.paid)}</td>
                    <td className="px-4 py-3 font-bold">{formatMoney(line.difference)}</td>
                    <td className="px-4 py-3 whitespace-pre-wrap text-slate-600">{line.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {allowClose && !report.closed ? <CloseDayButton /> : null}
    </div>
  );
}

function Stat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`rounded-[1.5rem] border bg-white px-5 py-4 shadow-sm ${warn ? "border-amber-300" : "border-white"}`}>
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${warn ? "text-amber-800" : "text-sage-800"}`}>{value}</p>
    </div>
  );
}
