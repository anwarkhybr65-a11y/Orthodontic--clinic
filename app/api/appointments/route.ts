import { createAppointment, getPatient } from "@/lib/db";
import { ClinicError } from "@/lib/errors";
import { assertPatient, requireApi } from "@/lib/guard";
import { fail, readJson } from "@/lib/route";
import type { AppointmentInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireApi("appointments");
    if (user.role === "doctor") throw new ClinicError("حجز المواعيد يتم من حساب الاستقبال", 403);
    const body = await readJson<AppointmentInput>(request);
    const patient = await getPatient(body.patientId ?? "");
    if (!patient) throw new ClinicError("ملف المريض غير موجود", 404);
    assertPatient(user, patient);
    const id = await createAppointment(body);
    return Response.json({ id });
  } catch (error) {
    return fail(error);
  }
}
