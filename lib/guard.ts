import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPatient } from "@/lib/db";
import { ClinicError } from "@/lib/errors";
import { can, type Action, type SessionUser } from "@/lib/permissions";

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/logout");
  return user;
}

export async function requirePage(action: Action) {
  const user = await requireUser();
  if (!can(user.role, action)) redirect("/");
  return user;
}

export async function requireApi(action?: Action) {
  const user = await getCurrentUser();
  if (!user) throw new ClinicError("يلزم تسجيل الدخول", 401);
  if (action && !can(user.role, action)) throw new ClinicError("ليست لديك صلاحية لهذا الإجراء", 403);
  return user;
}

export function assertPatient(user: SessionUser, patient: { doctorId: string; doctor: string; createdBy: string }) {
  if (user.role === "admin" || user.role === "nurse" || user.role === "customer_service") return;
  if (user.role === "doctor" && (patient.doctorId === user.id || (!patient.doctorId && patient.doctor === user.name))) return;
  if (user.role === "reception" && patient.createdBy === user.id) return;
  throw new ClinicError("هذا الملف غير متاح لحسابك", 403);
}

export async function requirePatient(patientId: string, action?: Action) {
  const user = await requireApi(action);
  const patient = await getPatient(patientId);
  if (!patient) throw new ClinicError("ملف المريض غير موجود", 404);
  assertPatient(user, patient);
  return { user, patient };
}
