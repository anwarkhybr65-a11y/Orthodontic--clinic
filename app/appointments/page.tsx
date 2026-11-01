import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppointmentsBoard } from "@/components/AppointmentsBoard";
import { MarkAttendanceForm } from "@/components/MarkAttendanceForm";
import { PageHeader } from "@/components/PageHeader";
import { attendedTodayIds, listAppointments, listPatients, listTodayAttendance } from "@/lib/cached";
import { requireUser } from "@/lib/guard";
import { can, scopeFor } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "سجل المراجعين" };

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ patient?: string }>;
}) {
  const { patient } = await searchParams;
  const user = await requireUser();
  if (!can(user.role, "patients")) notFound();
  const manage = can(user.role, "appointments");
  const canBook = user.role !== "doctor";
  const scope = user.role === "doctor" ? scopeFor(user) : undefined;
  const attendance = await listTodayAttendance();
  const attendancePatients = (await listPatients()).map((item) => ({ id: item.id, name: item.name, fileNumber: item.fileNumber }));

  return (
    <div className="space-y-8">
      {manage ? (
        <div>
          <PageHeader
            eyebrow="المواعيد"
            title="سجل المراجعين"
            description={
              canBook
                ? "حجز المواعيد، وتأكيد الحضور، وتسجيل حضور اليوم حتى لمن جاء بدون موعد."
                : "عرض المواعيد المحجوزة ومن حضر ومن لم يحضر. حجز الموعد الجديد يتم من الاستقبال."
            }
          />
          <AppointmentsBoard
            appointments={await listAppointments(scope)}
            patients={await listPatients(undefined, scope)}
            initialPatientId={patient ?? ""}
            attendedToday={await attendedTodayIds()}
            canBook={canBook}
          />
        </div>
      ) : (
        <PageHeader
          eyebrow="الحضور"
          title="حضور اليوم"
          description="الحالات التي حضرت العيادة اليوم، بموعد أو بدونه."
        />
      )}

      <section id="attendance" className="rounded-[1.75rem] border border-white bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold">حضور اليوم</h2>
        <p className="mt-1 text-sm text-slate-500">الحالات التي حضرت العيادة اليوم، بموعد أو بدونه.</p>
        <div className="mt-4">
          <MarkAttendanceForm patients={attendancePatients} />
        </div>
        {attendance.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">لم يُسجَّل حضور اليوم بعد.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {attendance.map((item) => (
              <Link key={item.id} href={`/patients/${item.patientId}`} className="flex items-center justify-between gap-3 rounded-2xl bg-sage-50 px-4 py-3">
                <span>
                  <span className="block font-extrabold">{item.patientName}</span>
                  <span className="text-xs text-slate-500">{item.fileNumber} · {item.phone}</span>
                </span>
                <span className="text-xs font-bold text-sage-800">{item.hadAppointment ? "لديه موعد" : "بدون موعد"}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
