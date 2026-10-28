import { deleteClinicalImage, getImagePatientId, readClinicalImage } from "@/lib/db";
import { requirePatient } from "@/lib/guard";
import { fail } from "@/lib/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await requirePatient(await getImagePatientId(id));
    const image = await readClinicalImage(id);
    if (!image) return new Response("الصورة غير موجودة", { status: 404 });
    if (image.url) return Response.redirect(image.url, 302);
    if (!image.bytes) return new Response("الصورة غير موجودة", { status: 404 });
    return new Response(new Uint8Array(image.bytes), {
      headers: {
        "Content-Type": image.mime,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await requirePatient(await getImagePatientId(id), "images");
    await deleteClinicalImage(id);
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
