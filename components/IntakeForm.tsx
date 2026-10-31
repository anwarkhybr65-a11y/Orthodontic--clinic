"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { FollowupSender } from "@/components/FollowupSender";
import { Button, Field, TextInput } from "@/components/ui";
import type { ClinicUser } from "@/lib/db";

type Match = { id: string; name: string; fileNumber: string; phone: string; doctor: string; planReady: boolean };

export function IntakeForm({
  doctors,
  fileNumber,
  date,
}: {
  doctors: ClinicUser[];
  fileNumber: string;
  date: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    fileNumber,
    registeredAt: date,
    name: "",
    age: "",
    phone: "",
    doctorId: doctors[0]?.id ?? "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [match, setMatch] = useState<Match | null>(null);

  useEffect(() => {
    const phone = form.phone.trim();
    const file = form.fileNumber.trim();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8 && file.length < 3) {
      setMatch(null);
      return;
    }
    const timer = window.setTimeout(async () => {
      const params = new URLSearchParams();
      if (digits.length >= 8) params.set("phone", phone);
      if (file.length >= 3) params.set("fileNumber", file);
      const response = await fetch(`/api/patients/match?${params.toString()}`);
      const data = (await response.json().catch(() => ({}))) as { match?: Match | null };
      setMatch(response.ok ? data.match ?? null : null);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [form.phone, form.fileNumber]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intake: true, ...form }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر إرسال الملف");
      router.push("/patients?sent=1");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر إرسال الملف");
    } finally {
      setBusy(false);
    }
  }

  if (doctors.length === 0) {
    return (
      <p className="rounded-[1.5rem] bg-white px-5 py-8 text-sm leading-7 text-slate-600">
        لا يوجد حساب طبيبة بعد. اطلبي من الإدارة إنشاء الحساب حتى يصلها الملف.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-[1.75rem] border border-white bg-white p-5 shadow-sm sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="اسم المريض" required>
          <TextInput value={form.name} maxLength={200} required onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </Field>
        <Field label="رقم الملف" required>
          <TextInput dir="ltr" className="text-right" value={form.fileNumber} maxLength={40} required onChange={(event) => setForm({ ...form, fileNumber: event.target.value })} />
        </Field>
        <Field label="التاريخ" required>
          <TextInput type="date" dir="ltr" className="text-right" value={form.registeredAt} required onChange={(event) => setForm({ ...form, registeredAt: event.target.value })} />
        </Field>
        <Field label="العمر" required>
          <TextInput value={form.age} maxLength={40} required onChange={(event) => setForm({ ...form, age: event.target.value })} />
        </Field>
        <Field label="رقم التواصل" required>
          <TextInput dir="ltr" className="text-right" inputMode="tel" placeholder="05xxxxxxxx" value={form.phone} maxLength={30} required onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        </Field>
        <Field label="الطبيب المعالج" required>
          <select
            value={form.doctorId}
            required
            onChange={(event) => setForm({ ...form, doctorId: event.target.value })}
            className="w-full rounded-2xl border border-sage-200 bg-white px-4 py-3 text-sm"
          >
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
            ))}
          </select>
        </Field>
      </div>
      {match ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
          <p className="font-extrabold text-amber-950">هذا المراجع لديه ملف مفتوح مسبقاً</p>
          <p className="mt-1 text-sm leading-6 text-amber-900">
            {match.name} · {match.fileNumber} · {match.doctor || "بدون طبيبة"}
          </p>
          <div className="mt-3">
            <FollowupSender patientId={match.id} />
          </div>
        </div>
      ) : null}
      {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}
      <Button type="submit" disabled={busy}>
        <Send size={16} />
        {busy ? "جارٍ الإرسال..." : "إرسال إلى الطبيبة"}
      </Button>
    </form>
  );
}
