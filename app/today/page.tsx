import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { listAppointmentsOn } from "@/lib/db";
import { dayLabel, formatLong, todayISO } from "@/lib/format";
import { requireUser } from "@/lib/guard";
import { scopeFor } from "@/lib/permissions";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "مواعيد اليوم" };

export default async function TodayPage() {
  const user = await requireUser();
  if (user.role !== "doctor" && user.role !== "admin") notFound();
  const items = await listAppointmentsOn(todayISO(), user.role === "doctor" ? scopeFor(user) : undefined);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="اليوم"
        title="مواعيد اليوم"
        description={`${items.length} موعد مجدول لهذا اليوم.`}
      />
      {items.length === 0 ? (
        <p className="rounded-[1.5rem] bg-white px-4 py-12 text-center text-sm text-slate-500">لا مواعيد مجدولة اليوم.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link key={item.id} href={`/patients/${item.patientId}`} className="block rounded-[1.5rem] border border-white bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-extrabold">{item.patientName}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.fileNumber} · {dayLabel(item.appointmentDate)} · {formatLong(item.appointmentDate)}</p>
                  {item.reason ? <p className="mt-2 text-sm text-slate-700">{item.reason}</p> : null}
                </div>
                <p className="text-xl font-extrabold text-sage-800" dir="ltr">{item.appointmentTime}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
