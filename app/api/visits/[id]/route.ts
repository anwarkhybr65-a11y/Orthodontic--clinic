import { deleteVisit, getVisitPatientId, updateVisit } from "@/lib/db";
import { requirePatient } from "@/lib/guard";
import { fail, readJson } from "@/lib/route";
import type { VisitInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await requirePatient(await getVisitPatientId(id), "visits");
    const body = await readJson<VisitInput>(request);
    await updateVisit(id, body);
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await requirePatient(await getVisitPatientId(id), "visits");
    await deleteVisit(id);
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
