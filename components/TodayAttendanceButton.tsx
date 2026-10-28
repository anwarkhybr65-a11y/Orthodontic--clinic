"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "@/lib/api-client";

export function TodayAttendanceButton({ patientId, attended }: { patientId: string; attended: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (attended) {
    return <span className="inline-flex rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">تم تسجيل حضور اليوم</span>;
  }

  async function mark() {
    setBusy(true);
    setError("");
    try {
      await mutate("/api/attendance", "POST", { patientId });
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر تسجيل الحضور");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" onClick={mark} disabled={busy} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">
        {busy ? "جارٍ التسجيل..." : "حضور اليوم"}
      </button>
      {error ? <span className="text-[11px] font-semibold text-rose-700">{error}</span> : null}
    </span>
  );
}
