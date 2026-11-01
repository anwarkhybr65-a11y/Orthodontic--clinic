import { remember, scopeFromKey, scopeKey } from "@/lib/clinic-cache";
import {
  attendedTodayIds as loadAttendedTodayIds,
  countNewIntakes as loadCountNewIntakes,
  findPatientMatch as loadFindPatientMatch,
  getDischarge as loadDischarge,
  getFacilityName as loadFacilityName,
  getNavCounts as loadNavCounts,
  getPatient as loadPatient,
  getStats as loadStats,
  getUserBySession as loadUserBySession,
  listAppointments as loadAppointments,
  listAppointmentsOn as loadAppointmentsOn,
  listAttendanceVisits as loadAttendanceVisits,
  listDoctors as loadDoctors,
  listFollowups as loadFollowups,
  listNewIntakes as loadNewIntakes,
  listPatients as loadPatients,
  listReportDocs as loadReportDocs,
  listTodayAttendance as loadTodayAttendance,
  listUsers as loadUsers,
} from "@/lib/db";
import { todayISO } from "@/lib/format";
import type { PatientScope } from "@/lib/permissions";
import type { Status } from "@/lib/types";

const facilityName = remember("facility-name", async () => loadFacilityName());

const navCounts = remember("nav-counts", async (day: string, key: string, doctorId: string) => {
  void day;
  return loadNavCounts(scopeFromKey(key), doctorId || undefined);
});

const stats = remember("stats", async (day: string, key: string) => {
  void day;
  return loadStats(scopeFromKey(key));
});

const newIntakeCount = remember("new-intake-count", async (key: string) => loadCountNewIntakes(scopeFromKey(key)));
const newIntakes = remember("new-intakes", async (key: string) => loadNewIntakes(scopeFromKey(key)));
const patients = remember("patients", async (status: string, key: string) =>
  loadPatients(status ? (status as Status) : undefined, scopeFromKey(key)),
);
const patient = remember("patient", async (id: string) => loadPatient(id));
const appointments = remember("appointments", async (key: string) => loadAppointments(scopeFromKey(key)));
const appointmentsOn = remember("appointments-on", async (date: string, key: string) =>
  loadAppointmentsOn(date, scopeFromKey(key)),
);
const attendedIds = remember("attended-ids", async (date: string) => loadAttendedTodayIds(date));
const attendanceVisits = remember("attendance-visits", async (key: string) => loadAttendanceVisits(scopeFromKey(key)));
const todayAttendance = remember("today-attendance", async (day: string, key: string) => {
  void day;
  return loadTodayAttendance(scopeFromKey(key));
});
const followups = remember("followups", async (doctorId: string) => loadFollowups(doctorId || undefined));
const reportDocs = remember("report-docs", async (key: string) => loadReportDocs(scopeFromKey(key)));
const discharge = remember("discharge", async (id: string) => loadDischarge(id));
const users = remember("users", async () => loadUsers());
const doctors = remember("doctors", async () => loadDoctors());
const sessionUser = remember("session-user", async (token: string) => loadUserBySession(token));
const patientMatch = remember("patient-match", async (phone: string, fileNumber: string) =>
  loadFindPatientMatch(phone, fileNumber),
);

export function getFacilityName() {
  return facilityName();
}

export function getNavCounts(scope?: PatientScope, doctorId?: string) {
  return navCounts(todayISO(), scopeKey(scope), doctorId ?? "");
}

export function getStats(scope?: PatientScope) {
  return stats(todayISO(), scopeKey(scope));
}

export function countNewIntakes(scope?: PatientScope) {
  return newIntakeCount(scopeKey(scope));
}

export function listNewIntakes(scope?: PatientScope) {
  return newIntakes(scopeKey(scope));
}

export function listPatients(status?: Status, scope?: PatientScope) {
  return patients(status ?? "", scopeKey(scope));
}

export function getPatient(id: string) {
  return patient(id);
}

export function listAppointments(scope?: PatientScope) {
  return appointments(scopeKey(scope));
}

export function listAppointmentsOn(date: string, scope?: PatientScope) {
  return appointmentsOn(date, scopeKey(scope));
}

export function attendedTodayIds(date = todayISO()) {
  return attendedIds(date);
}

export function listAttendanceVisits(scope?: PatientScope) {
  return attendanceVisits(scopeKey(scope));
}

export function listTodayAttendance(scope?: PatientScope) {
  return todayAttendance(todayISO(), scopeKey(scope));
}

export function listFollowups(doctorId?: string) {
  return followups(doctorId ?? "");
}

export function listReportDocs(scope?: PatientScope) {
  return reportDocs(scopeKey(scope));
}

export function getDischarge(id: string) {
  return discharge(id);
}

export function listUsers() {
  return users();
}

export function listDoctors() {
  return doctors();
}

export function getUserBySession(token: string) {
  return sessionUser(token);
}

export function findPatientMatch(phone: string, fileNumber: string) {
  return patientMatch(phone, fileNumber);
}
