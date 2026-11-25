import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { PageHeader } from "@/components/PageHeader";
import { listClosedDays } from "@/lib/cached";
import { formatDate, formatMoney } from "@/lib/format";
import { requirePage } from "@/lib/guard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "تقارير الأيام المقفلة" };

export default async function ClosedDaysPage() {
  const user = await requirePage("archive");
  if (user.role !== "admin") notFound();
  const days = await listClosedDays();

  return (
    <div className="space-y-6">
      <BackLink href="/archive">الأرشيف</BackLink>
      <PageHeader
        eyebrow="أرشيف الإدارة"
        title="تقارير الأيام المقفلة"
        description="نسخ محفوظة بعد إقفال اليوم. لا تظهر في أرشيف الطبيبة ولا يمكن تعديلها."
      />
      {days.length === 0 ? (
        <p className="rounded-[1.5rem] bg-white px-4 py-12 text-center text-sm text-slate-500">لم يُقفل أي يوم بعد.</p>
      ) : (
        <div className="space-y-3">
          {days.map((day) => (
            <Link key={day.date} href={`/archive/daily/${day.date}`} className="block rounded-[1.5rem] border border-white bg-white px-5 py-4 shadow-sm hover:bg-sage-50">
              <span className="block font-extrabold">{formatDate(day.date)}</span>
              <span className="mt-1 block text-sm text-slate-600">
                {day.visits} زيارة · فرق الحضور {day.gap} · غير المحصّل {formatMoney(day.remaining)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
