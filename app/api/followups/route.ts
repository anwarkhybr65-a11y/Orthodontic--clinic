import { createFollowup, getPatient, markFollowupRead } from "@/lib/db";
import { ClinicError } from "@/lib/errors";
import { requireApi } from "@/lib/guard";
import { fail, readJson } from "@/lib/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireApi();
    if (user.role !== "reception" && user.role !== "admin") {
      throw new ClinicError("ليست لديك صلاحية لهذا الإجراء", 403);
    }
    const body = await readJson<{ patientId?: string }>(request);
    const patient = await getPatient(body.patientId ?? "");
    if (!patient) throw new ClinicError("ملف المريض غير موجود", 404);
    const id = await createFollowup(patient.id, user.id);
    return Response.json({ id });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireApi();
    if (user.role !== "doctor" && user.role !== "admin") {
      throw new ClinicError("ليست لديك صلاحية لهذا الإجراء", 403);
    }
    const body = await readJson<{ id?: string }>(request);
    if (!body.id) throw new ClinicError("الإشعار غير موجود", 404);
    await markFollowupRead(body.id, user.role === "doctor" ? user.id : undefined);
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
