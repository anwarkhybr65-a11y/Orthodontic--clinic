"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, TextInput } from "@/components/ui";
import { mutate } from "@/lib/api-client";
import type { ClinicUser } from "@/lib/db";
import { ROLE_LABELS, ROLE_OPTIONS, type Role } from "@/lib/permissions";

export async function UsersManager({ users }: { users: ClinicUser[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("reception");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await mutate("/api/users", "POST", { name, username, password, role });
      setName("");
      setUsername("");
      setPassword("");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر إنشاء الحساب");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(user: ClinicUser) {
    setError("");
    try {
      await mutate(`/api/users/${user.id}`, "PATCH", { active: !user.active });
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر تحديث الحساب");
    }
  }

  async function resetPassword(user: ClinicUser) {
    const next = window.prompt(`كلمة مرور جديدة لحساب ${user.name}`);
    if (!next) return;
    setError("");
    try {
      await mutate(`/api/users/${user.id}`, "PATCH", { password: next });
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر تغيير كلمة المرور");
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={create} className="grid gap-4 rounded-[1.75rem] border border-white bg-white p-5 shadow-sm sm:grid-cols-2">
        <Field label="الاسم الظاهر" required>
          <TextInput value={name} maxLength={120} required onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="اسم الدخول" required>
          <TextInput value={username} maxLength={40} required dir="ltr" className="text-right" onChange={(event) => setUsername(event.target.value)} />
        </Field>
        <Field label="كلمة المرور" required>
          <TextInput type="password" value={password} minLength={6} required onChange={(event) => setPassword(event.target.value)} />
        </Field>
        <Field label="نوع الحساب" required>
          <select value={role} onChange={(event) => setRole(event.target.value as Role)} className="w-full rounded-2xl border border-sage-200 bg-white px-4 py-3 text-sm">
            {ROLE_OPTIONS.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </Field>
        {error ? <p className="text-sm font-semibold text-rose-700 sm:col-span-2">{error}</p> : null}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={busy}>{busy ? "جارٍ الحفظ..." : "إنشاء الحساب"}</Button>
        </div>
      </form>
      <div className="overflow-hidden rounded-[1.75rem] border border-white bg-white shadow-sm">
        <table className="w-full text-right text-sm">
          <thead className="bg-sage-50 text-xs font-bold text-sage-800">
            <tr>
              <th className="px-4 py-3">الاسم</th>
              <th className="px-4 py-3">الدخول</th>
              <th className="px-4 py-3">الصلاحية</th>
              <th className="px-4 py-3">الحالة</th>
              <th className="px-4 py-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-sage-100">
                <td className="px-4 py-3 font-extrabold">{user.name}</td>
                <td className="px-4 py-3" dir="ltr">{user.username}</td>
                <td className="px-4 py-3">{ROLE_LABELS[user.role]}</td>
                <td className="px-4 py-3">{user.active ? "نشط" : "موقوف"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => resetPassword(user)} className="rounded-xl bg-sage-50 px-3 py-2 text-xs font-bold text-sage-800">كلمة مرور</button>
                    <button type="button" onClick={() => toggle(user)} className="rounded-xl bg-sage-50 px-3 py-2 text-xs font-bold text-sage-800">{user.active ? "إيقاف" : "تفعيل"}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
