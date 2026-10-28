import { deleteRecord, getRecordPatientId } from "@/lib/db";
import { requirePatient } from "@/lib/guard";
import { fail } from "@/lib/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await requirePatient(await getRecordPatientId(id), "records");
    await deleteRecord(id);
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
