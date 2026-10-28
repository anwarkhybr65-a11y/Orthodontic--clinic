import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-[1.75rem] bg-white px-6 py-16 text-center">
      <h1 className="text-2xl font-extrabold">الصفحة غير موجودة</h1>
      <Link href="/" className="mt-5 inline-flex rounded-2xl bg-sage-700 px-4 py-3 text-sm font-bold text-white">
        العودة للرئيسية
      </Link>
    </div>
  );
}
