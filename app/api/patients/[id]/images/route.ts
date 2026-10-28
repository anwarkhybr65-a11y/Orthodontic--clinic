import { saveClinicalImage } from "@/lib/db";
import { ClinicError } from "@/lib/errors";
import { requirePatient } from "@/lib/guard";
import { fail } from "@/lib/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await requirePatient(id, "images");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ClinicError("اختر صورة للرفع");
    const bytes = Buffer.from(await file.arrayBuffer());
    const imageId = await saveClinicalImage(id, {
      slot: String(form.get("slot") ?? ""),
      label: String(form.get("label") ?? ""),
      phase: String(form.get("phase") ?? "before"),
      bytes,
    });
    return Response.json({ id: imageId });
  } catch (error) {
    return fail(error);
  }
}
