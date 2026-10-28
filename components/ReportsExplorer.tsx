"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FileOutput, FileText, Folder, Search } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Button, Field, TextInput } from "@/components/ui";
import { includesText, formatDate } from "@/lib/format";
import type { ReportDoc } from "@/lib/types";

export function ReportsExplorer({ docs }: { docs: ReportDoc[] }) {
  const [year, setYear] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [name, setName] = useState("");
  const [fileNumber, setFileNumber] = useState("");

  const narrowed = useMemo(() => {
    return docs.filter((doc) => {
      if (from && doc.date < from) return false;
      if (to && doc.date > to) return false;
      if (!includesText(doc.patientName, name)) return false;
      if (!includesText(doc.fileNumber, fileNumber)) return false;
      return true;
    });
  }, [docs, from, to, name, fileNumber]);

  const years = useMemo(() => {
    const map = new Map<string, number>();
    for (const doc of narrowed) {
      const key = doc.date.slice(0, 4) || "بدون تاريخ";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [narrowed]);

  const activeSearch = Boolean(year || from || to || name.trim() || fileNumber.trim());
  const results = year ? narrowed.filter((doc) => doc.date.startsWith(year)) : activeSearch ? narrowed : [];

  function reset() {
    setYear(null);
    setFrom("");
    setTo("");
    setName("");
    setFileNumber("");
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border border-white bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 font-extrabold text-sage-900">
          <Search size={18} />
          بحث متقدم
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="من تاريخ">
            <TextInput type="date" dir="ltr" className="text-right" value={from} onChange={(event) => setFrom(event.target.value)} />
          </Field>
          <Field label="إلى تاريخ">
            <TextInput type="date" dir="ltr" className="text-right" value={to} onChange={(event) => setTo(event.target.value)} />
          </Field>
          <Field label="اسم المريض">
            <TextInput value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="رقم الملف">
            <TextInput dir="ltr" className="text-right" value={fileNumber} onChange={(event) => setFileNumber(event.target.value)} />
          </Field>
        </div>
        <div className="mt-4">
          <Button type="button" variant="secondary" onClick={reset}>مسح البحث</Button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-extrabold">ملفات السنوات</h2>
        {years.length === 0 ? (
          <p className="rounded-[1.5rem] bg-white px-4 py-10 text-center text-sm text-slate-500">لا توجد تقارير محفوظة بعد.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {years.map(([value, count]) => (
              <button
                key={value}
                type="button"
                onClick={() => setYear((current) => (current === value ? null : value))}
                className={`rounded-[1.5rem] border p-4 text-right transition ${
                  year === value ? "border-sage-600 bg-sage-700 text-white" : "border-white bg-white hover:-translate-y-0.5"
                }`}
              >
                <Folder size={22} />
                <p className="mt-3 text-xl font-extrabold">{value}</p>
                <p className={`mt-1 text-sm ${year === value ? "text-white/80" : "text-slate-500"}`}>{count} ملف</p>
              </button>
            ))}
          </div>
        )}
      </section>

      {activeSearch ? (
        <section className="space-y-3">
          <h2 className="text-lg font-extrabold">نتائج البحث</h2>
          {results.length === 0 ? (
            <p className="rounded-[1.5rem] bg-white px-4 py-10 text-center text-sm text-slate-500">لا توجد تقارير مطابقة لهذه المدة أو البيانات.</p>
          ) : (
            results.map((doc) => (
              <Link key={doc.id} href={doc.href} className="flex items-center gap-4 rounded-[1.5rem] border border-white bg-white p-4 shadow-sm transition hover:-translate-y-0.5">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sage-50 text-sage-700">
                  {doc.kind === "discharge" ? <FileOutput size={18} /> : <FileText size={18} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold text-ink">{doc.title}</span>
                  <span className="mt-1 block text-sm text-slate-500">
                    {doc.patientName} · <span dir="ltr">{doc.fileNumber}</span> · {formatDate(doc.date)}
                  </span>
                </span>
                <StatusBadge status={doc.patientStatus} />
              </Link>
            ))
          )}
        </section>
      ) : (
        <p className="text-sm text-slate-500">اختر سنة أو حدّد مدة البحث ليظهر محتوى المجلد.</p>
      )}
    </div>
  );
}
