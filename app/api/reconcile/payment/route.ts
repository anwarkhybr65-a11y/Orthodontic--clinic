import { setVisitPayment } from "@/lib/db";
import { ClinicError } from "@/lib/errors";
import { requireApi } from "@/lib/guard";
import { fail, readJson } from "@/lib/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await requireApi("reconcile");
    const body = await readJson<{ visitId?: string; paidAmount?: number }>(request);
    if (!body.visitId) throw new ClinicError("الزيارة غير موجودة", 404);
    await setVisitPayment(body.visitId, Number(body.paidAmount) || 0);
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
