import { setUserActive, setUserPassword } from "@/lib/db";
import { requireApi } from "@/lib/guard";
import { fail, readJson } from "@/lib/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApi("users");
    const { id } = await context.params;
    const body = await readJson<{ active?: boolean; password?: string }>(request);
    if (typeof body.active === "boolean") await setUserActive(id, body.active, actor.id);
    if (typeof body.password === "string" && body.password) await setUserPassword(id, body.password);
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
