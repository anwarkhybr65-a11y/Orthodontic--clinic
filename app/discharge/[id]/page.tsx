import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { DischargeDocument } from "@/components/DischargeDocument";
import { getDischarge, getPatient } from "@/lib/db";
import { assertPatient, requirePage } from "@/lib/guard";
import { ClinicError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ملخص حالة وتصفية علاج التقويم" };

export default async function DischargeViewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePage("archive");
  const { id } = await params;
  const report = await getDischarge(id);
  if (!report) notFound();
  const patient = await getPatient(report.patientId);
  if (!patient) notFound();
  try {
    assertPatient(user, patient);
  } catch (error) {
    if (error instanceof ClinicError) notFound();
    throw error;
  }
  return (
    <div>
      <BackLink href="/archive/discharged">حالات المخالصة</BackLink>
      <DischargeDocument report={report} />
    </div>
  );
}
