import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { deleteSession } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function clear(request: Request) {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}

export function GET(request: Request) {
  return clear(request);
}

export function POST(request: Request) {
  return clear(request);
}
