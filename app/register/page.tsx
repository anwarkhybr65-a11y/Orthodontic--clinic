import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { IntakeForm } from "@/components/IntakeForm";
import { PageHeader } from "@/components/PageHeader";
import { RegisterForm } from "@/components/RegisterForm";
import { getFacilityName, listDoctors } from "@/lib/cached";
import { nextFileNumber } from "@/lib/db";
import { todayISO } from "@/lib/format";
import { requireUser } from "@/lib/guard";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "تسجيل الحالة" };

export default async function RegisterPage() {
  const user = await requireUser();
  const date = todayISO();
  const fileNumber = await nextFileNumber();

  if (user.role === "reception") {
    if (!can(user.role, "intake")) redirect("/");
    return (
      <div>
        <PageHeader
          eyebrow="استقبال"
          title="بيانات المريض"
          description="عبّئي البيانات الأساسية ثم أرسلي الملف إلى الطبيبة المعنية ليظهر في حسابها فوراً."
        />
        <IntakeForm doctors={await listDoctors()} fileNumber={fileNumber} date={date} />
      </div>
    );
  }

  if (!can(user.role, "fullRegister")) redirect("/");
  return (
    <div>
      <PageHeader
        eyebrow="خطة علاجية"
        title="تسجيل الحالة"
        description="نموذج عيادة تقويم الأسنان. بعد الحفظ يُنشأ ملف المريض وتُفتح صفحته مباشرة."
      />
      <RegisterForm
        doctors={await listDoctors()}
        defaults={{
          facilityName: await getFacilityName(),
          fileNumber,
          date,
        }}
      />
    </div>
  );
}
