import { revalidateTag, unstable_cache } from "next/cache";
import { after } from "next/server";
import type { PatientScope } from "@/lib/permissions";

export const CLINIC_DATA_TAG = "clinic-data";

const REVALIDATE_SECONDS = 60;
const memory = new Map<string, { expires: number; value: unknown }>();
const pending = new Map<string, Promise<unknown>>();

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

export function remember<Args extends string[], Result>(
  name: string,
  fn: (...args: Args) => Promise<Result>,
): (...args: Args) => Promise<Result> {
  const cached = unstable_cache(fn, [name], clinicCache);
  return async (...args) => {
    const key = `${name}\u0000${args.join("\u0000")}`;
    const hit = memory.get(key);
    if (hit && hit.expires > Date.now()) return hit.value as Result;
    const inflight = pending.get(key);
    if (inflight) return inflight as Promise<Result>;
    const promise = cached(...args)
      .then((value) => {
        memory.set(key, { expires: Date.now() + REVALIDATE_SECONDS * 1000, value });
        pending.delete(key);
        return value;
      })
      .catch((error: unknown) => {
        pending.delete(key);
        throw error;
      });
    pending.set(key, promise);
    return promise;
  };
}

export function invalidateClinicData() {
  memory.clear();
  pending.clear();
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
