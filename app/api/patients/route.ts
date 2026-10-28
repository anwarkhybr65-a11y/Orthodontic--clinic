import { createIntake, createPatient } from "@/lib/db";
import { ClinicError } from "@/lib/errors";
import { requireApi } from "@/lib/guard";
import { can } from "@/lib/permissions";
import { fail, readJson } from "@/lib/route";
import type { PatientInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = PatientInput & {
  intake?: boolean;
  doctorId?: string;
};

export async function POST(request: Request) {
  try {
    const user = await requireApi();
    const body = await readJson<Body>(request);
    if (body.intake) {
      if (!can(user.role, "intake")) throw new ClinicError("ليست لديك صلاحية لهذا الإجراء", 403);
      const patient = await createIntake(
        {
          fileNumber: body.fileNumber ?? "",
          registeredAt: body.registeredAt ?? "",
          name: body.name ?? "",
          age: body.age ?? "",
          phone: body.phone ?? "",
          doctorId: body.doctorId ?? "",
        },
        user.id,
      );
      if (!patient) throw new ClinicError("تعذر إنشاء ملف المريض", 500);
      return Response.json(patient);
    }
    if (!can(user.role, "fullRegister")) throw new ClinicError("ليست لديك صلاحية لهذا الإجراء", 403);
    const patient = await createPatient(body, user.id);
    if (!patient) throw new ClinicError("تعذر إنشاء ملف المريض", 500);
    return Response.json(patient);
  } catch (error) {
    return fail(error);
  }
}
