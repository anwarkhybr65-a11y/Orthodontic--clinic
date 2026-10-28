import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth";
import { authenticate, createSession } from "@/lib/db";
import { ClinicError } from "@/lib/errors";
import { fail, readJson } from "@/lib/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await readJson<{ username?: string; password?: string }>(request);
    const user = await authenticate(body.username ?? "", body.password ?? "");
    if (!user) throw new ClinicError("اسم الدخول أو كلمة المرور غير صحيحة", 401);
    const token = await createSession(user.id);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
    return Response.json({ id: user.id, name: user.name, role: user.role });
  } catch (error) {
    return fail(error);
  }
}
