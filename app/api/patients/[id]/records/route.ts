import { addRecord } from "@/lib/db";
import { requirePatient } from "@/lib/guard";
import { fail, readJson } from "@/lib/route";
import type { RecordInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await requirePatient(id, "records");
    const body = await readJson<RecordInput>(request);
    const recordId = await addRecord(id, body);
    return Response.json({ id: recordId });
  } catch (error) {
    return fail(error);
  }
}
