import { countNewIntakes, getNavCounts } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { scopeFor } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "doctor" && user.role !== "admin")) {
    return Response.json({ newCases: 0, followups: 0 }, { headers: { "cache-control": "no-store" } });
  }
  const scope = scopeFor(user);
  const [newCases, counts] = await Promise.all([
    countNewIntakes(scope),
    getNavCounts(scope, user.role === "doctor" ? user.id : undefined),
  ]);
  return Response.json(
    { newCases, followups: counts.followups },
    { headers: { "cache-control": "no-store" } },
  );
}
