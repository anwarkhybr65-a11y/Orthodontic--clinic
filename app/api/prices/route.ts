import { saveProcedurePrices } from "@/lib/db";
import { ClinicError } from "@/lib/errors";
import { requireApi } from "@/lib/guard";
import { priceCatalog } from "@/lib/procedures";
import { fail, readJson } from "@/lib/route";
import type { ProcedurePrice } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireApi("prices");
    if (user.role !== "admin") throw new ClinicError("أسعار الإجراءات تُدار من حساب الإدارة فقط", 403);
    const body = await readJson<ProcedurePrice[]>(request);
    if (!Array.isArray(body)) throw new ClinicError("بيانات الأسعار غير مكتملة");
    const prices = priceCatalog().map((item) => {
      const incoming = body.find((price) => price?.code === item.code);
      return { code: item.code, price: Number(incoming?.price) || 0 };
    });
    await saveProcedurePrices(prices);
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
