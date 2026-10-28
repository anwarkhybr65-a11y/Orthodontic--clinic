import { deleteAppointment, getAppointmentPatientId, updateAppointment } from "@/lib/db";
import { requirePatient } from "@/lib/guard";
import { fail, readJson } from "@/lib/route";
import type { AppointmentPatch } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await requirePatient(await getAppointmentPatientId(id), "appointments");
    const body = await readJson<AppointmentPatch>(request);
    await updateAppointment(id, body);
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await requirePatient(await getAppointmentPatientId(id), "appointments");
    await deleteAppointment(id);
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
