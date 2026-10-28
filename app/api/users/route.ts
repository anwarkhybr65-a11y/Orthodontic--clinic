import { createUser, listUsers } from "@/lib/db";
import { fail, readJson } from "@/lib/route";
import { requireApi } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireApi("users");
    return Response.json(await listUsers());
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireApi("users");
    const body = await readJson<{ username?: string; password?: string; name?: string; role?: string }>(request);
    const id = await createUser({
      username: body.username ?? "",
      password: body.password ?? "",
      name: body.name ?? "",
      role: body.role ?? "",
    });
    return Response.json({ id });
  } catch (error) {
    return fail(error);
  }
}
