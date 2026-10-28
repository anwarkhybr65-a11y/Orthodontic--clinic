import type { Metadata } from "next";
import { BackLink } from "@/components/BackLink";
import { PageHeader } from "@/components/PageHeader";
import { ReportsExplorer } from "@/components/ReportsExplorer";
import { listReportDocs } from "@/lib/db";
import { requirePage } from "@/lib/guard";
import { scopeFor } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "تقارير الأرشيف" };

export default async function ReportsPage() {
  const user = await requirePage("archive");
  return (
    <div>
      <BackLink href="/archive">الأرشيف</BackLink>
      <PageHeader
        eyebrow="ملفات سنوية"
        title="التقارير"
        description="كل خطة علاجية وتقرير مخالصة محفوظ داخل سنة تسجيله، مع بحث من تاريخ إلى تاريخ وبالاسم ورقم الملف."
      />
      <ReportsExplorer docs={await listReportDocs(scopeFor(user))} />
    </div>
  );
}
