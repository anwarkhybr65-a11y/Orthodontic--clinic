import { remindUnloggedVisits } from "@/lib/db";
import { requireApi } from "@/lib/guard";
import { fail } from "@/lib/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await requireApi("reconcile");
    const sent = await remindUnloggedVisits(user.id);
    return Response.json({ sent });
  } catch (error) {
    return fail(error);
  }
}
