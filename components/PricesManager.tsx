"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, TextInput } from "@/components/ui";
import { mutate } from "@/lib/api-client";
import { priceCatalog } from "@/lib/procedures";
import type { ProcedurePrice } from "@/lib/types";

export function PricesManager({ prices }: { prices: ProcedurePrice[] }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(priceCatalog().map((item) => [item.code, String(prices.find((price) => price.code === item.code)?.price ?? 0)])),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await mutate(
        "/api/prices",
        "POST",
        priceCatalog().map((item) => ({ code: item.code, price: Number(values[item.code]) || 0 })),
      );
      setMessage("تم حفظ أسعار الإجراءات.");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حفظ الأسعار");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4 rounded-[1.75rem] border border-white bg-white p-5 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        {priceCatalog().map((item) => (
          <Field key={item.code} label={item.label}>
            <TextInput
              dir="ltr"
              className="text-right"
              inputMode="decimal"
              value={values[item.code] ?? "0"}
              onChange={(event) => setValues({ ...values, [item.code]: event.target.value })}
            />
          </Field>
        ))}
      </div>
      {message ? <p className="text-sm font-bold text-sage-800">{message}</p> : null}
      {error ? <p className="text-sm font-bold text-rose-700">{error}</p> : null}
      <Button type="submit" disabled={busy}>{busy ? "جارٍ الحفظ..." : "حفظ الأسعار"}</Button>
    </form>
  );
}
