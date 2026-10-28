import { createHash } from "node:crypto";
import { ClinicError } from "@/lib/errors";

type CloudinaryConfig = { cloudName: string; apiKey: string; apiSecret: string };

function clean(value: string | undefined) {
  return (value ?? "").trim().replace(/^["']|["']$/g, "");
}

function config(): CloudinaryConfig {
  const apiKey = clean(process.env.CLOUDINARY_API_KEY);
  const apiSecret = clean(process.env.CLOUDINARY_API_SECRET);
  let cloudName = clean(process.env.CLOUDINARY_CLOUD_NAME);
  if (!cloudName) {
    const url = clean(process.env.CLOUDINARY_URL);
    const at = url.lastIndexOf("@");
    cloudName = at >= 0 ? url.slice(at + 1).replace(/\/+$/, "") : "";
  }
  if (!cloudName || !apiKey || !apiSecret || cloudName.includes("<") || apiKey.includes("<")) {
    throw new ClinicError("بيانات Cloudinary غير مكتملة في ملف البيئة");
  }
  return { cloudName, apiKey, apiSecret };
}

function sign(params: Record<string, string>, apiSecret: string) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(payload + apiSecret).digest("hex");
}

export async function uploadClinicalImage(bytes: Buffer, mime: string, publicId: string) {
  const { cloudName, apiKey, apiSecret } = config();
  const timestamp = String(Math.round(Date.now() / 1000));
  const signed = { public_id: publicId, timestamp };
  const form = new FormData();
  form.set("file", new Blob([new Uint8Array(bytes)], { type: mime }));
  form.set("public_id", publicId);
  form.set("timestamp", timestamp);
  form.set("api_key", apiKey);
  form.set("signature", sign(signed, apiSecret));
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: form });
  const data = (await response.json().catch(() => ({}))) as { secure_url?: string; public_id?: string; error?: { message?: string } };
  if (!response.ok || !data.secure_url || !data.public_id) {
    throw new ClinicError(data.error?.message || "تعذر رفع الصورة إلى Cloudinary");
  }
  return { url: data.secure_url, publicId: data.public_id };
}

export async function destroyClinicalImage(publicId: string) {
  if (!publicId || publicId.startsWith("http")) return;
  const { cloudName, apiKey, apiSecret } = config();
  const timestamp = String(Math.round(Date.now() / 1000));
  const signed = { public_id: publicId, timestamp };
  const body = new URLSearchParams({
    public_id: publicId,
    timestamp,
    api_key: apiKey,
    signature: sign(signed, apiSecret),
  });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, { method: "POST", body });
  if (!response.ok) throw new ClinicError("تعذر حذف الصورة من Cloudinary");
}
