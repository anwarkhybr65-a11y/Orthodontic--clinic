import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, CalendarDays } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { PageHeader } from "@/components/PageHeader";
import { listAttendanceVisits } from "@/lib/cached";
import { MONTHS, monthKey, parseYear } from "@/lib/months";
import { requirePage } from "@/lib/guard";
import { scopeFor } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: Promise<{ year: string }> }): Promise<Metadata> {
  return params.then(({ year }) => ({ title: `تقارير ${year}` }));
}

export default async function AnnualYearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year: raw } = await params;
  const year = parseYear(raw);
  if (!year) notFound();
  const user = await requirePage("archive");
  const visits = (await listAttendanceVisits(scopeFor(user))).filter((visit) => visit.attendDate.startsWith(`${year}-`));
  const counts = MONTHS.map((_, index) => visits.filter((visit) => visit.attendDate.startsWith(monthKey(year, index + 1))).length);

  return (
    <div>
      <BackLink href="/archive/annual">التقارير السنوية</BackLink>
      <PageHeader
        eyebrow={String(year)}
        title={`تقارير سنة ${year}`}
        description="تقرير لكل شهر. الزيارات هي نفسها المسجّلة في حضور اليوم، بتاريخها ووقتها."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {MONTHS.map((name, index) => (
          <Link
            key={name}
            href={`/archive/annual/${year}/${index + 1}`}
            className="group rounded-[1.75rem] border border-white bg-white p-5 shadow-sm transition hover:-translate-y-0.5"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sage-50 text-sage-700 transition group-hover:bg-sage-700 group-hover:text-white">
              <CalendarDays size={22} />
            </span>
            <span className="mt-4 flex items-center justify-between">
              <span className="text-lg font-extrabold">{name}</span>
              <ChevronLeft size={18} className="text-sage-500" />
            </span>
            <span className="mt-2 block text-sm text-slate-500">{counts[index]} زيارة</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
