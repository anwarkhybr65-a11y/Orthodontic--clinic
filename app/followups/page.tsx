import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FollowupNoticeCard } from "@/components/FollowupNoticeCard";
import { FollowupPicker } from "@/components/FollowupPicker";
import { PageHeader } from "@/components/PageHeader";
import { listFollowups, listPatients } from "@/lib/cached";
import { requireUser } from "@/lib/guard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "متابعة" };

export default async function FollowupsPage() {
  const user = await requireUser();
  const canSend = user.role === "reception" || user.role === "admin";
  const canRead = user.role === "doctor" || user.role === "admin";
  if (!canSend && !canRead) notFound();
  const patients = canSend
    ? (await listPatients()).map((patient) => ({
        id: patient.id,
        name: patient.name,
        fileNumber: patient.fileNumber,
        phone: patient.phone,
        doctor: patient.doctor,
      }))
    : [];
  const items = canRead ? await listFollowups(user.role === "doctor" ? user.id : undefined) : [];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="التنبيهات"
        title="متابعة"
        description={canSend ? "اختاري اسم المريض ليصل تنبيه إلى الطبيبة." : "تنبيهات أرسلها الاستقبال وتحتاج متابعة."}
      />
      {canSend ? <FollowupPicker patients={patients} /> : null}
      {canRead ? (
        items.length === 0 ? (
          <p className="rounded-[1.5rem] bg-white px-4 py-12 text-center text-sm text-slate-500">لا توجد تنبيهات متابعة.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <FollowupNoticeCard key={item.id} item={item} />
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
