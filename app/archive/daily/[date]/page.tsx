import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminDailyReport } from "@/components/AdminDailyReport";
import { BackLink } from "@/components/BackLink";
import { PageHeader } from "@/components/PageHeader";
import { getAdminDayReport } from "@/lib/cached";
import { formatDate } from "@/lib/format";
import { requirePage } from "@/lib/guard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "تقرير يوم مقفل" };

export default async function ClosedDayPage({ params }: { params: Promise<{ date: string }> }) {
  const user = await requirePage("archive");
  if (user.role !== "admin") notFound();
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  const report = await getAdminDayReport(date);
  if (!report.closed) notFound();

  return (
    <div className="space-y-6">
      <BackLink href="/archive/daily">تقارير الأيام المقفلة</BackLink>
      <PageHeader eyebrow="أرشيف الإدارة" title={`تقرير ${formatDate(date)}`} description="نسخة مقفلة. لا يمكن تعديل بياناتها." />
      <AdminDailyReport report={report} allowClose={false} />
    </div>
  );
}
