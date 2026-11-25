import { closeAdminDay } from "@/lib/db";
import { ClinicError } from "@/lib/errors";
import { requireApi } from "@/lib/guard";
import { fail } from "@/lib/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await requireApi("dailyReport");
    if (user.role !== "admin") throw new ClinicError("إقفال اليوم من حساب الإدارة فقط", 403);
    const report = await closeAdminDay(user.id);
    return Response.json({ date: report.date });
  } catch (error) {
    return fail(error);
  }
}
