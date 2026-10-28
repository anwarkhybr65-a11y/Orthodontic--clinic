import { markTodayAttendance, getPatient } from "@/lib/db";
import { ClinicError } from "@/lib/errors";
import { requireApi } from "@/lib/guard";
import { fail, readJson } from "@/lib/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireApi();
    const body = await readJson<{ patientId?: string }>(request);
    const patient = await getPatient(body.patientId ?? "");
    if (!patient) throw new ClinicError("ملف المريض غير موجود", 404);
    await markTodayAttendance(patient.id, user.id);
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
