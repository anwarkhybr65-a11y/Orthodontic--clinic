import { addVisit } from "@/lib/db";
import { requirePatient } from "@/lib/guard";
import { fail, readJson } from "@/lib/route";
import type { VisitInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await requirePatient(id, "visits");
    const body = await readJson<VisitInput>(request);
    const visitId = await addVisit(id, body);
    return Response.json({ id: visitId });
  } catch (error) {
    return fail(error);
  }
}
