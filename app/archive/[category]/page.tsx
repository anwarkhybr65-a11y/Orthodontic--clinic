import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { PageHeader } from "@/components/PageHeader";
import { PatientRegistry } from "@/components/PatientRegistry";
import { listPatients } from "@/lib/db";
import { requirePage } from "@/lib/guard";
import { scopeFor } from "@/lib/permissions";
import type { Status } from "@/lib/types";

export const dynamic = "force-dynamic";

const categories: Record<
  string,
  { title: string; description: string; status: Status; variant: "archive" | "discharged"; empty: string }
> = {
  completed: {
    title: "حالات منتهية",
    description: "الملفات التي اكتمل علاجها.",
    status: "completed",
    variant: "archive",
    empty: "لا توجد حالات منتهية بعد.",
  },
  incomplete: {
    title: "حالات غير منتهية",
    description: "الملفات التي بدأت ولم يكتمل علاجها.",
    status: "incomplete",
    variant: "archive",
    empty: "لا توجد حالات غير منتهية.",
  },
  discharged: {
    title: "حالات المخالصة",
    description: "الحالات التي غادرت قبل إكمال العلاج بعد إصدار تقرير المخالصة.",
    status: "discharged",
    variant: "discharged",
    empty: "لا توجد حالات مخالصة.",
  },
};

export function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  return params.then(({ category }) => ({ title: categories[category]?.title ?? "الأرشيف" }));
}

export default async function ArchiveCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { category } = await params;
  const { notice } = await searchParams;
  const user = await requirePage("archive");
  const config = categories[category];
  if (!config) notFound();
  const safeNotice = notice && /^[0-9a-f-]{36}$/i.test(notice) ? notice : "";

  return (
    <div>
      <BackLink href="/archive">الأرشيف</BackLink>
      <PageHeader eyebrow="أرشيف العيادة" title={config.title} description={config.description} />
      {safeNotice && category === "discharged" ? (
        <div className="mb-4 rounded-2xl border border-sage-200 bg-sage-50 px-4 py-3 text-sm font-semibold text-sage-900">
          تم حفظ التقرير ونقل الحالة إلى حالات المخالصة.{" "}
          <Link href={`/discharge/${safeNotice}`} className="font-extrabold underline">
            عرض التقرير
          </Link>
        </div>
      ) : null}
      <PatientRegistry patients={await listPatients(config.status, scopeFor(user))} variant={config.variant} emptyTitle={config.title} emptyText={config.empty} />
    </div>
  );
}
