"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui";
import { mutate } from "@/lib/api-client";
import { formatMoney } from "@/lib/format";
import type { ReconciliationVisit } from "@/lib/types";

export function ReconciliationBoard({ visits, mismatched }: { visits: ReconciliationVisit[]; mismatched: boolean }) {
  const router = useRouter();
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(visits.map((visit) => [visit.id, String(visit.paid)])),
  );
  const [busyId, setBusyId] = useState("");
  const [alerting, setAlerting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function savePaid(id: string) {
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      await mutate("/api/reconcile/payment", "POST", { visitId: id, paidAmount: Number(amounts[id]) || 0 });
      setMessage("تم حفظ المبلغ، وسينتقل الفرق إلى الزيارة القادمة إن وجد.");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حفظ المبلغ");
    } finally {
      setBusyId("");
    }
  }

  async function alertDoctor() {
    setAlerting(true);
    setError("");
    setMessage("");
    try {
      const result = await mutate<{ sent: number }>("/api/reconcile/alert", "POST", {});
      setMessage(result.sent > 0 ? `وصل التنبيه إلى الطبيبة عن ${result.sent} حالة.` : "التنبيه موجود لدى الطبيبة ولم يُكرَّر.");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر إرسال التنبيه");
    } finally {
      setAlerting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold">زيارات اليوم المسجّلة</h2>
        <Button type="button" variant="secondary" onClick={alertDoctor} disabled={!mismatched || alerting}>
          <Bell size={16} />
          {alerting ? "جارٍ الإرسال..." : "إرسال تنبيه للطبيبة"}
        </Button>
      </div>
      {message ? <p className="rounded-2xl bg-sage-50 px-4 py-3 text-sm font-bold text-sage-800">{message}</p> : null}
      {error ? <p className="text-sm font-bold text-rose-700">{error}</p> : null}
      {visits.length === 0 ? (
        <p className="rounded-[1.5rem] bg-white px-4 py-12 text-center text-sm text-slate-500">لا توجد زيارات مسجّلة في سجل الزيارات اليوم.</p>
      ) : (
        <div className="overflow-x-auto rounded-[1.75rem] border border-white bg-white shadow-sm">
          <table className="w-full min-w-[52rem] text-right text-sm">
            <thead className="bg-sage-50 text-xs font-bold text-sage-800">
              <tr>
                <th className="px-4 py-3">الاسم</th>
                <th className="px-4 py-3">رقم الملف</th>
                <th className="px-4 py-3">الإجراء</th>
                <th className="px-4 py-3">المستحق</th>
                <th className="px-4 py-3">المبلغ المدفوع</th>
                <th className="px-4 py-3">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((visit) => {
                const typed = Number(amounts[visit.id]);
                const paid = Number.isFinite(typed) ? typed : visit.paid;
                const remaining = Math.max(0, Math.round((visit.due - paid) * 100) / 100);
                return (
                  <tr key={visit.id} className="border-t border-sage-100 align-top">
                    <td className="px-4 py-3 font-extrabold">{visit.patientName}</td>
                    <td className="px-4 py-3" dir="ltr">{visit.fileNumber}</td>
                    <td className="px-4 py-3">
                      {visit.procedureText || "—"}
                      {visit.carried > 0 ? <p className="mt-1 text-xs text-slate-500">يشمل متبقي سابق {formatMoney(visit.carried)}</p> : null}
                    </td>
                    <td className="px-4 py-3">{formatMoney(visit.due)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          dir="ltr"
                          inputMode="decimal"
                          value={amounts[visit.id] ?? ""}
                          onChange={(event) => setAmounts({ ...amounts, [visit.id]: event.target.value })}
                          className="w-24 rounded-xl border border-sage-200 px-3 py-2 text-left text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => savePaid(visit.id)}
                          disabled={busyId === visit.id}
                          className="rounded-xl bg-sage-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                        >
                          {busyId === visit.id ? "..." : "حفظ"}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold">
                      {remaining === 0 ? (
                        <span className="text-emerald-700">مطابق</span>
                      ) : (
                        <span className="text-amber-800">غير مطابق · المتبقي {formatMoney(remaining)} يُضاف للزيارة القادمة</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
