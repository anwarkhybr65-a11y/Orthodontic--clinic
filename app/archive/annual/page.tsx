import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Folder } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { PageHeader } from "@/components/PageHeader";
import { listAttendanceVisits } from "@/lib/cached";
import { todayISO } from "@/lib/format";
import { requirePage } from "@/lib/guard";
import { scopeFor } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "التقارير السنوية" };

export default async function AnnualReportsPage() {
  const user = await requirePage("archive");
  const visits = await listAttendanceVisits(scopeFor(user));
  const counts = new Map<string, number>();
  for (const visit of visits) {
    const year = visit.attendDate.slice(0, 4);
    if (!/^\d{4}$/.test(year)) continue;
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  const current = todayISO().slice(0, 4);
  if (!counts.has(current)) counts.set(current, 0);
  const years = Array.from(counts.entries()).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <div>
      <BackLink href="/archive">الأرشيف</BackLink>
      <PageHeader
        eyebrow="من حضور اليوم"
        title="التقارير السنوية"
        description="كل حضور يُسجَّل في قائمة حضور اليوم ينتقل هنا مباشرة، مرتباً داخل سنة ثم شهر، مع تاريخ الزيارة ووقتها."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {years.map(([year, count]) => (
          <Link
            key={year}
            href={`/archive/annual/${year}`}
            className="group rounded-[1.75rem] border border-white bg-white p-5 shadow-sm transition hover:-translate-y-0.5"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sage-50 text-sage-700 transition group-hover:bg-sage-700 group-hover:text-white">
              <Folder size={22} />
            </span>
            <span className="mt-4 flex items-center justify-between">
              <span className="text-2xl font-extrabold">{year}</span>
              <ChevronLeft size={18} className="text-sage-500" />
            </span>
            <span className="mt-2 block text-sm text-slate-500">{count} زيارة</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
