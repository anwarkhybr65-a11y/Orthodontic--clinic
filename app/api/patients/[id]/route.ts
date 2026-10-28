import { updatePatient } from "@/lib/db";
import { ClinicError } from "@/lib/errors";
import { requirePatient } from "@/lib/guard";
import { fail, readJson } from "@/lib/route";
import type { PatientPatch } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await requirePatient(id, "plan");
    const body = await readJson<PatientPatch>(request);
    const patient = await updatePatient(id, body);
    if (!patient) throw new ClinicError("تعذر تحديث الملف", 500);
    return Response.json(patient);
  } catch (error) {
    return fail(error);
  }
}
