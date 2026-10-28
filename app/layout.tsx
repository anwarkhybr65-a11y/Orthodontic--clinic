import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Shell } from "@/components/Shell";
import { getCurrentUser } from "@/lib/auth";
import { getFacilityName, getNavCounts } from "@/lib/db";
import { scopeFor } from "@/lib/permissions";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "نظام تقويم الأسنان",
    template: "%s | نظام تقويم الأسنان",
  },
  description: "نظام عربي لإدارة حالات عيادة تقويم الأسنان",
  icons: { icon: [{ url: "/favicon.png?v=3", type: "image/png" }] },
};

export const viewport: Viewport = {
  themeColor: "#1f564f",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") ?? "";
  const body = <body className={`${cairo.className} antialiased`}>{children}</body>;

  if (pathname === "/login") {
    return (
      <html lang="ar" dir="rtl">
        {body}
      </html>
    );
  }

  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/logout");
  const facilityName = await getFacilityName();
  const counts = await getNavCounts(scopeFor(user), user.role === "doctor" ? user.id : undefined);

  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.className} antialiased`}>
        <Shell facilityName={facilityName} counts={counts} user={user}>
          {children}
        </Shell>
      </body>
    </html>
  );
}
