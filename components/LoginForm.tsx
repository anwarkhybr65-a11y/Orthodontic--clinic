"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, TextInput } from "@/components/ui";

export function LoginForm({ facilityName }: { facilityName: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر تسجيل الدخول");
      router.replace("/");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر تسجيل الدخول");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-cream px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-md rounded-[2rem] border border-white bg-white p-6 shadow-[0_24px_60px_-32px_rgba(22,56,50,0.55)] sm:p-8">
        <div className="mb-6 text-center">
          <img src="/logo.png?v=3" alt="شعار نظام التقويم" className="mx-auto h-24 w-auto max-w-full object-contain" />
          <span className="mt-3 block text-lg font-extrabold text-ink">نظام التقويم</span>
          <span className="mt-1 block text-sm text-sage-700">{facilityName}</span>
        </div>
        <h1 className="text-2xl font-extrabold text-ink">تسجيل الدخول</h1>
        <p className="mt-2 text-sm leading-7 text-slate-500">ادخلي بحسابك حسب صلاحيتك: الإدارة، الطبيبة، الاستقبال، خدمة العملاء، أو الممرضة.</p>
        <div className="mt-5 space-y-4">
          <Field label="اسم الدخول" required>
            <TextInput value={username} autoComplete="username" onChange={(event) => setUsername(event.target.value)} required />
          </Field>
          <Field label="كلمة المرور" required>
            <TextInput type="password" value={password} autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} required />
          </Field>
        </div>
        {error ? <p className="mt-4 text-sm font-semibold text-rose-700">{error}</p> : null}
        <Button type="submit" disabled={busy} className="mt-5 w-full">{busy ? "جارٍ الدخول..." : "دخول"}</Button>
      </form>
    </main>
  );
}
