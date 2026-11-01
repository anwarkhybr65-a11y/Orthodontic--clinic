import Link from "next/link";
import { Archive, Bell, CalendarCheck, CalendarClock, ChevronLeft, ClipboardList, ClipboardPlus, FileOutput, UserPlus, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { getFacilityName, getNavCounts, getStats, countNewIntakes, listFollowups, listTodayAttendance } from "@/lib/cached";
import { formatLong, todayISO } from "@/lib/format";
import { requireUser } from "@/lib/guard";
import { can, scopeFor } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireUser();
  const facilityName = await getFacilityName();
  const today = todayISO();
  const counts = await getNavCounts(scopeFor(user), user.role === "doctor" ? user.id : undefined);
  const stats = await getStats(scopeFor(user));
  const attendanceCount = (await listTodayAttendance()).length;
  const notices = user.role === "doctor" || user.role === "admin" ? (await listFollowups(user.role === "doctor" ? user.id : undefined)).filter((item) => !item.read).slice(0, 4) : [];
  const showPlanAlert = (user.role === "doctor" || user.role === "admin") && counts.pending > 0;
  const newCases = user.role === "doctor" || user.role === "admin" ? await countNewIntakes(scopeFor(user)) : 0;
  const cards = [
    {
      href: "/patients?filter=new",
      label: "حالة جديدة",
      value: newCases,
      icon: UserPlus,
      show: user.role === "doctor" || user.role === "admin",
      alert: newCases > 0,
    },
    { href: "/patients?filter=incomplete", label: "قيد العلاج", value: stats.incomplete, icon: Users, show: can(user.role, "patients"), alert: false },
    { href: "/patients?filter=pending", label: "بلا خطة", value: counts.pending, icon: ClipboardList, show: user.role === "doctor" || user.role === "admin", alert: false },
    { href: "/appointments#attendance", label: "حضور اليوم", value: attendanceCount, icon: CalendarCheck, show: true, alert: false },
    { href: "/appointments", label: "مواعيد محجوزة", value: counts.upcoming, icon: CalendarClock, show: can(user.role, "appointments"), alert: false },
    {
      href: "/followups",
      label: "متابعة",
      value: counts.followups,
      icon: Bell,
      show: user.role === "reception" || user.role === "doctor" || user.role === "admin",
      alert: (user.role === "doctor" || user.role === "admin") && counts.followups > 0,
    },
  ].filter((card) => card.show);
  const sections = [
    {
      href: "/register",
      title: user.role === "reception" ? "تسجيل بيانات المريض" : "تسجيل الحالة",
      text: user.role === "reception" ? "البيانات الأساسية ثم إرسال الملف إلى الطبيبة." : "نموذج الخطة العلاجية وإنشاء ملف المريض فوراً.",
      icon: ClipboardPlus,
      show: user.role === "reception" ? can(user.role, "intake") : can(user.role, "fullRegister"),
    },
    {
      href: "/patients",
      title: user.role === "customer_service" ? "الخطط العلاجية" : "قائمة الحالات",
      text: user.role === "customer_service" ? "الخطط المكتملة تظهر هنا للطباعة." : "بحث بالاسم أو الملف أو الجوال، ثم فتح صفحة المريض.",
      icon: Users,
      show: can(user.role, "patients"),
    },
    {
      href: "/followups",
      title: "إشعارات المتابعة",
      text: "تنبيهات يرسلها الاستقبال عن حالات المتابعة.",
      icon: Bell,
      show: user.role === "doctor" || user.role === "admin",
    },
    {
      href: "/appointments",
      title: "سجل المراجعين",
      text: user.role === "doctor" ? "عرض المواعيد المحجوزة والحضور والغياب. الحجز من الاستقبال." : "حجز المواعيد وتسجيل حضور اليوم.",
      icon: CalendarClock,
      show: can(user.role, "appointments"),
    },
    {
      href: "/discharge",
      title: "تقرير المخالصة",
      text: "توثيق التوقف عن العلاج ونقل الحالة إلى الأرشيف.",
      icon: FileOutput,
      show: can(user.role, "discharge"),
    },
    {
      href: "/archive",
      title: "الأرشيف",
      text: "المنتهية، غير المنتهية، المخالصات، والتقارير السنوية.",
      icon: Archive,
      show: can(user.role, "archive"),
    },
  ].filter((section) => section.show);
  const cta =
    user.role === "reception"
      ? { href: "/register", label: "تسجيل بيانات مريض" }
      : can(user.role, "fullRegister")
        ? { href: "/register", label: "تسجيل حالة جديدة" }
        : { href: "/patients", label: "قائمة الحالات" };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-l from-sage-800 via-[#2f6d5c] to-[#1f564f] px-6 py-8 text-white shadow-[0_24px_60px_-32px_rgba(22,56,50,0.8)] sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -left-8 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <p className="text-sm font-semibold text-white/75">{formatLong(today)}</p>
        <p className="mt-4 text-sm font-bold text-white/80">نظام إدارة التقويم</p>
        <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{facilityName}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/85">
          متابعة الخطة العلاجية، مواعيد المراجعين، وتقارير المخالصة في واجهة عربية واحدة.
        </p>
        <Link href={cta.href} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-sage-900">
          {cta.label}
          <ChevronLeft size={16} />
        </Link>
      </section>

      {showPlanAlert ? (
        <Link href="/patients?filter=pending" className="block rounded-[1.75rem] border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-lg font-extrabold text-amber-950">حالات بلا خطة علاج: {counts.pending}</p>
          <p className="mt-1 text-sm leading-6 text-amber-900">هذه الملفات بانتظار إكمال الخطة العلاجية. افتحي القائمة لإتمامها.</p>
        </Link>
      ) : null}

      {notices.length > 0 ? (
        <section className="rounded-[1.75rem] border border-sage-200 bg-white p-5">
          <h2 className="text-lg font-extrabold">متابعة</h2>
          <div className="mt-3 space-y-2">
            {notices.map((item) => (
              <Link key={item.id} href="/followups" className="block rounded-2xl bg-sage-50 px-4 py-3">
                <span className="font-extrabold">{item.patientName}</span>
                <span className="mt-1 block text-sm text-slate-600">{item.message} · {item.fileNumber}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className={cn(
                "group rounded-[1.5rem] border bg-white/90 px-5 py-4 shadow-sm transition hover:-translate-y-0.5",
                card.alert ? "border-amber-300 ring-2 ring-amber-200" : "border-white",
              )}
            >
              <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-sage-50 text-sage-700 transition group-hover:bg-sage-700 group-hover:text-white">
                <Icon size={20} />
                {card.alert ? <span className="absolute -left-1 -top-1 h-3 w-3 rounded-full bg-amber-500 ring-2 ring-white" /> : null}
              </span>
              <span className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-500">
                {card.label}
                {card.alert ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-extrabold text-amber-900">تنبيه</span> : null}
              </span>
              <span className="mt-1 block text-3xl font-extrabold text-sage-800">{card.value}</span>
            </Link>
          );
        })}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-extrabold text-ink">أقسام العيادة</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Link
                key={section.href}
                href={section.href}
                className="group rounded-[1.75rem] border border-white bg-white p-5 shadow-[0_18px_50px_-32px_rgba(36,63,50,0.55)] transition hover:-translate-y-0.5"
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sage-50 text-sage-700 transition group-hover:bg-sage-700 group-hover:text-white">
                  <Icon size={20} />
                </span>
                <span className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-lg font-extrabold text-ink">{section.title}</span>
                  <ChevronLeft size={18} className="text-sage-500" />
                </span>
                <span className="mt-2 block text-sm leading-7 text-slate-600">{section.text}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
