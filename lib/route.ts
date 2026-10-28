import { ClinicError } from "@/lib/errors";

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ClinicError("صيغة البيانات غير صالحة", 400);
  }
}

export function fail(error: unknown) {
  if (error instanceof ClinicError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ error: "حدث خطأ غير متوقع أثناء معالجة الطلب" }, { status: 500 });
}
