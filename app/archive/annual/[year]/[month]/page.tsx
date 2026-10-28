import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { PageHeader } from "@/components/PageHeader";
import { listAttendanceVisits } from "@/lib/db";
import { formatClock, formatDate } from "@/lib/format";
import { MONTHS, monthKey, parseMonth, parseYear } from "@/lib/months";
import { requirePage } from "@/lib/guard";
import { scopeFor } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: Promise<{ year: string; month: string }> }): Promise<Metadata> {
  return params.then(({ year, month }) => {
    const index = parseMonth(month);
    return { title: index ? `تقرير ${MONTHS[index - 1]} ${year}` : "التقرير الشهري" };
  });
}

export default async function AnnualMonthPage({ params }: { params: Promise<{ year: string; month: string }> }) {
  const { year: rawYear, month: rawMonth } = await params;
  const year = parseYear(rawYear);
  const month = parseMonth(rawMonth);
  if (!year || !month) notFound();
  const user = await requirePage("archive");
  const key = monthKey(year, month);
  const visits = (await listAttendanceVisits(scopeFor(user))).filter((visit) => visit.attendDate.startsWith(key));
  const files = new Map<string, { patientId: string; name: string; fileNumber: string; doctor: string; visits: typeof visits }>();
  for (const visit of visits) {
    const current = files.get(visit.patientId) ?? {
      patientId: visit.patientId,
      name: visit.patientName,
      fileNumber: visit.fileNumber,
      doctor: visit.doctor,
      visits: [],
    };
    current.visits.push(visit);
    files.set(visit.patientId, current);
  }
  const groups = Array.from(files.values()).sort((a, b) => a.name.localeCompare(b.name, "ar"));

  return (
    <div>
      <BackLink href={`/archive/annual/${year}`}>تقارير سنة {year}</BackLink>
      <PageHeader
        eyebrow={`${MONTHS[month - 1]} ${year}`}
        title={`تقرير ${MONTHS[month - 1]}`}
        description="ملفات زيارات الحالات في هذا الشهر. التاريخ والوقت من تسجيل الحضور في قائمة حضور اليوم."
      />
      {groups.length === 0 ? (
        <p className="rounded-[1.5rem] bg-white px-4 py-12 text-center text-sm text-slate-500">لا توجد زيارات في هذا الشهر.</p>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <section key={group.patientId} className="rounded-[1.75rem] border border-white bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-extrabold text-ink">{group.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    <span dir="ltr">{group.fileNumber}</span>
                    {group.doctor ? ` · ${group.doctor}` : ""}
                  </p>
                </div>
                <Link href={`/patients/${group.patientId}`} className="rounded-2xl bg-sage-50 px-4 py-2 text-sm font-bold text-sage-800">
                  ملف الحالة
                </Link>
              </div>
              <ul className="mt-4 space-y-2">
                {group.visits.map((visit) => (
                  <li key={visit.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-sage-50 px-4 py-3 text-sm">
                    <span className="font-bold text-ink">{formatDate(visit.attendDate)}</span>
                    <span className="font-extrabold text-sage-800" dir="ltr">
                      {formatClock(visit.recordedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
