import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { UsersManager } from "@/components/UsersManager";
import { listUsers } from "@/lib/cached";
import { requirePage } from "@/lib/guard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "المستخدمون" };

export default async function UsersPage() {
  await requirePage("users");
  return (
    <div>
      <PageHeader
        eyebrow="الصلاحيات"
        title="حسابات الفريق"
        description="أنشئي حساب الاستقبال، خدمة العملاء، الطبيبة، والممرضة. كل حساب يرى ما تخصّه صلاحيته فقط."
      />
      <UsersManager users={await listUsers()} />
    </div>
  );
}
