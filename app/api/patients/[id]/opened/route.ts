import { clearIntakeAlert } from "@/lib/db";
import { requirePatient } from "@/lib/guard";
import { fail } from "@/lib/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { user } = await requirePatient(id, "patients");
    if (user.role === "doctor" || user.role === "admin") await clearIntakeAlert(id);
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
