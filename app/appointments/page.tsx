import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppointmentsBoard } from "@/components/AppointmentsBoard";
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
  const canBook = user.role === "reception" || user.role === "admin";
  const scope = user.role === "doctor" ? scopeFor(user) : undefined;
  const [attendance, appointments, scopedPatients, attendedToday] = await Promise.all([
    listTodayAttendance(),
    listAppointments(scope),
    listPatients(undefined, scope),
    attendedTodayIds(),
  ]);

  return (
    <div className="space-y-8">
      {manage ? (
        <div>
          <PageHeader
            eyebrow="المواعيد"
            title="سجل المراجعين"
            description={
              canBook
                ? "حجز المواعيد وتأكيد الحضور. حضور اليوم يمتلئ تلقائياً عند تسجيل حالة جديدة أو إرسال متابعة."
                : "عرض المواعيد المحجوزة ومن حضر. حجز الموعد الجديد يتم من الاستقبال."
            }
          />
          <AppointmentsBoard
            appointments={appointments}
            patients={scopedPatients}
            initialPatientId={patient ?? ""}
            attendedToday={attendedToday}
            attendance={attendance}
            canBook={canBook}
          />
        </div>
      ) : (
        <AppointmentsBoard
          appointments={appointments}
          patients={scopedPatients}
          attendedToday={attendedToday}
          attendance={attendance}
          canBook={false}
        />
      )}
    </div>
  );
}
