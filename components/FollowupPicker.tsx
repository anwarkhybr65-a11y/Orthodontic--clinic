"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui";
import { mutate } from "@/lib/api-client";
import { matchesPatientQuery } from "@/lib/format";

export function FollowupPicker({
  patients,
}: {
  patients: Array<{ id: string; name: string; fileNumber: string; phone: string; doctor: string }>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [patientId, setPatientId] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const filtered = useMemo(
    () => patients.filter((patient) => matchesPatientQuery(patient.name, patient.fileNumber, patient.phone, query)).slice(0, 12),
    [patients, query],
  );
  const selected = patients.find((patient) => patient.id === patientId);

  async function send() {
    if (!patientId) return;
    setBusy(true);
    setError("");
    try {
      await mutate("/api/followups", "POST", { patientId });
      setDone(selected?.name ?? "");
      setPatientId("");
      setQuery("");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر إرسال التنبيه");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[1.75rem] border border-white bg-white p-5 shadow-sm">
      <label className="block text-sm font-bold text-sage-900" htmlFor="followup-patient">
        اسم المريض
      </label>
      <input
        id="followup-patient"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setDone("");
        }}
        placeholder="ابحث بالاسم أو رقم الملف أو الجوال"
        className="mt-2 w-full rounded-2xl border border-sage-200 bg-white px-4 py-3 text-sm"
        autoComplete="off"
      />
      <div className="mt-3 grid gap-2">
        {filtered.length === 0 ? (
          <p className="rounded-2xl bg-sage-50 px-4 py-3 text-sm text-slate-500">لا يوجد مريض بهذا الاسم.</p>
        ) : (
          filtered.map((patient) => (
            <button
              key={patient.id}
              type="button"
              onClick={() => {
                setPatientId(patient.id);
                setDone("");
              }}
              className={`rounded-2xl border px-4 py-3 text-right text-sm ${patient.id === patientId ? "border-sage-500 bg-sage-50" : "border-sage-100 bg-white"}`}
            >
              <span className="block font-extrabold text-ink">{patient.name}</span>
              <span className="mt-1 block text-slate-500">{patient.fileNumber} · {patient.doctor || "بدون طبيبة"}</span>
            </button>
          ))
        )}
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">{selected ? `سيصل تنبيه للطبيبة عن ${selected.name}` : "اختاري اسم المريض ثم أرسلي التنبيه."}</p>
        <Button type="button" onClick={send} disabled={!patientId || busy}>
          <Bell size={16} />
          {busy ? "جارٍ الإرسال..." : "إرسال التنبيه للطبيبة"}
        </Button>
      </div>
      {done ? <p className="mt-3 rounded-2xl bg-sage-50 px-4 py-3 text-sm font-bold text-sage-800">وصل تنبيه المتابعة باسم {done}.</p> : null}
      {error ? <p className="mt-3 text-sm font-bold text-rose-700">{error}</p> : null}
    </section>
  );
}
