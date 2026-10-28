"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field } from "@/components/ui";
import { mutate } from "@/lib/api-client";

export function MarkAttendanceForm({
  patients,
}: {
  patients: Array<{ id: string; name: string; fileNumber: string }>;
}) {
  const router = useRouter();
  const [patientId, setPatientId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!patientId) return;
    setBusy(true);
    setError("");
    try {
      await mutate("/api/attendance", "POST", { patientId });
      setPatientId("");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر تسجيل الحضور");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
      <Field label="تسجيل حضور اليوم">
        <select
          value={patientId}
          onChange={(event) => setPatientId(event.target.value)}
          className="w-full rounded-2xl border border-sage-200 bg-white px-4 py-3 text-sm"
        >
          <option value="">اختاري الحالة التي حضرت</option>
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.name} — {patient.fileNumber}
            </option>
          ))}
        </select>
      </Field>
      <div className="space-y-2">
        <Button type="submit" disabled={!patientId || busy}>
          {busy ? "جارٍ التسجيل..." : "تأكيد حضور اليوم"}
        </Button>
        {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}
      </div>
    </form>
  );
}
