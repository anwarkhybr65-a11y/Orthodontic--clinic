import type { Metadata } from "next";
import { DischargeForm } from "@/components/DischargeForm";
import { PageHeader } from "@/components/PageHeader";
import { PrintButton } from "@/components/PrintButton";
import { listPatients } from "@/lib/db";
import { requirePage } from "@/lib/guard";
import { scopeFor } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ملخص حالة وتصفية علاج التقويم" };

export default async function DischargePage({
  searchParams,
}: {
  searchParams: Promise<{ patient?: string }>;
}) {
  const { patient } = await searchParams;
  const user = await requirePage("discharge");
  const patients = (await listPatients(undefined, scopeFor(user))).filter(
    (item) => item.status === "active" || item.status === "incomplete" || item.status === "other",
  );
  return (
    <div>
      <div className="no-print">
        <PageHeader
          eyebrow="إنهاء قبل الاكتمال"
          title="ملخص حالة وتصفية علاج التقويم"
          description="نفس أقسام نموذج المجمع، بتصميم الموقع. الطباعة تخرج على صفحتين A4، والحفظ ينقل الملف إلى حالات المخالصة."
          action={<PrintButton label="طباعة التقرير" />}
        />
      </div>
      <DischargeForm patients={patients} initialPatientId={patient ?? ""} />
    </div>
  );
}
