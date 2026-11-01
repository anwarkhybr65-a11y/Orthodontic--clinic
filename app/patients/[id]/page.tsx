import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { FollowupSender } from "@/components/FollowupSender";
import { PatientDetail } from "@/components/PatientDetail";
import { PlanDocument } from "@/components/PlanDocument";
import { getPatient, listDoctors } from "@/lib/cached";
import { clearIntakeAlert } from "@/lib/db";
import { assertPatient, requireUser } from "@/lib/guard";
import { can } from "@/lib/permissions";
import { ClinicError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ملف المريض" };

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!can(user.role, "patients")) notFound();
  const { id } = await params;
  const patient = await getPatient(id);
  if (!patient) notFound();
  if (user.role !== "customer_service" && user.role !== "reception") {
    try {
      assertPatient(user, patient);
    } catch (error) {
      if (error instanceof ClinicError) notFound();
      throw error;
    }
  }
  if (user.role === "doctor" || user.role === "admin") await clearIntakeAlert(patient.id);
  if (user.role === "customer_service") {
    return (
      <div className="space-y-5">
        <div className="no-print">
          <BackLink href="/patients">الخطط العلاجية</BackLink>
        </div>
        {patient.planReady ? (
          <PlanDocument patient={patient} />
        ) : (
          <section className="rounded-[1.75rem] border border-white bg-white p-6">
            <h1 className="text-2xl font-extrabold">{patient.name}</h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">الخطة العلاجية لم تُحفظ بعد. ستظهر هنا تلقائياً بعد أن تكملها الطبيبة، مع زر الطباعة.</p>
          </section>
        )}
      </div>
    );
  }

  if (user.role === "reception") {
    return (
      <div className="space-y-5">
        <BackLink href="/patients">قائمة الحالات</BackLink>
        <section className="rounded-[1.75rem] border border-white bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-sage-700">ملف مُرسل</p>
          <h1 className="mt-2 text-3xl font-extrabold text-ink">{patient.name}</h1>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <Item label="رقم الملف" value={patient.fileNumber} />
            <Item label="العمر" value={patient.age} />
            <Item label="الجوال" value={patient.phone} />
            <Item label="الطبيبة" value={patient.doctor} />
          </dl>
          <p className="mt-5 rounded-2xl bg-sage-50 px-4 py-3 text-sm font-bold text-sage-800">
            {patient.planReady ? "اكتملت الخطة العلاجية." : "بانتظار إكمال الخطة من حساب الطبيبة."}
          </p>
          <div className="mt-5">
            <FollowupSender patientId={patient.id} />
          </div>
        </section>
      </div>
    );
  }

  return <PatientDetail patient={patient} role={user.role} doctors={user.role === "admin" ? await listDoctors() : []} />;
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-sage-50 px-4 py-3">
      <dt className="text-xs font-bold text-sage-700">{label}</dt>
      <dd className="mt-1 font-extrabold text-ink">{value || "—"}</dd>
    </div>
  );
}
