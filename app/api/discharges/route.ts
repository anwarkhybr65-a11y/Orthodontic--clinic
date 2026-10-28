import { createDischarge, getPatient } from "@/lib/db";
import { ClinicError } from "@/lib/errors";
import { assertPatient, requireApi } from "@/lib/guard";
import { fail, readJson } from "@/lib/route";
import type { DischargeInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireApi("discharge");
    const body = await readJson<DischargeInput>(request);
    const patient = await getPatient(body.patientId ?? "");
    if (!patient) throw new ClinicError("ملف المريض غير موجود", 404);
    assertPatient(user, patient);
    const report = await createDischarge(body);
    if (!report) throw new ClinicError("تعذر حفظ تقرير المخالصة", 500);
    return Response.json(report);
  } catch (error) {
    return fail(error);
  }
}
