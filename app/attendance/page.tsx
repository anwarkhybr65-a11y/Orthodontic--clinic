import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { listTodayAttendance } from "@/lib/cached";
import { requireUser } from "@/lib/guard";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "حضور اليوم" };

export default async function AttendancePage() {
  const user = await requireUser();
  if (!can(user.role, "patients")) notFound();
  const items = await listTodayAttendance();

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="اليوم"
        title="حضور اليوم"
        description="من حضر العيادة اليوم، سواء كان لديه موعد مسبق أو جاء بدون موعد."
      />
      {items.length === 0 ? (
        <p className="rounded-[1.5rem] bg-white px-4 py-12 text-center text-sm text-slate-500">لم يُسجَّل حضور اليوم بعد.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link key={item.id} href={`/patients/${item.patientId}`} className="block rounded-[1.5rem] border border-white bg-white p-4 shadow-sm">
              <p className="text-lg font-extrabold">{item.patientName}</p>
              <p className="mt-1 text-sm text-slate-500">{item.fileNumber} · {item.phone}</p>
              <p className="mt-2 text-xs font-bold text-sage-800">{item.hadAppointment ? "لديه موعد اليوم" : "حضر بدون موعد مسبق"}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
