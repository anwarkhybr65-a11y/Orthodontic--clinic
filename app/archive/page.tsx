import type { Metadata } from "next";
import Link from "next/link";
import { CalendarRange, ChevronLeft, CircleCheck, CircleDashed, FileOutput, FolderSearch } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { getStats, listAttendanceVisits, listReportDocs } from "@/lib/cached";
import { requirePage } from "@/lib/guard";
import { scopeFor } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "الأرشيف" };

const cards = [
  { href: "/archive/completed", title: "حالات منتهية", text: "ملفات اكتمل علاجها وأُغلقت.", icon: CircleCheck, key: "completed" as const },
  { href: "/archive/incomplete", title: "حالات غير منتهية", text: "ملفات بدأت ولم يكتمل علاجها.", icon: CircleDashed, key: "incomplete" as const },
  { href: "/archive/discharged", title: "حالات المخالصة", text: "من غادر العيادة قبل إكمال الخطة.", icon: FileOutput, key: "discharged" as const },
  { href: "/archive/reports", title: "تقارير", text: "خطط ومخالصات في ملفات سنوية مع بحث بالمدة.", icon: FolderSearch, key: "reports" as const },
  { href: "/archive/annual", title: "التقارير السنوية", text: "زيارات كل حالة بتاريخها ووقتها، منقولة من حضور اليوم إلى تقرير كل شهر.", icon: CalendarRange, key: "annual" as const },
];

export default async function ArchivePage() {
  const user = await requirePage("archive");
  const scope = scopeFor(user);
  const stats = await getStats(scope);
  const counts = {
    completed: stats.completed,
    incomplete: stats.incomplete,
    discharged: stats.discharged,
    reports: (await listReportDocs(scope)).length,
    annual: (await listAttendanceVisits(scope)).length,
  };

  return (
    <div>
      <PageHeader
        eyebrow="الحفظ طويل الأمد"
        title="الأرشيف"
        description="الملفات المغلقة والتقارير السنوية لزيارات الحضور. الحالات الجارية تبقى في قائمة الحالات."
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-[1.75rem] border border-white bg-white p-5 shadow-[0_18px_50px_-32px_rgba(36,63,50,0.5)] transition hover:-translate-y-0.5"
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-sage-50 text-sage-700 transition group-hover:bg-sage-700 group-hover:text-white">
                <Icon size={24} />
              </span>
              <span className="mt-4 flex items-center justify-between">
                <span className="text-lg font-extrabold">{card.title}</span>
                <ChevronLeft size={18} className="text-sage-500" />
              </span>
              <span className="mt-2 block text-sm leading-7 text-slate-600">{card.text}</span>
              <span className="mt-4 inline-flex rounded-full bg-sage-50 px-3 py-1 text-xs font-bold text-sage-800">
                {card.key === "annual" ? `${counts[card.key]} زيارة` : `${counts[card.key]} ملف`}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
