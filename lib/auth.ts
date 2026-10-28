import { cookies } from "next/headers";
import { getUserBySession } from "@/lib/db";
import type { SessionUser } from "@/lib/permissions";

export const SESSION_COOKIE = "clinic_session";

export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const user = await getUserBySession(token);
  if (!user) return null;
  return { id: user.id, username: user.username, name: user.name, role: user.role };
}
