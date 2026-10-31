import { revalidateTag, unstable_cache } from "next/cache";
import { after } from "next/server";
import type { PatientScope } from "@/lib/permissions";

export const CLINIC_DATA_TAG = "clinic-data";

const REVALIDATE_SECONDS = 60;

export const clinicCache: { revalidate: number; tags: string[] } = {
  revalidate: REVALIDATE_SECONDS,
  tags: [CLINIC_DATA_TAG],
};

const SCOPE_SEP = "\u001f";

export function scopeKey(scope?: PatientScope) {
  if (!scope?.doctorId && !scope?.createdBy) return "";
  return [scope.doctorId ?? "", scope.doctorName ?? "", scope.createdBy ?? ""].join(SCOPE_SEP);
}

export function scopeFromKey(key: string): PatientScope | undefined {
  if (!key) return undefined;
  const [doctorId, doctorName, createdBy] = key.split(SCOPE_SEP);
  if (createdBy) return { createdBy };
  if (doctorId) return { doctorId, doctorName };
  return undefined;
}

export function remember<T extends (...args: string[]) => Promise<unknown>>(name: string, fn: T): T {
  return unstable_cache(fn as (...args: string[]) => Promise<unknown>, [name], clinicCache) as unknown as T;
}

export function invalidateClinicData() {
  try {
    revalidateTag(CLINIC_DATA_TAG);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!message.includes("during render")) return;
    try {
      after(() => {
        try {
          revalidateTag(CLINIC_DATA_TAG);
        } catch {
          // Outside a request the tag cannot be cleared; the time limit still expires the entry.
        }
      });
    } catch {
      // Scripts run without a Next.js request.
    }
  }
}
