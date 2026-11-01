"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Archive,
  Bell,
  CalendarClock,
  ClipboardPlus,
  FileOutput,
  LogOut,
  Menu,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { can, ROLE_LABELS, type Role } from "@/lib/permissions";

export function Shell({
  facilityName,
  counts,
  user,
  children,
}: {
  facilityName: string;
  counts: { current: number; pending: number; upcoming: number; today: number; attendance: number; followups: number };
  user: { name: string; role: Role };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const items = [
    {
      href: "/register",
      label: user.role === "reception" ? "تسجيل بيانات المريض" : "تسجيل الحالة",
      icon: ClipboardPlus,
      show: user.role === "reception" ? can(user.role, "intake") : can(user.role, "fullRegister"),
      match: (path: string) => path.startsWith("/register"),
      badge: 0,
    },
    {
      href: "/patients",
      label: "قائمة الحالات",
      icon: Users,
      show: can(user.role, "patients"),
      match: (path: string) => path.startsWith("/patients"),
      badge: user.role === "doctor" || user.role === "admin" ? counts.pending : counts.current,
    },
    {
      href: "/followups",
      label: "إشعارات المتابعة",
      icon: Bell,
      show: user.role === "doctor" || user.role === "admin",
      match: (path: string) => path.startsWith("/followups"),
      badge: counts.followups,
    },
    {
      href: "/appointments",
      label: "سجل المراجعين",
      icon: CalendarClock,
      show: can(user.role, "appointments"),
      match: (path: string) => path.startsWith("/appointments"),
      badge: counts.upcoming,
    },
    {
      href: "/discharge",
      label: "تقرير المخالصة",
      icon: FileOutput,
      show: can(user.role, "discharge"),
      match: (path: string) => path.startsWith("/discharge"),
      badge: 0,
    },
    {
      href: "/archive",
      label: "الأرشيف",
      icon: Archive,
      show: can(user.role, "archive"),
      match: (path: string) => path.startsWith("/archive"),
      badge: 0,
    },
    {
      href: "/users",
      label: "المستخدمون",
      icon: UserCog,
      show: can(user.role, "users"),
      match: (path: string) => path.startsWith("/users"),
      badge: 0,
    },
  ].filter((item) => item.show);
  const navHrefs = items.map((item) => item.href).join("\n");

  useEffect(() => {
    const targets = new Set(navHrefs.split("\n").filter(Boolean));
    targets.add("/");
    if (can(user.role, "patients")) targets.add("/patients?filter=incomplete");
    if (user.role === "doctor" || user.role === "admin") {
      targets.add("/patients?filter=new");
      targets.add("/patients?filter=pending");
    }
    const timer = window.setTimeout(() => {
      for (const href of targets) {
        if (href === pathname) continue;
        router.prefetch(href);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [navHrefs, pathname, router, user.role]);

  return (
    <div className="flex min-h-screen">
      {open ? (
        <button
          type="button"
          aria-label="إغلاق القائمة"
          className="no-print fixed inset-0 z-30 bg-ink/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <aside
        className={cn(
          "no-print fixed inset-y-0 right-0 z-40 flex h-screen w-[17.5rem] shrink-0 flex-col bg-gradient-to-b from-[#1f564f] to-[#163832] text-white shadow-2xl transition-transform duration-300 lg:sticky lg:top-0 lg:z-auto lg:translate-x-0",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-start justify-between gap-3 px-5 pb-4 pt-6">
          <Link href="/" prefetch className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <img src="/logo.png?v=3" alt="" className="h-7 w-auto shrink-0 object-contain" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold">نظام التقويم</span>
                <span className="mt-0.5 block truncate text-xs text-white/70">{facilityName}</span>
              </span>
            </span>
          </Link>
          <button type="button" className="rounded-xl p-2 text-white/80 lg:hidden" onClick={() => setOpen(false)} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>
        <nav aria-label="الأقسام الرئيسية" className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {items.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition",
                  active ? "bg-white text-sage-900 shadow-sm" : "text-white/85 hover:bg-white/10",
                )}
              >
                <Icon size={18} />
                <span className="flex-1">{item.label}</span>
                {item.badge > 0 ? (
                  <span className={cn("rounded-full px-2 py-0.5 text-xs", active ? "bg-sage-100 text-sage-800" : "bg-white/15")}>
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="px-5 pb-5">
          <p className="truncate text-sm font-extrabold">{user.name}</p>
          <p className="mt-1 text-xs text-white/70">{ROLE_LABELS[user.role]}</p>
          <form action="/api/auth/logout" method="post" className="mt-3">
            <button type="submit" className="inline-flex items-center gap-2 text-xs font-bold text-white/80 hover:text-white">
              <LogOut size={14} />
              تسجيل الخروج
            </button>
          </form>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-20 flex items-center justify-between border-b border-sage-100/80 bg-cream/90 px-4 py-3 backdrop-blur lg:hidden">
          <button type="button" onClick={() => setOpen(true)} aria-label="فتح القائمة" className="rounded-xl p-2 text-sage-800">
            <Menu size={20} />
          </button>
          <span className="font-extrabold text-sage-900">نظام التقويم</span>
          <span className="w-9" />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
