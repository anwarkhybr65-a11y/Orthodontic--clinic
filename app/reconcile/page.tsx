import type { Metadata } from "next";
import { ReconciliationBoard } from "@/components/ReconciliationBoard";
import { PageHeader } from "@/components/PageHeader";
import { listReconciliation } from "@/lib/cached";
import { requirePage } from "@/lib/guard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "المطابقة اليومية" };

export default async function ReconcilePage() {
  await requirePage("reconcile");
  const report = await listReconciliation();
  const difference = report.attendance - report.recordedPatients;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="الاستقبال"
        title="المطابقة اليومية"
        description="عدد الحضور من حضور اليوم، والمسجّل من سجل الزيارات. لا يُقفل اليوم وفي الحضور من لم يُسجَّل له."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="عدد الحضور" value={String(report.attendance)} />
        <Stat label="المسجّل في سجل الزيارات" value={String(report.recordedPatients)} />
        <Stat label="الفرق" value={String(difference)} warn={difference !== 0} />
      </div>
      {difference !== 0 ? (
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="font-extrabold text-amber-950">لا يُقفل اليوم دون تسجيل غير المسجّلين.</p>
          <p className="mt-2 text-sm leading-7 text-amber-900">
            {report.missing.map((item) => `${item.patientName} (${item.fileNumber})`).join(" · ")}
          </p>
        </div>
      ) : (
        <p className="rounded-[1.5rem] bg-sage-50 px-5 py-4 text-sm font-bold text-sage-800">الحضور مطابق لمن سُجّلت لهم زيارة اليوم.</p>
      )}
      <ReconciliationBoard visits={report.visits} mismatched={difference !== 0} />
    </div>
  );
}

function Stat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`rounded-[1.5rem] border bg-white px-5 py-4 shadow-sm ${warn ? "border-amber-300" : "border-white"}`}>
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold ${warn ? "text-amber-800" : "text-sage-800"}`}>{value}</p>
    </div>
  );
}
