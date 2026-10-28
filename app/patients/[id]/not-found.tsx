import Link from "next/link";

export default function PatientNotFound() {
  return (
    <div className="rounded-[1.75rem] bg-white px-6 py-16 text-center">
      <h1 className="text-2xl font-extrabold">الملف غير موجود</h1>
      <p className="mt-2 text-sm text-slate-600">تحقق من رقم الملف أو ارجع إلى قائمة الحالات.</p>
      <Link href="/patients" className="mt-5 inline-flex rounded-2xl bg-sage-700 px-4 py-3 text-sm font-bold text-white">
        قائمة الحالات
      </Link>
    </div>
  );
}
