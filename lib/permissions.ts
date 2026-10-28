export type Role = "admin" | "doctor" | "reception" | "customer_service" | "nurse";

export type Action =
  | "users"
  | "intake"
  | "fullRegister"
  | "patients"
  | "plan"
  | "images"
  | "visits"
  | "records"
  | "appointments"
  | "discharge"
  | "archive";

const grants: Record<Role, Action[]> = {
  admin: ["users", "intake", "fullRegister", "patients", "plan", "images", "visits", "records", "appointments", "discharge", "archive"],
  doctor: ["patients", "plan", "images", "visits", "records", "appointments", "discharge", "archive"],
  reception: ["intake", "patients", "appointments"],
  nurse: ["patients", "images", "visits", "records", "archive"],
  customer_service: ["patients"],
};

export type SessionUser = {
  id: string;
  username: string;
  name: string;
  role: Role;
};

export type PatientScope = {
  doctorId?: string;
  doctorName?: string;
  createdBy?: string;
};

export function can(role: Role, action: Action) {
  return grants[role].includes(action);
}

export function scopeFor(user: SessionUser): PatientScope | undefined {
  if (user.role === "doctor") return { doctorId: user.id, doctorName: user.name };
  if (user.role === "reception") return { createdBy: user.id };
  return undefined;
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "الإدارة",
  doctor: "الطبيبة",
  reception: "الاستقبال",
  customer_service: "خدمة العملاء",
  nurse: "الممرضة",
};

export const ROLE_OPTIONS: Array<{ id: Role; label: string }> = [
  { id: "reception", label: ROLE_LABELS.reception },
  { id: "customer_service", label: ROLE_LABELS.customer_service },
  { id: "admin", label: ROLE_LABELS.admin },
  { id: "doctor", label: ROLE_LABELS.doctor },
  { id: "nurse", label: ROLE_LABELS.nurse },
];

export function isRole(value: string): value is Role {
  return value in grants;
}
