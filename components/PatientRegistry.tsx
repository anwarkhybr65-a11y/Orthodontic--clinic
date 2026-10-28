"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, Users, X } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { TodayAttendanceButton } from "@/components/TodayAttendanceButton";
import { EmptyState, fieldClass } from "@/components/ui";
import { matchesPatientQuery, formatDate } from "@/lib/format";
import type { PatientSummary, Status } from "@/lib/types";

type Chip = "active" | "all" | "pending" | Status;

const chips: Array<{ id: Chip; label: string }> = [
  { id: "all", label: "كل الحالات" },
  { id: "incomplete", label: "قيد العلاج" },
  { id: "pending", label: "بلا خطة" },
  { id: "completed", label: "منتهية" },
  { id: "discharged", label: "مخالصة" },
];

export function PatientRegistry({
  patients,
  variant = "registry",
  emptyTitle = "لا توجد ملفات",
  emptyText = "لا توجد حالات ضمن هذا العرض.",
  initialChip = "all",
  hideChips = false,
  showAttendance = false,
  attendedToday = [],
}: {
  patients: PatientSummary[];
  variant?: "registry" | "archive" | "discharged";
  emptyTitle?: string;
  emptyText?: string;
  initialChip?: Chip;
  hideChips?: boolean;
  showAttendance?: boolean;
  attendedToday?: string[];
}) {
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<Chip>(hideChips ? "all" : initialChip);
  const searching = query.trim().length > 0;
  const present = new Set(attendedToday);
  const visibleChips = chips;

  const visible = useMemo(() => {
    return patients.filter((patient) => {
      const matchesChip =
        variant !== "registry" ||
        searching ||
        chip === "all" ||
        (chip === "pending" ? !patient.planReady && patient.status !== "discharged" : patient.status === chip);
      return matchesChip && matchesPatientQuery(patient.name, patient.fileNumber, patient.phone, query);
    });
  }, [patients, query, chip, searching, variant]);

  return (
    <div className="space-y-4">
      <div className="rounded-[1.75rem] border border-white bg-white/90 p-4 shadow-[0_18px_50px_-30px_rgba(36,63,50,0.45)]">
        <div className="relative">
          <Search className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sage-600" size={18} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث باسم المريض أو رقم الملف أو رقم الجوال"
            aria-label="بحث في الحالات"
            className={`${fieldClass} pr-11 pl-10`}
          />
          {query ? (
            <button type="button" aria-label="مسح البحث" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setQuery("")}>
              <X size={16} />
            </button>
          ) : null}
        </div>
        {variant === "registry" && !hideChips ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {visibleChips.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setChip(item.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  !searching && chip === item.id ? "bg-sage-700 text-white" : "bg-sage-50 text-sage-800 hover:bg-sage-100"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
        <p className="mt-3 text-xs font-semibold text-slate-500">
          {searching && variant === "registry" ? "يتم البحث في كل الحالات. " : ""}
          {visible.length} ملف
        </p>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Users size={22} />}
          title={searching ? "لا يوجد ملف مطابق" : emptyTitle}
          text={searching ? "جرّب الاسم أو رقم الملف أو الجوال بصيغة أخرى." : emptyText}
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-[1.75rem] border border-white bg-white/90 shadow-[0_18px_50px_-30px_rgba(36,63,50,0.45)] md:block">
            <table className="w-full text-right text-sm">
              <thead className="bg-sage-50 text-xs font-bold text-sage-800">
                <tr>
                  <th className="px-4 py-3">المريض</th>
                  <th className="px-4 py-3">رقم الملف</th>
                  {variant === "discharged" ? (
                    <>
                      <th className="px-4 py-3">تاريخ المخالصة</th>
                      <th className="px-4 py-3">سبب عدم الإكمال</th>
                      <th className="px-4 py-3">التقرير</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3">الجوال</th>
                      <th className="px-4 py-3">الطبيب</th>
                      <th className="px-4 py-3">تاريخ التسجيل</th>
                      {variant === "registry" ? <th className="px-4 py-3">حالة الملف</th> : null}
                      {showAttendance ? <th className="px-4 py-3">حضور اليوم</th> : null}
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {visible.map((patient) => (
                  <tr key={patient.id} className="border-t border-sage-100 transition hover:bg-sage-50/70">
                    <td className="px-4 py-3">
                      <Link href={`/patients/${patient.id}`} className="font-extrabold text-sage-900 hover:underline">
                        {patient.name}
                        {!patient.planReady ? <span className="ms-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">بانتظار الخطة</span> : null}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-semibold" dir="ltr">
                      {patient.fileNumber}
                    </td>
                    {variant === "discharged" ? (
                      <>
                        <td className="px-4 py-3">{formatDate(patient.dischargeDate ?? "")}</td>
                        <td className="max-w-xs px-4 py-3 text-slate-600">
                          <span className="line-clamp-2">{patient.dischargeReason || "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          {patient.dischargeId ? (
                            <Link href={`/discharge/${patient.dischargeId}`} className="font-bold text-sage-700 hover:underline">
                              عرض
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3" dir="ltr">
                          {patient.phone}
                        </td>
                        <td className="px-4 py-3">{patient.doctor}</td>
                        <td className="px-4 py-3">{formatDate(patient.registeredAt)}</td>
                        {variant === "registry" ? (
                          <td className="px-4 py-3">
                            <StatusBadge status={patient.status} />
                          </td>
                        ) : null}
                        {showAttendance ? (
                          <td className="px-4 py-3">
                            <TodayAttendanceButton patientId={patient.id} attended={present.has(patient.id)} />
                          </td>
                        ) : null}
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 md:hidden">
            {visible.map((patient) => (
              <article key={patient.id} className="rounded-[1.5rem] border border-white bg-white p-4 shadow-sm">
                <Link href={`/patients/${patient.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-extrabold text-sage-900">
                      {patient.name}
                      {!patient.planReady ? <span className="ms-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">بانتظار الخطة</span> : null}
                    </p>
                    <p className="mt-1 text-sm text-slate-500" dir="ltr">
                      {patient.fileNumber}
                    </p>
                  </div>
                  {variant === "registry" ? <StatusBadge status={patient.status} /> : null}
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {variant === "discharged"
                    ? patient.dischargeReason || "بدون سبب مسجّل"
                    : `${patient.phone} · ${patient.doctor}`}
                </p>
                </Link>
                {showAttendance ? (
                  <div className="mt-3">
                    <TodayAttendanceButton patientId={patient.id} attended={present.has(patient.id)} />
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
