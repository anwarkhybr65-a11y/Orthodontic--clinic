import { findPatientMatch } from "@/lib/cached";
import { requireApi } from "@/lib/guard";
import { ClinicError } from "@/lib/errors";
import { fail } from "@/lib/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireApi();
    if (user.role !== "reception" && user.role !== "admin") {
      throw new ClinicError("ليست لديك صلاحية لهذا الإجراء", 403);
    }
    const url = new URL(request.url);
    const patient = await findPatientMatch(url.searchParams.get("phone") ?? "", url.searchParams.get("fileNumber") ?? "");
    if (!patient) return Response.json({ match: null });
    return Response.json({
      match: {
        id: patient.id,
        name: patient.name,
        fileNumber: patient.fileNumber,
        phone: patient.phone,
        doctor: patient.doctor,
        planReady: patient.planReady,
      },
    });
  } catch (error) {
    return fail(error);
  }
}
