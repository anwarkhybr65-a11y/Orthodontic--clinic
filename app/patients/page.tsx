import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { PatientRegistry } from "@/components/PatientRegistry";
import { attendedTodayIds, listNewIntakes, listPatients } from "@/lib/db";
import { requirePage } from "@/lib/guard";
import { can, scopeFor } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "قائمة الحالات" };

const filters = ["all", "incomplete", "pending", "completed", "discharged"] as const;

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; filter?: string; section?: string }>;
}) {
  const user = await requirePage("patients");
  const query = await searchParams;
  const isNew = query.filter === "new" && (user.role === "doctor" || user.role === "admin");
  const patients = isNew
    ? await listNewIntakes(user.role === "doctor" ? scopeFor(user) : undefined)
    : await listPatients(undefined, user.role === "doctor" ? scopeFor(user) : undefined);
  const showRegister = can(user.role, "intake") || can(user.role, "fullRegister");
  const requested = query.filter === "pending" || query.section === "unplanned" ? "pending" : query.filter;
  const initialChip = filters.find((item) => item === requested) ?? "all";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="سجل الملفات"
        title={isNew ? "حالات جديدة" : user.role === "customer_service" ? "الخطط العلاجية" : "قائمة الحالات"}
        description={
          isNew
            ? "ملفات سجّلها الاستقبال ولم تُفتح بعد. فتح الملف يُنهي التنبيه."
            : user.role === "customer_service"
            ? "بعد حفظ الطبيبة للخطة تظهر هنا جاهزة للطباعة. قيد العلاج هنا هي نفس حالات غير المنتهية في الأرشيف."
            : "كل الحالات، قيد العلاج، بلا خطة، المنتهية، والمخالصة. قيد العلاج هي نفس حالات غير المنتهية في الأرشيف."
        }
        action={
          showRegister ? (
            <Link href="/register" className="inline-flex items-center justify-center rounded-2xl bg-sage-700 px-4 py-3 text-sm font-bold text-white">
              {user.role === "reception" ? "تسجيل بيانات" : "تسجيل حالة"}
            </Link>
          ) : null
        }
      />
      {query.sent === "1" ? (
        <p className="rounded-2xl bg-sage-50 px-4 py-3 text-sm font-bold text-sage-800">تم إرسال الملف إلى الطبيبة.</p>
      ) : null}
      <PatientRegistry
        patients={patients}
        showAttendance
        attendedToday={await attendedTodayIds()}
        initialChip={initialChip}
        hideChips={isNew}
        emptyTitle={isNew ? "لا توجد حالات جديدة" : "لا توجد حالات"}
        emptyText={isNew ? "لا يوجد تسجيل جديد بانتظارك." : "لا توجد ملفات ضمن هذا العرض."}
      />
    </div>
  );
}
