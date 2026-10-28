"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-[1.75rem] bg-white px-6 py-16 text-center">
      <h1 className="text-2xl font-extrabold">تعذر تحميل الصفحة</h1>
      <button type="button" onClick={reset} className="mt-5 rounded-2xl bg-sage-700 px-4 py-3 text-sm font-bold text-white">
        إعادة المحاولة
      </button>
    </div>
  );
}
