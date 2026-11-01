"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, CalendarPlus, Pencil, Trash2, UserCheck, UserX } from "lucide-react";
import { Button, Field, TextInput } from "@/components/ui";
import { mutate } from "@/lib/api-client";
import { dayLabel, formatClock, formatDate, matchesPatientQuery, todayISO } from "@/lib/format";
import type { Appointment, AppointmentStatus, AttendanceEntry, PatientSummary } from "@/lib/types";

type BoardView = AppointmentStatus | "today";

const tabs: Array<{ id: BoardView; label: string; icon: typeof CalendarCheck }> = [
  { id: "attended", label: "تم الحضور", icon: CalendarCheck },
  { id: "absent", label: "لم يحضر", icon: UserX },
  { id: "upcoming", label: "المواعيد المحجوزة", icon: CalendarPlus },
  { id: "today", label: "حضور اليوم", icon: UserCheck },
];

export function AppointmentsBoard({
  appointments,
  patients,
  initialPatientId = "",
  attendedToday = [],
  attendance = [],
  canBook = true,
}: {
  appointments: Appointment[];
  patients: PatientSummary[];
  initialPatientId?: string;
  attendedToday?: string[];
  attendance?: AttendanceEntry[];
  canBook?: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<BoardView>("upcoming");
  const [patientQuery, setPatientQuery] = useState("");
  const [patientId, setPatientId] = useState(initialPatientId);
  const [appointmentDate, setAppointmentDate] = useState(todayISO());
  const [appointmentTime, setAppointmentTime] = useState("");
  const [reason, setReason] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editReason, setEditReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const present = new Set(attendedToday);

  useEffect(() => {
    if (window.location.hash === "#attendance") setTab("today");
  }, []);

  function selectTab(id: BoardView) {
    setTab(id);
    const next = id === "today" ? `${window.location.pathname}${window.location.search}#attendance` : `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(null, "", next);
  }

  const filteredPatients = patients.filter((patient) =>
    patient.id === patientId || matchesPatientQuery(patient.name, patient.fileNumber, patient.phone, patientQuery),
  );

  const items = useMemo(() => {
    const list = appointments.filter((item) => item.status === tab);
    return list.sort((a, b) => {
      const byDate = a.appointmentDate.localeCompare(b.appointmentDate);
      const byTime = a.appointmentTime.localeCompare(b.appointmentTime);
      return tab === "upcoming" ? byDate || byTime : -(byDate || byTime);
    });
  }, [appointments, tab]);

  const groups = new Map<string, Appointment[]>();
  for (const item of items) {
    const list = groups.get(item.appointmentDate) ?? [];
    list.push(item);
    groups.set(item.appointmentDate, list);
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await mutate("/api/appointments", "POST", { patientId, appointmentDate, appointmentTime, reason });
      setReason("");
      setAppointmentTime("");
      router.refresh();
    } catch (reasonError) {
      setError(reasonError instanceof Error ? reasonError.message : "تعذر حفظ الموعد");
    } finally {
      setBusy(false);
    }
  }

  async function confirmAttendance(id: string) {
    setError("");
    try {
      await mutate(`/api/appointments/${id}`, "PATCH", { status: "attended" });
      setTab("attended");
      router.refresh();
    } catch (reasonError) {
      setError(reasonError instanceof Error ? reasonError.message : "تعذر تأكيد الحضور");
    }
  }

  function beginEdit(item: Appointment) {
    setEditingId(item.id);
    setEditDate(item.appointmentDate);
    setEditTime(item.appointmentTime);
    setEditReason(item.reason);
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await mutate(`/api/appointments/${editingId}`, "PATCH", {
        appointmentDate: editDate,
        appointmentTime: editTime,
        reason: editReason,
      });
      setEditingId("");
      router.refresh();
    } catch (reasonError) {
      setError(reasonError instanceof Error ? reasonError.message : "تعذر تعديل الموعد");
    }
  }

  async function updateStatus(id: string, status: AppointmentStatus) {
    setError("");
    try {
      await mutate(`/api/appointments/${id}`, "PATCH", { status });
      router.refresh();
    } catch (reasonError) {
      setError(reasonError instanceof Error ? reasonError.message : "تعذر تحديث الموعد");
    }
  }

  async function markToday(patient: string) {
    setError("");
    try {
      await mutate("/api/attendance", "POST", { patientId: patient });
      router.refresh();
    } catch (reasonError) {
      setError(reasonError instanceof Error ? reasonError.message : "تعذر تسجيل حضور اليوم");
    }
  }

  async function remove(id: string) {
    setError("");
    try {
      await mutate(`/api/appointments/${id}`, "DELETE");
      router.refresh();
    } catch (reasonError) {
      setError(reasonError instanceof Error ? reasonError.message : "تعذر حذف الموعد");
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-2 rounded-[1.5rem] bg-white/80 p-2 sm:grid-cols-2 xl:grid-cols-4">
        {tabs.map((item) => {
          const Icon = item.icon;
          const count = item.id === "today" ? attendance.length : appointments.filter((appointment) => appointment.status === item.id).length;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectTab(item.id)}
              className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-extrabold transition ${
                tab === item.id ? "bg-sage-700 text-white" : "text-sage-800 hover:bg-sage-50"
              }`}
            >
              <Icon size={16} />
              {item.label}
              <span className={`rounded-full px-2 py-0.5 text-xs ${tab === item.id ? "bg-white/20" : "bg-sage-100"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {canBook ? <form onSubmit={create} className="space-y-4 rounded-[1.75rem] border border-white bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold">تحديد موعد جديد</h2>
          <Field label="بحث عن المريض" hint="بالاسم أو رقم الملف أو رقم الجوال">
            <TextInput value={patientQuery} onChange={(event) => setPatientQuery(event.target.value)} placeholder="ابدأ بكتابة الاسم أو الرقم" />
          </Field>
          <Field label="المريض" required>
            <select
              value={patientId}
              onChange={(event) => setPatientId(event.target.value)}
              className="w-full rounded-2xl border border-sage-200 bg-white px-4 py-3 text-sm"
            >
              <option value="">اختر المريض</option>
              {filteredPatients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name} — {patient.fileNumber}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="التاريخ" required>
              <TextInput type="date" dir="ltr" className="text-right" value={appointmentDate} onChange={(event) => setAppointmentDate(event.target.value)} />
            </Field>
            <Field label="الوقت" required>
              <TextInput type="time" dir="ltr" className="text-right" value={appointmentTime} onChange={(event) => setAppointmentTime(event.target.value)} />
            </Field>
          </div>
          <Field label="ملاحظات الموعد">
            <TextInput value={reason} maxLength={500} placeholder="شد / متابعة / تركيب" onChange={(event) => setReason(event.target.value)} />
          </Field>
          <Button type="submit" disabled={busy}>{busy ? "جارٍ الحفظ..." : "حفظ الموعد"}</Button>
        </form> : null}

      {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}

      {tab === "today" ? (
        attendance.length === 0 ? (
          <p className="rounded-[1.5rem] bg-white px-4 py-12 text-center text-sm text-slate-500">
            لم يُسجَّل حضور اليوم بعد. يظهر هنا تلقائياً عند تسجيل حالة جديدة أو إرسال متابعة.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-[1.75rem] border border-white bg-white shadow-sm">
            <table className="w-full min-w-[40rem] text-right text-sm">
              <thead className="bg-sage-50 text-xs font-bold text-sage-800">
                <tr>
                  <th className="px-4 py-3">الاسم</th>
                  <th className="px-4 py-3">رقم الملف</th>
                  <th className="px-4 py-3">الجوال</th>
                  <th className="px-4 py-3">الطبيبة</th>
                  <th className="px-4 py-3">الوقت</th>
                  <th className="px-4 py-3">النوع</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((item) => (
                  <tr key={item.id} className="border-t border-sage-100">
                    <td className="px-4 py-3 font-extrabold">
                      <Link href={`/patients/${item.patientId}`} className="hover:underline">{item.patientName}</Link>
                    </td>
                    <td className="px-4 py-3" dir="ltr">{item.fileNumber}</td>
                    <td className="px-4 py-3" dir="ltr">{item.phone || "—"}</td>
                    <td className="px-4 py-3">{item.doctor || "—"}</td>
                    <td className="px-4 py-3">{formatClock(item.recordedAt)}</td>
                    <td className="px-4 py-3 font-bold text-sage-800">
                      {item.source === "new" ? "حالة جديدة" : item.source === "followup" ? "متابعة" : "حضور"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : items.length === 0 ? (
        <p className="rounded-[1.5rem] bg-white px-4 py-12 text-center text-sm text-slate-500">لا توجد مواعيد في هذا السجل.</p>
      ) : (
        <div className="space-y-6">
          {Array.from(groups.entries()).map(([date, list]) => (
            <section key={date}>
              <h3 className="mb-3 text-sm font-extrabold text-sage-800">
                <span className="me-2 rounded-full bg-sage-100 px-3 py-1">{dayLabel(date)}</span>
                {formatDate(date)}
              </h3>
              <div className="space-y-3">
                {list.map((item) => (
                  <article key={item.id} className="rounded-[1.5rem] border border-white bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-lg font-extrabold text-sage-800" dir="ltr">{item.appointmentTime}</p>
                        <Link href={`/patients/${item.patientId}`} className="mt-1 block font-extrabold text-ink hover:underline">
                          {item.patientName}
                        </Link>
                        <p className="mt-1 text-sm text-slate-500" dir="ltr">
                          {item.fileNumber} · {item.phone}
                        </p>
                        {item.reason ? <p className="mt-2 text-sm leading-6 text-slate-700">{item.reason}</p> : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {present.has(item.patientId) ? (
                          <span className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">تم تسجيل حضور اليوم</span>
                        ) : (
                          <button type="button" onClick={() => markToday(item.patientId)} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white">
                            حضور اليوم
                          </button>
                        )}
                        {item.status === "upcoming" ? (
                          <button type="button" onClick={() => confirmAttendance(item.id)} className="rounded-xl bg-sage-700 px-3 py-2 text-xs font-bold text-white">
                            تأكيد الحضور
                          </button>
                        ) : null}
                        {item.status === "attended" ? (
                          <span className="rounded-xl bg-sage-50 px-3 py-2 text-xs font-bold text-sage-800">تم تأكيد الحضور</span>
                        ) : null}
                        {item.status !== "upcoming" ? (
                          <button type="button" onClick={() => updateStatus(item.id, "upcoming")} className="rounded-xl bg-sage-50 px-3 py-2 text-xs font-bold text-sage-800">
                            إرجاع للحجز
                          </button>
                        ) : (
                          <button type="button" onClick={() => updateStatus(item.id, "absent")} className="rounded-xl bg-sage-50 px-3 py-2 text-xs font-bold text-sage-800">
                            لم يحضر
                          </button>
                        )}
                        <button type="button" onClick={() => beginEdit(item)} className="rounded-xl bg-sage-50 px-3 py-2 text-xs font-bold text-sage-800">
                          <Pencil size={14} className="inline" /> تعديل
                        </button>
                        <button type="button" onClick={() => remove(item.id)} className="rounded-xl px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50">
                          <Trash2 size={14} className="inline" /> حذف
                        </button>
                      </div>
                    </div>
                    {editingId === item.id ? (
                      <form onSubmit={saveEdit} className="mt-4 grid gap-3 border-t border-sage-100 pt-4 sm:grid-cols-3">
                        <Field label="التاريخ">
                          <TextInput type="date" dir="ltr" className="text-right" value={editDate} onChange={(event) => setEditDate(event.target.value)} required />
                        </Field>
                        <Field label="الوقت">
                          <TextInput type="time" dir="ltr" className="text-right" value={editTime} onChange={(event) => setEditTime(event.target.value)} required />
                        </Field>
                        <Field label="ملاحظات الموعد">
                          <TextInput value={editReason} maxLength={500} onChange={(event) => setEditReason(event.target.value)} />
                        </Field>
                        <div className="flex gap-2 sm:col-span-3">
                          <Button type="submit">حفظ التعديل</Button>
                          <Button type="button" variant="ghost" onClick={() => setEditingId("")}>إلغاء</Button>
                        </div>
                      </form>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
