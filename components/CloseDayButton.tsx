"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui";
import { mutate } from "@/lib/api-client";

export function CloseDayButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function closeDay() {
    if (!window.confirm("إقفال اليوم يحفظ التقرير في أرشيف الإدارة ولا يمكن تعديله بعد ذلك. هل تريدين المتابعة؟")) return;
    setBusy(true);
    setError("");
    try {
      await mutate("/api/daily/close", "POST", {});
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر إقفال اليوم");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" onClick={closeDay} disabled={busy}>
        <Lock size={16} />
        {busy ? "جارٍ الإقفال..." : "إقفال اليوم"}
      </Button>
      {error ? <p className="text-sm font-bold text-rose-700">{error}</p> : null}
    </div>
  );
}
