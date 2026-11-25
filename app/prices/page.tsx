import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PricesManager } from "@/components/PricesManager";
import { listProcedurePrices } from "@/lib/cached";
import { requirePage } from "@/lib/guard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "الأسعار" };

export default async function PricesPage() {
  const user = await requirePage("prices");
  if (user.role !== "admin") notFound();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="الإدارة"
        title="أسعار الإجراءات"
        description="هذه الصفحة لحساب الإدارة فقط. السعر يُحسب تلقائياً كمستحق عند حفظ الزيارة."
      />
      <PricesManager prices={await listProcedurePrices()} />
    </div>
  );
}
