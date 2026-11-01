import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient, type Client, type InValue, type Transaction } from "@libsql/client";
import { invalidateClinicData } from "@/lib/clinic-cache";
import { destroyClinicalImage, uploadClinicalImage } from "@/lib/cloudinary";
import { CLINICAL_IMAGE_SLOTS, emptyAppliances, emptyRecords } from "@/lib/constants";
import { normalizeDischargeDetails } from "@/lib/discharge-details";
import { ClinicError } from "@/lib/errors";
import { todayISO } from "@/lib/format";
import { hashPassword, verifyPassword } from "@/lib/password";
import { isRole, type PatientScope, type Role } from "@/lib/permissions";
import type {
  AppliancesState,
  Appointment,
  AppointmentInput,
  AppointmentStatus,
  AppointmentPatch,
  DischargeInput,
  DischargeReport,
  ImagePhase,
  Jaw,
  ClinicalImage,
  MedicalRecord,
  Patient,
  PatientInput,
  PatientPatch,
  PatientSummary,
  RecordsMap,
  RecordInput,
  ReportDoc,
  Stats,
  Status,
  Visit,
  VisitInput,
  AttendanceEntry,
  AttendanceVisit,
  FollowupNotice,
} from "@/lib/types";

type Row = Record<string, unknown>;
type Executor = Client | Transaction;

const globalForDb = globalThis as unknown as { clinicClient?: Client };
let ready: Promise<void> | null = null;

class Stmt {
  constructor(
    private readonly db: Executor,
    private readonly sql: string,
  ) {}

  async get(...args: InValue[]) {
    const result = await this.db.execute({ sql: this.sql, args });
    return (result.rows[0] as unknown as Row | undefined) ?? undefined;
  }

  async all(...args: InValue[]) {
    const result = await this.db.execute({ sql: this.sql, args });
    return result.rows as unknown as Row[];
  }

  async run(...args: InValue[]) {
    const result = await this.db.execute({ sql: this.sql, args });
    return { changes: Number(result.rowsAffected ?? 0) };
  }
}

class Sql {
  constructor(private readonly client: Executor) {}

  prepare(sql: string) {
    return new Stmt(this.client, sql);
  }

  exec(sql: string) {
    return this.client.executeMultiple(sql);
  }

  batchRead(statements: Array<{ sql: string; args?: InValue[] }>) {
    const stmts = statements.map((item) => ({ sql: item.sql, args: item.args ?? [] }));
    const runner = this.client as Client;
    if (!("transaction" in runner)) return (this.client as Transaction).batch(stmts);
    return runner.batch(stmts, "read");
  }

  async transaction<T>(fn: (db: Sql) => Promise<T>) {
    if (!("transaction" in this.client)) throw new Error("لا يمكن فتح معاملة داخل معاملة");
    const tx = await this.client.transaction("write");
    try {
      const value = await fn(new Sql(tx));
      await tx.commit();
      return value;
    } catch (error) {
      if (!tx.closed) await tx.rollback();
      throw error;
    } finally {
      tx.close();
    }
  }
}

function str(row: Row, key: string) {
  const value = row[key];
  return value == null ? "" : String(value);
}

function flag(value: unknown) {
  return value === true || value === 1 || value === "1" || (typeof value === "bigint" && value === BigInt(1));
}

function countOf(row: Row | undefined) {
  if (!row) return 0;
  const value = row.c;
  return typeof value === "bigint" ? Number(value) : Number(value ?? 0);
}

function one(result: unknown) {
  if (!result || typeof result !== "object") return undefined;
  return result as Row;
}

function many(result: unknown) {
  return Array.isArray(result) ? (result as Row[]) : [];
}

function clip(value: string, max = 4000) {
  return value.trim().slice(0, max);
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeRecords(value: unknown): RecordsMap {
  const parsed = value && typeof value === "object" ? (value as Partial<RecordsMap>) : {};
  return {
    photos: Boolean(parsed.photos),
    panoramic: Boolean(parsed.panoramic),
    lateral: Boolean(parsed.lateral),
    scan: Boolean(parsed.scan),
    intraoral: Boolean(parsed.intraoral),
  };
}

function normalizeAppliances(value: unknown): AppliancesState {
  const parsed = value && typeof value === "object" ? (value as Partial<AppliancesState>) : {};
  return {
    metal: Boolean(parsed.metal),
    ceramic: Boolean(parsed.ceramic),
    aligners: Boolean(parsed.aligners),
    removable: Boolean(parsed.removable),
    other: Boolean(parsed.other),
    otherText: typeof parsed.otherText === "string" ? clip(parsed.otherText, 300) : "",
  };
}

function normalizeGoals(value: unknown): [string, string, string] {
  const list = Array.isArray(value) ? value.map((item) => clip(String(item ?? ""), 300)) : [];
  return [list[0] ?? "", list[1] ?? "", list[2] ?? ""];
}

function normalizeJaw(value: unknown): Jaw {
  if (value === "upper" || value === "lower" || value === "both") return value;
  return "";
}

function normalizeStatus(value: unknown): Status {
  if (
    value === "active" ||
    value === "completed" ||
    value === "incomplete" ||
    value === "discharged" ||
    value === "other"
  ) {
    return value;
  }
  return "active";
}

function normalizeAppointmentStatus(value: unknown): AppointmentStatus {
  if (value === "upcoming" || value === "attended" || value === "absent") return value;
  throw new ClinicError("حالة الموعد غير صالحة");
}

function signature(value: unknown, current = "") {
  if (typeof value !== "string") return current;
  if (value.length > 500_000) throw new ClinicError("التوقيع كبير جداً");
  return value;
}

function digitsOf(value: string) {
  return value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/\D/g, "");
}

function assertIdentity(input: {
  facilityName: string;
  fileNumber: string;
  registeredAt: string;
  name: string;
  age: string;
  phone: string;
  doctor: string;
}) {
  const fields: Array<[string, string]> = [
    [input.facilityName, "اسم المنشأة"],
    [input.fileNumber, "رقم الملف"],
    [input.registeredAt, "التاريخ"],
    [input.name, "اسم المريض"],
    [input.age, "العمر"],
    [input.phone, "رقم التواصل"],
    [input.doctor, "الطبيب المعالج"],
  ];
  for (const [value, label] of fields) {
    if (!value.trim()) throw new ClinicError(`حقل «${label}» مطلوب`);
  }
  if (digitsOf(input.phone).length < 8) {
    throw new ClinicError("رقم التواصل غير مكتمل");
  }
}

function pickText(value: unknown, current: string, max = 4000) {
  return typeof value === "string" ? clip(value, max) : current;
}

async function migrate(db: Sql) {
  try {
    await db.exec("PRAGMA foreign_keys = ON;");
  } catch {
    // Turso enables foreign keys for the database itself.
  }
  await db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      facility_name TEXT NOT NULL,
      file_number TEXT NOT NULL UNIQUE,
      registered_at TEXT NOT NULL,
      name TEXT NOT NULL,
      age TEXT NOT NULL,
      phone TEXT NOT NULL,
      doctor TEXT NOT NULL,
      chief_complaint TEXT NOT NULL DEFAULT '',
      clinical_diagnosis TEXT NOT NULL DEFAULT '',
      records_json TEXT NOT NULL,
      goals_json TEXT NOT NULL,
      appliances_json TEXT NOT NULL,
      jaw TEXT NOT NULL DEFAULT '',
      estimated_duration TEXT NOT NULL DEFAULT '',
      treatment_stages TEXT NOT NULL DEFAULT '',
      risks TEXT NOT NULL DEFAULT '',
      special_instructions TEXT NOT NULL DEFAULT '',
      patient_signature TEXT NOT NULL DEFAULT '',
      doctor_signature TEXT NOT NULL DEFAULT '',
      patient_signed_name TEXT NOT NULL DEFAULT '',
      doctor_signed_name TEXT NOT NULL DEFAULT '',
      consent INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      appointment_id TEXT,
      visit_date TEXT NOT NULL,
      procedures TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      auto INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS medical_records (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      record_date TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      reason TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS discharge_reports (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
      facility_name TEXT NOT NULL,
      file_number TEXT NOT NULL,
      patient_name TEXT NOT NULL,
      age TEXT NOT NULL,
      phone TEXT NOT NULL,
      doctor TEXT NOT NULL,
      report_date TEXT NOT NULL,
      reason TEXT NOT NULL,
      procedures_done TEXT NOT NULL,
      recommendations TEXT NOT NULL,
      disclaimer TEXT NOT NULL,
      acknowledged INTEGER NOT NULL,
      patient_signature TEXT NOT NULL DEFAULT '',
      doctor_signature TEXT NOT NULL DEFAULT '',
      patient_signed_name TEXT NOT NULL DEFAULT '',
      doctor_signed_name TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS clinical_images (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      slot TEXT NOT NULL,
      label TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      mime TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);
    CREATE INDEX IF NOT EXISTS idx_images_patient ON clinical_images(patient_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_visits_patient ON visits(patient_id);
    CREATE INDEX IF NOT EXISTS idx_records_patient ON medical_records(patient_id);
    CREATE TABLE IF NOT EXISTS daily_attendance (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      attend_date TEXT NOT NULL,
      created_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      UNIQUE(patient_id, attend_date)
    );
    CREATE TABLE IF NOT EXISTS followups (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      doctor_id TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      read_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_appt_patient ON appointments(patient_id);
    CREATE INDEX IF NOT EXISTS idx_appt_date ON appointments(appointment_date);
    CREATE INDEX IF NOT EXISTS idx_attendance_date ON daily_attendance(attend_date);
    CREATE INDEX IF NOT EXISTS idx_followups_doctor ON followups(doctor_id, created_at);
  `);
  await db.prepare(
    `INSERT INTO settings(key, value) VALUES('facility_name', 'عيادة تقويم الأسنان')
     ON CONFLICT(key) DO NOTHING`,
  ).run();
  await ensureColumn(db, "patients", "doctor_id", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "patients", "created_by", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "patients", "plan_ready", "INTEGER NOT NULL DEFAULT 1");
  await ensureColumn(db, "patients", "intake_new", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(db, "visits", "visit_time", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "visits", "next_visit", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "daily_attendance", "source", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "clinical_images", "phase", "TEXT NOT NULL DEFAULT 'before'");
  await ensureColumn(db, "clinical_images", "url", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "clinical_images", "public_id", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "discharge_reports", "details_json", "TEXT NOT NULL DEFAULT ''");
  await db.exec("DROP INDEX IF EXISTS idx_images_fixed_slot;");
  await db.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_images_phase_slot
     ON clinical_images(patient_id, phase, slot) WHERE slot != 'extra'`,
  );
  await seedAdmin(db);
}

async function ensureColumn(db: Sql, table: string, column: string, definition: string) {
  const columns = many(await db.prepare(`PRAGMA table_info(${table})`).all());
  if (columns.some((row) => str(row, "name") === column)) return;
  await db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

async function seedAdmin(db: Sql) {
  const count = countOf(one(await db.prepare(`SELECT COUNT(*) AS c FROM users`).get()));
  if (count > 0) return;
  await db.prepare(
    `INSERT INTO users (id, username, password_hash, display_name, role, active, created_at)
     VALUES (?, 'admin', ?, 'مديرة النظام', 'admin', 1, ?)`,
  ).run(randomUUID(), hashPassword("admin123"), new Date().toISOString());
}

async function openDatabase() {
  const url = process.env.DATABASE_URL?.trim();
  const authToken = process.env.DATABASE_AUTH_TOKEN?.trim();
  if (!url || !authToken) {
    throw new Error("حدد DATABASE_URL و DATABASE_AUTH_TOKEN في ملف البيئة");
  }
  const client = createClient({ url, authToken, intMode: "number" });
  globalForDb.clinicClient = client;
  await migrate(new Sql(client));
}

export function getDb(): Promise<Sql> {
  if (!globalForDb.clinicClient) {
    ready = openDatabase().catch((error) => {
      ready = null;
      globalForDb.clinicClient = undefined;
      throw error;
    });
  } else if (!ready) {
    const client = globalForDb.clinicClient;
    ready = migrate(new Sql(client)).catch((error) => {
      ready = null;
      throw error;
    });
  }
  const pending = ready;
  if (!pending) throw new Error("تعذر الاتصال بقاعدة البيانات");
  return pending.then(() => {
    const client = globalForDb.clinicClient;
    if (!client) throw new Error("تعذر الاتصال بقاعدة البيانات");
    return new Sql(client);
  });
}

function mapDischarge(row: Row): DischargeReport {
  const legacy = {
    reason: str(row, "reason"),
    procedures: str(row, "procedures_done"),
    recommendations: str(row, "recommendations"),
  };
  return {
    id: str(row, "id"),
    patientId: str(row, "patient_id"),
    facilityName: str(row, "facility_name"),
    fileNumber: str(row, "file_number"),
    patientName: str(row, "patient_name"),
    age: str(row, "age"),
    phone: str(row, "phone"),
    doctor: str(row, "doctor"),
    reportDate: str(row, "report_date"),
    reason: legacy.reason,
    proceduresDone: legacy.procedures,
    recommendations: legacy.recommendations,
    disclaimer: str(row, "disclaimer"),
    acknowledged: flag(row.acknowledged),
    patientSignature: str(row, "patient_signature"),
    doctorSignature: str(row, "doctor_signature"),
    patientSignedName: str(row, "patient_signed_name"),
    doctorSignedName: str(row, "doctor_signed_name"),
    createdAt: str(row, "created_at"),
    details: normalizeDischargeDetails(parseJson(row.details_json, null), legacy),
  };
}

function mapVisit(row: Row): Visit {
  return {
    id: str(row, "id"),
    patientId: str(row, "patient_id"),
    appointmentId: str(row, "appointment_id") || null,
    visitDate: str(row, "visit_date"),
    visitTime: str(row, "visit_time"),
    nextVisit: str(row, "next_visit"),
    procedures: str(row, "procedures"),
    notes: str(row, "notes"),
    automatic: flag(row.auto),
    createdAt: str(row, "created_at"),
  };
}

function mapRecord(row: Row): MedicalRecord {
  return {
    id: str(row, "id"),
    patientId: str(row, "patient_id"),
    recordDate: str(row, "record_date"),
    title: str(row, "title"),
    notes: str(row, "notes"),
    createdAt: str(row, "created_at"),
  };
}

function mapClinicalImage(row: Row): ClinicalImage {
  return {
    id: str(row, "id"),
    patientId: str(row, "patient_id"),
    slot: str(row, "slot"),
    phase: row.phase === "after" ? "after" : "before",
    label: str(row, "label"),
    mime: str(row, "mime"),
    url: str(row, "url"),
    createdAt: str(row, "created_at"),
  };
}

function mapPatient(row: Row): Patient {
  const goals = normalizeGoals(parseJson(row.goals_json, ["", "", ""]));
  return {
    id: str(row, "id"),
    facilityName: str(row, "facility_name"),
    fileNumber: str(row, "file_number"),
    registeredAt: str(row, "registered_at"),
    name: str(row, "name"),
    age: str(row, "age"),
    phone: str(row, "phone"),
    doctor: str(row, "doctor"),
    doctorId: str(row, "doctor_id"),
    createdBy: str(row, "created_by"),
    planReady: flag(row.plan_ready),
    chiefComplaint: str(row, "chief_complaint"),
    clinicalDiagnosis: str(row, "clinical_diagnosis"),
    records: normalizeRecords(parseJson(row.records_json, emptyRecords())),
    goals,
    appliances: normalizeAppliances(parseJson(row.appliances_json, emptyAppliances())),
    jaw: normalizeJaw(row.jaw),
    estimatedDuration: str(row, "estimated_duration"),
    treatmentStages: str(row, "treatment_stages"),
    risks: str(row, "risks"),
    specialInstructions: str(row, "special_instructions"),
    patientSignature: str(row, "patient_signature"),
    doctorSignature: str(row, "doctor_signature"),
    patientSignedName: str(row, "patient_signed_name"),
    doctorSignedName: str(row, "doctor_signed_name"),
    consent: flag(row.consent),
    status: normalizeStatus(row.status),
    createdAt: str(row, "created_at"),
    updatedAt: str(row, "updated_at"),
    visits: [],
    medicalRecords: [],
    clinicalImages: [],
    discharge: null,
  };
}

function mapSummary(row: Row): PatientSummary {
  return {
    id: str(row, "id"),
    facilityName: str(row, "facility_name"),
    fileNumber: str(row, "file_number"),
    registeredAt: str(row, "registered_at"),
    name: str(row, "name"),
    age: str(row, "age"),
    phone: str(row, "phone"),
    doctor: str(row, "doctor"),
    doctorId: str(row, "doctor_id"),
    createdBy: str(row, "created_by"),
    planReady: flag(row.plan_ready),
    status: normalizeStatus(row.status),
    createdAt: str(row, "created_at"),
    dischargeId: str(row, "discharge_id") || null,
    dischargeReason: str(row, "discharge_reason") || null,
    dischargeDate: str(row, "discharge_date") || null,
  };
}

const appointmentSelect = `
  SELECT
    a.id, a.patient_id, p.name AS patient_name, p.file_number, p.phone,
    a.appointment_date, a.appointment_time, a.reason, a.status
  FROM appointments a
  JOIN patients p ON p.id = a.patient_id
`;

function mapAppointment(row: Row): Appointment {
  return {
    id: str(row, "id"),
    patientId: str(row, "patient_id"),
    patientName: str(row, "patient_name"),
    fileNumber: str(row, "file_number"),
    phone: str(row, "phone"),
    appointmentDate: str(row, "appointment_date"),
    appointmentTime: str(row, "appointment_time"),
    reason: str(row, "reason"),
    status: normalizeAppointmentStatus(row.status),
  };
}

const summarySelect = `
  SELECT
    p.id, p.facility_name, p.file_number, p.registered_at, p.name, p.age, p.phone,
    p.doctor, p.doctor_id, p.created_by, p.plan_ready, p.status, p.created_at,
    d.id AS discharge_id, d.reason AS discharge_reason, d.report_date AS discharge_date
  FROM patients p
  LEFT JOIN discharge_reports d ON d.patient_id = p.id
`;

export async function getFacilityName() {
  const row = one(await (await getDb()).prepare(`SELECT value FROM settings WHERE key = 'facility_name'`).get());
  return row ? str(row, "value") : "عيادة تقويم الأسنان";
}

async function setFacilityName(name: string) {
  await (await getDb())
    .prepare(
      `INSERT INTO settings(key, value) VALUES('facility_name', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .run(clip(name, 200));
}

export async function nextFileNumber() {
  const year = new Date().getFullYear();
  const rows = many(await (await getDb()).prepare(`SELECT file_number FROM patients`).all());
  let max = 0;
  for (const row of rows) {
    const match = str(row, "file_number").match(/(\d+)$/);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `ORTH-${year}-${String(max + 1).padStart(4, "0")}`;
}

function scopeSql(alias: string, scope?: PatientScope) {
  if (scope?.createdBy) return { sql: ` AND ${alias}.created_by = ?`, params: [scope.createdBy] };
  if (scope?.doctorId) {
    return {
      sql: ` AND (${alias}.doctor_id = ? OR (${alias}.doctor_id = '' AND ${alias}.doctor = ?))`,
      params: [scope.doctorId, scope.doctorName ?? ""],
    };
  }
  return { sql: "", params: [] as string[] };
}

function counted(rows: Row[]) {
  return countOf(rows[0]);
}

export async function getNavCounts(scope?: PatientScope, doctorId?: string) {
  const db = await getDb();
  const today = todayISO();
  const patients = scopeSql("patients", scope);
  const appointments = scopeSql("p", scope);
  const attendanceScope = scopeSql("p", scope);
  const [current, pending, upcoming, todayCount, attendance, followups] = await db.batchRead([
    { sql: `SELECT COUNT(*) AS c FROM patients WHERE status = 'active'${patients.sql}`, args: patients.params },
    {
      sql: `SELECT COUNT(*) AS c FROM patients WHERE plan_ready = 0 AND status != 'discharged'${patients.sql}`,
      args: patients.params,
    },
    {
      sql: `SELECT COUNT(*) AS c FROM appointments a JOIN patients p ON p.id = a.patient_id WHERE a.status = 'upcoming'${appointments.sql}`,
      args: appointments.params,
    },
    {
      sql: `SELECT COUNT(*) AS c FROM appointments a JOIN patients p ON p.id = a.patient_id WHERE a.appointment_date = ?${appointments.sql}`,
      args: [today, ...appointments.params],
    },
    {
      sql: `SELECT COUNT(*) AS c FROM daily_attendance d JOIN patients p ON p.id = d.patient_id WHERE d.attend_date = ?${attendanceScope.sql}`,
      args: [today, ...attendanceScope.params],
    },
    doctorId
      ? { sql: `SELECT COUNT(*) AS c FROM followups WHERE doctor_id = ? AND read_at IS NULL`, args: [doctorId] }
      : { sql: `SELECT COUNT(*) AS c FROM followups WHERE read_at IS NULL`, args: [] },
  ]);
  return {
    current: counted(current.rows as Row[]),
    pending: counted(pending.rows as Row[]),
    upcoming: counted(upcoming.rows as Row[]),
    today: counted(todayCount.rows as Row[]),
    attendance: counted(attendance.rows as Row[]),
    followups: counted(followups.rows as Row[]),
  };
}

export async function getStats(scope?: PatientScope){
  const db = await getDb();
  const today = todayISO();
  const patients = scopeSql("patients", scope);
  const appointments = scopeSql("p", scope);
  const statusSql = (status: Status) => ({
    sql: `SELECT COUNT(*) AS c FROM patients WHERE status = ?${patients.sql}`,
    args: [status, ...patients.params],
  });
  const appointmentSql = (status: AppointmentStatus) => ({
    sql: `SELECT COUNT(*) AS c FROM appointments a JOIN patients p ON p.id = a.patient_id WHERE a.status = ?${appointments.sql}`,
    args: [status, ...appointments.params],
  });
  const [active, incomplete, completed, discharged, other, upcoming, attended, absent, todayRows] = await db.batchRead([
    statusSql("active"),
    statusSql("incomplete"),
    statusSql("completed"),
    statusSql("discharged"),
    statusSql("other"),
    appointmentSql("upcoming"),
    appointmentSql("attended"),
    appointmentSql("absent"),
    {
      sql: `${appointmentSelect} WHERE a.appointment_date = ?${appointments.sql} ORDER BY a.appointment_time ASC`,
      args: [today, ...appointments.params],
    },
  ]);
  return {
    active: counted(active.rows as Row[]),
    incomplete: counted(incomplete.rows as Row[]),
    completed: counted(completed.rows as Row[]),
    discharged: counted(discharged.rows as Row[]),
    other: counted(other.rows as Row[]),
    upcoming: counted(upcoming.rows as Row[]),
    attended: counted(attended.rows as Row[]),
    absent: counted(absent.rows as Row[]),
    today: (todayRows.rows as Row[]).map(mapAppointment),
  };
}

export async function countNewIntakes(scope?: PatientScope) {
  const scoped = scopeSql("patients", scope);
  return countOf(one(await (await getDb()).prepare(`SELECT COUNT(*) AS c FROM patients WHERE intake_new = 1${scoped.sql}`).get(...scoped.params)));
}

export async function listNewIntakes(scope?: PatientScope) {
  const scoped = scopeSql("p", scope);
  return many(await (await getDb()).prepare(`${summarySelect} WHERE p.intake_new = 1${scoped.sql} ORDER BY p.created_at DESC`).all(...scoped.params)).map(mapSummary);
}

function changed() {
  invalidateClinicData();
}

export async function clearIntakeAlert(id: string) {
  const result = await (await getDb()).prepare(`UPDATE patients SET intake_new = 0 WHERE id = ? AND intake_new = 1`).run(id);
  if (result.changes) changed();
}

export async function listPatients(status?: Status, scope?: PatientScope) {
  const scoped = scopeSql("p", scope);
  const statusSql = status ? " AND p.status = ?" : "";
  const params = [...(status ? [status] : []), ...scoped.params];
  const sql = `${summarySelect} WHERE 1=1${statusSql}${scoped.sql} ORDER BY p.created_at DESC`;
  return many(await (await getDb()).prepare(sql).all(...params)).map(mapSummary);
}

export async function getPatient(id: string){
  const db = await getDb();
  const [patients, visits, records, images, discharges] = await db.batchRead([
    { sql: `SELECT * FROM patients WHERE id = ?`, args: [id] },
    { sql: `SELECT * FROM visits WHERE patient_id = ? ORDER BY visit_date DESC, visit_time DESC, created_at DESC`, args: [id] },
    { sql: `SELECT * FROM medical_records WHERE patient_id = ? ORDER BY record_date DESC, created_at DESC`, args: [id] },
    { sql: `SELECT * FROM clinical_images WHERE patient_id = ? ORDER BY created_at ASC`, args: [id] },
    { sql: `SELECT * FROM discharge_reports WHERE patient_id = ?`, args: [id] },
  ]);
  const row = (patients.rows as Row[])[0];
  if (!row) return null;
  const patient = mapPatient(row);
  patient.visits = (visits.rows as Row[]).map(mapVisit);
  patient.medicalRecords = (records.rows as Row[]).map(mapRecord);
  patient.clinicalImages = (images.rows as Row[]).map(mapClinicalImage);
  const discharge = (discharges.rows as Row[])[0];
  patient.discharge = discharge ? mapDischarge(discharge) : null;
  return patient;
}

async function ensureUniqueFile(fileNumber: string, ignoreId?: string) {
  const row = one(await (await getDb()).prepare(`SELECT id FROM patients WHERE file_number = ?`).get(fileNumber));
  if (row && str(row, "id") !== ignoreId) throw new ClinicError("رقم الملف مستخدم مسبقاً", 409);
}

async function assignedDoctor(doctorId: string) {
  const doctor = await getUser(doctorId);
  if (!doctor || doctor.role !== "doctor" || !doctor.active) throw new ClinicError("اختاري حساب الطبيبة المعالجة");
  return doctor;
}

export async function createPatient(input: PatientInput, actorId = "") {
  const patient: PatientInput = {
    facilityName: clip(input.facilityName ?? "", 200),
    fileNumber: clip(input.fileNumber ?? "", 40),
    registeredAt: clip(input.registeredAt ?? "", 20),
    name: clip(input.name ?? "", 200),
    age: clip(input.age ?? "", 40),
    phone: clip(input.phone ?? "", 30),
    doctor: clip(input.doctor ?? "", 200),
    doctorId: clip(input.doctorId ?? "", 80),
    chiefComplaint: clip(input.chiefComplaint ?? ""),
    clinicalDiagnosis: clip(input.clinicalDiagnosis ?? ""),
    records: normalizeRecords(input.records),
    goals: normalizeGoals(input.goals),
    appliances: normalizeAppliances(input.appliances),
    jaw: normalizeJaw(input.jaw),
    estimatedDuration: clip(input.estimatedDuration ?? "", 120),
    treatmentStages: clip(input.treatmentStages ?? ""),
    risks: clip(input.risks ?? ""),
    specialInstructions: clip(input.specialInstructions ?? ""),
    patientSignature: signature(input.patientSignature),
    doctorSignature: signature(input.doctorSignature),
    patientSignedName: clip(input.patientSignedName ?? "", 200),
    doctorSignedName: clip(input.doctorSignedName ?? "", 200),
    consent: Boolean(input.consent),
  };
  if (patient.doctorId) patient.doctor = (await assignedDoctor(patient.doctorId)).name;
  assertIdentity(patient);
  if (!patient.consent) throw new ClinicError("يلزم تأكيد موافقة المريض قبل حفظ النموذج");
  if (!patient.patientSignedName || !patient.doctorSignedName) {
    throw new ClinicError("يلزم إدخال اسم الموقّع للمريض والطبيب");
  }
  await ensureUniqueFile(patient.fileNumber);
  const id = randomUUID();
  const now = new Date().toISOString();
  await (await getDb())
    .prepare(
      `INSERT INTO patients (
        id, facility_name, file_number, registered_at, name, age, phone, doctor,
        chief_complaint, clinical_diagnosis, records_json, goals_json, appliances_json,
        jaw, estimated_duration, treatment_stages, risks, special_instructions,
        patient_signature, doctor_signature, patient_signed_name, doctor_signed_name,
        consent, status, created_at, updated_at, doctor_id, created_by, plan_ready
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, 1)`,
    )
    .run(
      id,
      patient.facilityName,
      patient.fileNumber,
      patient.registeredAt,
      patient.name,
      patient.age,
      patient.phone,
      patient.doctor,
      patient.chiefComplaint,
      patient.clinicalDiagnosis,
      JSON.stringify(patient.records),
      JSON.stringify(patient.goals),
      JSON.stringify(patient.appliances),
      patient.jaw,
      patient.estimatedDuration,
      patient.treatmentStages,
      patient.risks,
      patient.specialInstructions,
      patient.patientSignature,
      patient.doctorSignature,
      patient.patientSignedName,
      patient.doctorSignedName,
      1,
      now,
      now,
      patient.doctorId ?? "",
      actorId,
    );
  await setFacilityName(patient.facilityName);
  await markTodayAttendance(id, actorId, "new");
  return await getPatient(id);
}

export async function createIntake(
  input: { fileNumber: string; registeredAt: string; name: string; age: string; phone: string; doctorId: string },
  actorId: string,
) {
  const doctor = await assignedDoctor(input.doctorId);
  const patient = {
    facilityName: await getFacilityName(),
    fileNumber: clip(input.fileNumber ?? "", 40),
    registeredAt: clip(input.registeredAt ?? "", 20),
    name: clip(input.name ?? "", 200),
    age: clip(input.age ?? "", 40),
    phone: clip(input.phone ?? "", 30),
    doctor: doctor.name,
  };
  assertIdentity({ ...patient, doctor: doctor.name });
  await ensureUniqueFile(patient.fileNumber);
  const id = randomUUID();
  const now = new Date().toISOString();
  await (await getDb())
    .prepare(
      `INSERT INTO patients (
        id, facility_name, file_number, registered_at, name, age, phone, doctor,
        chief_complaint, clinical_diagnosis, records_json, goals_json, appliances_json,
        jaw, estimated_duration, treatment_stages, risks, special_instructions,
        patient_signature, doctor_signature, patient_signed_name, doctor_signed_name,
        consent, status, created_at, updated_at, doctor_id, created_by, plan_ready
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', '', ?, ?, ?, '', '', '', '', '', '', '', '', '', 0, 'active', ?, ?, ?, ?, 0)`,
    )
    .run(
      id,
      patient.facilityName,
      patient.fileNumber,
      patient.registeredAt,
      patient.name,
      patient.age,
      patient.phone,
      doctor.name,
      JSON.stringify(emptyRecords()),
      JSON.stringify(["", "", ""]),
      JSON.stringify(emptyAppliances()),
      now,
      now,
      doctor.id,
      actorId,
    );
  await markTodayAttendance(id, actorId, "new");
  return await getPatient(id);
}

export async function updatePatient(id: string, patch: PatientPatch) {
  const current = await getPatient(id);
  if (!current) throw new ClinicError("ملف المريض غير موجود", 404);
  if (patch.status === "discharged" && current.status !== "discharged") {
    throw new ClinicError("نقل الحالة إلى المخالصة يتم بحفظ تقرير المخالصة");
  }
  const next = {
    facilityName: pickText(patch.facilityName, current.facilityName, 200),
    fileNumber: pickText(patch.fileNumber, current.fileNumber, 40),
    registeredAt: pickText(patch.registeredAt, current.registeredAt, 20),
    name: pickText(patch.name, current.name, 200),
    age: pickText(patch.age, current.age, 40),
    phone: pickText(patch.phone, current.phone, 30),
    doctor: pickText(patch.doctor, current.doctor, 200),
    chiefComplaint: pickText(patch.chiefComplaint, current.chiefComplaint),
    clinicalDiagnosis: pickText(patch.clinicalDiagnosis, current.clinicalDiagnosis),
    records: patch.records ? normalizeRecords(patch.records) : current.records,
    goals: patch.goals ? normalizeGoals(patch.goals) : current.goals,
    appliances: patch.appliances ? normalizeAppliances(patch.appliances) : current.appliances,
    jaw: patch.jaw !== undefined ? normalizeJaw(patch.jaw) : current.jaw,
    estimatedDuration: pickText(patch.estimatedDuration, current.estimatedDuration, 120),
    treatmentStages: pickText(patch.treatmentStages, current.treatmentStages),
    risks: pickText(patch.risks, current.risks),
    specialInstructions: pickText(patch.specialInstructions, current.specialInstructions),
    patientSignature: signature(patch.patientSignature, current.patientSignature),
    doctorSignature: signature(patch.doctorSignature, current.doctorSignature),
    patientSignedName: pickText(patch.patientSignedName, current.patientSignedName, 200),
    doctorSignedName: pickText(patch.doctorSignedName, current.doctorSignedName, 200),
    consent: typeof patch.consent === "boolean" ? patch.consent : current.consent,
    status: patch.status ? normalizeStatus(patch.status) : current.status,
    doctorId: current.doctorId,
    planReady: current.planReady,
  };
  if (typeof patch.doctorId === "string" && patch.doctorId.trim()) {
    const doctor = await assignedDoctor(patch.doctorId);
    next.doctorId = doctor.id;
    next.doctor = doctor.name;
  }
  if (patch.completePlan) {
    if (!next.consent || !next.patientSignedName || !next.doctorSignedName) {
      throw new ClinicError("إكمال الخطة يحتاج الموافقة واسمي الموقّعين");
    }
    next.planReady = true;
  }
  if (next.status === "discharged" && current.status !== "discharged") {
    throw new ClinicError("نقل الحالة إلى المخالصة يتم بحفظ تقرير المخالصة");
  }
  assertIdentity(next);
  await ensureUniqueFile(next.fileNumber, id);
  const now = new Date().toISOString();
  await (await getDb())
    .prepare(
      `UPDATE patients SET
        facility_name = ?, file_number = ?, registered_at = ?, name = ?, age = ?, phone = ?, doctor = ?,
        chief_complaint = ?, clinical_diagnosis = ?, records_json = ?, goals_json = ?, appliances_json = ?,
        jaw = ?, estimated_duration = ?, treatment_stages = ?, risks = ?, special_instructions = ?,
        patient_signature = ?, doctor_signature = ?, patient_signed_name = ?, doctor_signed_name = ?,
        consent = ?, status = ?, doctor_id = ?, plan_ready = ?, updated_at = ?
      WHERE id = ?`,
    )
    .run(
      next.facilityName,
      next.fileNumber,
      next.registeredAt,
      next.name,
      next.age,
      next.phone,
      next.doctor,
      next.chiefComplaint,
      next.clinicalDiagnosis,
      JSON.stringify(next.records),
      JSON.stringify(next.goals),
      JSON.stringify(next.appliances),
      next.jaw,
      next.estimatedDuration,
      next.treatmentStages,
      next.risks,
      next.specialInstructions,
      next.patientSignature,
      next.doctorSignature,
      next.patientSignedName,
      next.doctorSignedName,
      next.consent ? 1 : 0,
      next.status,
      next.doctorId,
      next.planReady ? 1 : 0,
      now,
      id,
    );
  if (next.facilityName !== current.facilityName) await setFacilityName(next.facilityName);
  changed();
  return await getPatient(id);
}

async function ensurePatient(id: string) {
  const row = one(await (await getDb()).prepare(`SELECT id FROM patients WHERE id = ?`).get(id));
  if (!row) throw new ClinicError("ملف المريض غير موجود", 404);
}

export async function addVisit(patientId: string, input: VisitInput) {
  await ensurePatient(patientId);
  const visitDate = clip(input.visitDate ?? "", 20);
  const visitTime = clip(input.visitTime ?? "", 10);
  const nextVisit = clip(input.nextVisit ?? "", 20);
  const procedures = clip(input.procedures ?? "");
  const notes = clip(input.notes ?? "");
  if (!visitDate) throw new ClinicError("تاريخ الزيارة مطلوب");
  if (!procedures && !notes) throw new ClinicError("أضف الإجراء أو ملاحظة الزيارة");
  const id = randomUUID();
  const now = new Date().toISOString();
  const db = await getDb();
  await db
    .prepare(
      `INSERT INTO visits (id, patient_id, appointment_id, visit_date, visit_time, next_visit, procedures, notes, auto, created_at)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?, 0, ?)`,
    )
    .run(id, patientId, visitDate, visitTime, nextVisit, procedures, notes, now);
  await clearPatientFollowups(patientId);
  changed();
  return id;
}

export async function updateVisit(id: string, input: VisitInput) {
  const row = one(await (await getDb()).prepare(`SELECT id, auto FROM visits WHERE id = ?`).get(id));
  if (!row) throw new ClinicError("الزيارة غير موجودة", 404);
  if (flag(row.auto)) throw new ClinicError("زيارة تأكيد الحضور تُعدَّل من الموعد");
  const visitDate = clip(input.visitDate ?? "", 20);
  const visitTime = clip(input.visitTime ?? "", 10);
  const nextVisit = clip(input.nextVisit ?? "", 20);
  const procedures = clip(input.procedures ?? "");
  const notes = clip(input.notes ?? "");
  if (!visitDate) throw new ClinicError("تاريخ الزيارة مطلوب");
  if (!procedures && !notes) throw new ClinicError("أضف الإجراء أو ملاحظة الزيارة");
  const patientRow = one(await (await getDb()).prepare(`SELECT patient_id FROM visits WHERE id = ?`).get(id));
  await (await getDb())
    .prepare(`UPDATE visits SET visit_date = ?, visit_time = ?, next_visit = ?, procedures = ?, notes = ? WHERE id = ?`)
    .run(visitDate, visitTime, nextVisit, procedures, notes, id);
  if (patientRow) await clearPatientFollowups(str(patientRow, "patient_id"));
  changed();
}

export async function deleteVisit(id: string) {
  const result = await (await getDb()).prepare(`DELETE FROM visits WHERE id = ?`).run(id);
  if (!result.changes) throw new ClinicError("الزيارة غير موجودة", 404);
  changed();
}

export async function addRecord(patientId: string, input: RecordInput) {
  await ensurePatient(patientId);
  const recordDate = clip(input.recordDate ?? "", 20);
  const title = clip(input.title ?? "", 200);
  const notes = clip(input.notes ?? "");
  if (!recordDate || !title) throw new ClinicError("تاريخ السجل وعنوانه مطلوبان");
  const id = randomUUID();
  await (await getDb())
    .prepare(
      `INSERT INTO medical_records (id, patient_id, record_date, title, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(id, patientId, recordDate, title, notes, new Date().toISOString());
  changed();
  return id;
}

export async function deleteRecord(id: string) {
  const result = await (await getDb()).prepare(`DELETE FROM medical_records WHERE id = ?`).run(id);
  if (!result.changes) throw new ClinicError("السجل غير موجود", 404);
  changed();
}

const IMAGE_TYPES: Record<string, { ext: string; mime: string }> = {
  jpeg: { ext: ".jpg", mime: "image/jpeg" },
  png: { ext: ".png", mime: "image/png" },
  webp: { ext: ".webp", mime: "image/webp" },
  gif: { ext: ".gif", mime: "image/gif" },
};

function imagesDir() {
  const dir = path.join(process.cwd(), "data", "images");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function detectImage(bytes: Buffer) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return IMAGE_TYPES.jpeg;
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return IMAGE_TYPES.png;
  if (bytes.length >= 6 && bytes.subarray(0, 6).toString("ascii") === "GIF87a") return IMAGE_TYPES.gif;
  if (bytes.length >= 6 && bytes.subarray(0, 6).toString("ascii") === "GIF89a") return IMAGE_TYPES.gif;
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return IMAGE_TYPES.webp;
  }
  return null;
}

export async function saveClinicalImage(
  patientId: string,
  input: { slot: string; label: string; bytes: Buffer; phase?: string },
) {
  await ensurePatient(patientId);
  if (input.bytes.length > 15 * 1024 * 1024) throw new ClinicError("حجم الصورة أكبر من 15 ميغابايت");
  const kind = detectImage(input.bytes);
  if (!kind) throw new ClinicError("يُقبل فقط صور JPG أو PNG أو WEBP أو GIF");

  const phase: ImagePhase = input.phase === "after" ? "after" : "before";
  const fixed = CLINICAL_IMAGE_SLOTS.find((item) => item.key === input.slot);
  const slot = fixed ? fixed.key : "extra";
  const label = fixed ? fixed.label : clip(input.label ?? "", 80);
  if (slot === "extra" && !label) throw new ClinicError("اكتب اسماً للصورة الإضافية");

  const id = randomUUID();
  const publicId = `clinic/${patientId}/${id}`;
  const db = await getDb();
  const previous = fixed
    ? one(
        await db
          .prepare(`SELECT id, stored_name, public_id FROM clinical_images WHERE patient_id = ? AND slot = ? AND phase = ?`)
          .get(patientId, slot, phase),
      )
    : undefined;

  const uploaded = await uploadClinicalImage(input.bytes, kind.mime, publicId);
  try {
    await db.transaction(async (tx) => {
      if (previous) {
        await tx.prepare(`DELETE FROM clinical_images WHERE id = ?`).run(str(previous, "id"));
      }
      await tx.prepare(
        `INSERT INTO clinical_images (id, patient_id, slot, label, stored_name, mime, created_at, phase, url, public_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(id, patientId, slot, label, uploaded.publicId, kind.mime, new Date().toISOString(), phase, uploaded.url, uploaded.publicId);
    });
  } catch (error) {
    await destroyClinicalImage(uploaded.publicId).catch(() => undefined);
    throw error;
  }
  if (previous) await removeStoredImage(str(previous, "public_id") || str(previous, "stored_name"));
  changed();
  return id;
}

async function removeStoredImage(storedName: string) {
  if (/^[0-9a-f-]{36}\.(jpg|png|webp|gif)$/i.test(storedName)) {
    fs.rmSync(path.join(imagesDir(), storedName), { force: true });
    return;
  }
  if (storedName) await destroyClinicalImage(storedName).catch(() => undefined);
}

export async function deleteClinicalImage(id: string) {
  const row = one(await (await getDb()).prepare(`SELECT stored_name, public_id FROM clinical_images WHERE id = ?`).get(id));
  if (!row) throw new ClinicError("الصورة غير موجودة", 404);
  await (await getDb()).prepare(`DELETE FROM clinical_images WHERE id = ?`).run(id);
  await removeStoredImage(str(row, "public_id") || str(row, "stored_name"));
  changed();
}

export async function readClinicalImage(id: string) {
  const row = one(await (await getDb()).prepare(`SELECT stored_name, mime, url FROM clinical_images WHERE id = ?`).get(id));
  if (!row) return null;
  const url = str(row, "url");
  if (url.startsWith("https://")) return { mime: str(row, "mime"), url, bytes: null };
  const storedName = str(row, "stored_name");
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp|gif)$/i.test(storedName)) return null;
  const filePath = path.join(imagesDir(), storedName);
  if (!fs.existsSync(filePath)) return null;
  return { mime: str(row, "mime"), url: "", bytes: fs.readFileSync(filePath) };
}

export async function listAppointments(scope?: PatientScope) {
  const scoped = scopeSql("p", scope);
  return many(
    await (await getDb())
      .prepare(`${appointmentSelect} WHERE 1=1${scoped.sql} ORDER BY a.appointment_date DESC, a.appointment_time DESC`)
      .all(...scoped.params),
  ).map(mapAppointment);
}

export async function createAppointment(input: AppointmentInput) {
  const patientId = clip(input.patientId ?? "", 80);
  const appointmentDate = clip(input.appointmentDate ?? "", 20);
  const appointmentTime = clip(input.appointmentTime ?? "", 10);
  const reason = clip(input.reason ?? "", 500);
  if (!patientId) throw new ClinicError("اختر المريض");
  if (!appointmentDate || !appointmentTime) throw new ClinicError("حدد تاريخ الموعد ووقته");
  await ensurePatient(patientId);
  const id = randomUUID();
  await (await getDb())
    .prepare(
      `INSERT INTO appointments (id, patient_id, appointment_date, appointment_time, reason, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'upcoming', ?)`,
    )
    .run(id, patientId, appointmentDate, appointmentTime, reason, new Date().toISOString());
  changed();
  return id;
}

export async function setAppointmentStatus(id: string, status: AppointmentStatus) {
  const db = await getDb();
  const appointment = one(
    await db
      .prepare(`SELECT id, patient_id, appointment_date, appointment_time, reason FROM appointments WHERE id = ?`)
      .get(id),
  );
  if (!appointment) throw new ClinicError("الموعد غير موجود", 404);
  const next = normalizeAppointmentStatus(status);
  await db.prepare(`UPDATE appointments SET status = ? WHERE id = ?`).run(next, id);
  if (next === "attended") {
    const existing = one(await db.prepare(`SELECT id FROM visits WHERE appointment_id = ? AND auto = 1`).get(id));
    if (!existing) {
      await db.prepare(
        `INSERT INTO visits (id, patient_id, appointment_id, visit_date, visit_time, procedures, notes, auto, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      ).run(
        randomUUID(),
        str(appointment, "patient_id"),
        id,
        str(appointment, "appointment_date"),
        str(appointment, "appointment_time"),
        str(appointment, "reason") || "مراجعة عيادة",
        "سُجّلت الزيارة تلقائياً عند تأكيد الحضور",
        new Date().toISOString(),
      );
    }
  } else {
    await db.prepare(`DELETE FROM visits WHERE appointment_id = ? AND auto = 1`).run(id);
  }
  changed();
}

export async function updateAppointment(id: string, input: AppointmentPatch) {
  const db = await getDb();
  const current = one(await db.prepare(`SELECT * FROM appointments WHERE id = ?`).get(id));
  if (!current) throw new ClinicError("الموعد غير موجود", 404);
  const appointmentDate = input.appointmentDate !== undefined ? clip(input.appointmentDate, 20) : str(current, "appointment_date");
  const appointmentTime = input.appointmentTime !== undefined ? clip(input.appointmentTime, 10) : str(current, "appointment_time");
  const reason = input.reason !== undefined ? clip(input.reason, 500) : str(current, "reason");
  if (!appointmentDate || !appointmentTime) throw new ClinicError("حدد تاريخ الموعد ووقته");
  await db.prepare(`UPDATE appointments SET appointment_date = ?, appointment_time = ?, reason = ? WHERE id = ?`).run(
    appointmentDate,
    appointmentTime,
    reason,
    id,
  );
  await db.prepare(
    `UPDATE visits SET visit_date = ?, visit_time = ?, procedures = ? WHERE appointment_id = ? AND auto = 1`,
  ).run(appointmentDate, appointmentTime, reason || "مراجعة عيادة", id);
  if (input.status) await setAppointmentStatus(id, input.status);
  changed();
}

export async function deleteAppointment(id: string) {
  const db = await getDb();
  await db.prepare(`DELETE FROM visits WHERE appointment_id = ? AND auto = 1`).run(id);
  const result = await db.prepare(`DELETE FROM appointments WHERE id = ?`).run(id);
  if (!result.changes) throw new ClinicError("الموعد غير موجود", 404);
  changed();
}

export async function getDischarge(id: string) {
  const row = one(await (await getDb()).prepare(`SELECT * FROM discharge_reports WHERE id = ?`).get(id));
  return row ? mapDischarge(row) : null;
}

export async function createDischarge(input: DischargeInput) {
  const patient = await getPatient(clip(input.patientId ?? "", 80));
  if (!patient) throw new ClinicError("ملف المريض غير موجود", 404);
  if (patient.discharge || patient.status === "discharged") {
    throw new ClinicError("يوجد تقرير مخالصة مسجّل لهذا الملف", 409);
  }
  const details = normalizeDischargeDetails(input.details);
  const reason = clip(details.handoverNotes || details.chiefComplaint || input.reason || "ملخص حالة وتصفية علاج", 4000);
  const proceduresDone = clip(
    [
      details.bondingDate ? `تركيب: ${details.bondingDate}` : "",
      details.stage,
      details.upperWire ? `علوي ${details.upperWire} ${details.upperAlloy}` : "",
      details.lowerWire ? `سفلي ${details.lowerWire} ${details.lowerAlloy}` : "",
    ]
      .filter(Boolean)
      .join(" · ") || input.proceduresDone || "—",
    4000,
  );
  const recommendations = clip(
    [details.upperRetainer, details.lowerRetainer, details.wear, details.remainingDuration].filter(Boolean).join(" · ") ||
      input.recommendations ||
      "—",
    4000,
  );
  const report = {
    facilityName: clip(input.facilityName ?? "", 200),
    fileNumber: clip(input.fileNumber ?? "", 40),
    patientName: clip(input.patientName ?? "", 200),
    age: clip(input.age ?? "", 40),
    phone: clip(input.phone ?? "", 30),
    doctor: clip(input.doctor ?? "", 200),
    reportDate: clip(input.reportDate ?? "", 20),
    reason,
    proceduresDone,
    recommendations,
    disclaimer: clip(input.disclaimer || "أقرّ باستلام أصل الخطة العلاجية والمرفقات التشخيصية.", 4000),
    patientSignature: signature(input.patientSignature),
    doctorSignature: signature(input.doctorSignature),
    patientSignedName: clip(details.recipientName || input.patientSignedName || "", 200),
    doctorSignedName: clip(input.doctorSignedName ?? "", 200),
    details,
  };
  if (!report.patientName || !report.fileNumber || !report.reportDate) {
    throw new ClinicError("اسم المريض ورقم الملف وتاريخ التقرير مطلوبة");
  }
  if (!report.doctorSignedName || !report.patientSignedName) {
    throw new ClinicError("يلزم اسم الطبيب المعالج واسم المريض أو ولي الأمر");
  }
  if (!input.acknowledged && !details.receivedOriginals) {
    throw new ClinicError("يلزم اعتماد إقرار الاستلام");
  }
  const id = randomUUID();
  const now = new Date().toISOString();
  const db = await getDb();
  try {
    await db.transaction(async (tx) => {
    await tx.prepare(
      `INSERT INTO discharge_reports (
        id, patient_id, facility_name, file_number, patient_name, age, phone, doctor,
        report_date, reason, procedures_done, recommendations, disclaimer, acknowledged,
        patient_signature, doctor_signature, patient_signed_name, doctor_signed_name, created_at, details_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      patient.id,
      report.facilityName,
      report.fileNumber,
      report.patientName,
      report.age,
      report.phone,
      report.doctor,
      report.reportDate,
      report.reason,
      report.proceduresDone,
      report.recommendations,
      report.disclaimer,
      report.patientSignature,
      report.doctorSignature,
      report.patientSignedName,
      report.doctorSignedName,
      now,
      JSON.stringify(report.details),
    );
    await tx.prepare(`UPDATE patients SET status = 'discharged', updated_at = ? WHERE id = ?`).run(now, patient.id);
    });
  } catch (error) {
    throw error;
  }
  changed();
  return await getDischarge(id);
}

export async function listReportDocs(scope?: PatientScope){
  const db = await getDb();
  const scoped = scopeSql("patients", scope);
  const patients = many(
    await db.prepare(`SELECT id, name, file_number, registered_at, status FROM patients WHERE 1=1${scoped.sql}`).all(...scoped.params),
  );
  const reports = many(
    await db.prepare(`SELECT id, patient_id, patient_name, file_number, report_date FROM discharge_reports`).all(),
  );
  const statusByPatient = new Map(patients.map((row) => [str(row, "id"), normalizeStatus(row.status)]));
  const docs: ReportDoc[] = patients.map((row) => {
    const id = str(row, "id");
    return {
      id: `plan-${id}`,
      kind: "plan",
      title: "خطة علاجية",
      patientId: id,
      patientName: str(row, "name"),
      fileNumber: str(row, "file_number"),
      patientStatus: normalizeStatus(row.status),
      date: str(row, "registered_at"),
      href: `/patients/${id}`,
    };
  });
  const allowed = new Set(patients.map((row) => str(row, "id")));
  for (const row of reports) {
    const patientId = str(row, "patient_id");
    if (!allowed.has(patientId)) continue;
    docs.push({
      id: str(row, "id"),
      kind: "discharge",
      title: "تقرير مخالصة",
      patientId,
      patientName: str(row, "patient_name"),
      fileNumber: str(row, "file_number"),
      patientStatus: statusByPatient.get(patientId) ?? "discharged",
      date: str(row, "report_date"),
      href: `/discharge/${str(row, "id")}`,
    });
  }
  return docs.sort((a, b) => b.date.localeCompare(a.date) || a.patientName.localeCompare(b.patientName, "ar"));
}

export type ClinicUser = {
  id: string;
  username: string;
  name: string;
  role: Role;
  active: boolean;
};

function mapUser(row: Row): ClinicUser {
  const role = str(row, "role");
  if (!isRole(role)) throw new ClinicError("صلاحية الحساب غير معروفة");
  return {
    id: str(row, "id"),
    username: str(row, "username"),
    name: str(row, "display_name"),
    role,
    active: flag(row.active),
  };
}

export async function listUsers() {
  return many(await (await getDb()).prepare(`SELECT * FROM users ORDER BY created_at ASC`).all()).map(mapUser);
}

export async function listDoctors() {
  return (await listUsers()).filter((user) => user.role === "doctor" && user.active);
}

export async function getUser(id: string) {
  const row = one(await (await getDb()).prepare(`SELECT * FROM users WHERE id = ?`).get(id));
  return row ? mapUser(row) : null;
}

export async function authenticate(username: string, password: string) {
  const row = one(await (await getDb()).prepare(`SELECT * FROM users WHERE lower(username) = lower(?)`).get(clip(username, 40)));
  if (!row || !flag(row.active)) return null;
  if (!verifyPassword(password, str(row, "password_hash"))) return null;
  return mapUser(row);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const now = new Date();
  const expires = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
  await (await getDb())
    .prepare(`INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`)
    .run(token, userId, expires, now.toISOString());
  return token;
}

export async function deleteSession(token: string) {
  await (await getDb()).prepare(`DELETE FROM sessions WHERE id = ?`).run(token);
  changed();
}

export async function getUserBySession(token: string) {
  const row = one(
    await (await getDb())
      .prepare(
        `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.id = ? AND s.expires_at > ? AND u.active = 1`,
      )
      .get(token, new Date().toISOString()),
  );
  return row ? mapUser(row) : null;
}

export async function createUser(input: { username: string; password: string; name: string; role: string }) {
  const username = clip(input.username, 40).toLowerCase();
  const name = clip(input.name, 120);
  const password = input.password ?? "";
  if (!isRole(input.role)) throw new ClinicError("نوع الحساب غير صالح");
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw new ClinicError("اسم الدخول من 3 إلى 40 حرفاً إنجليزياً بدون مسافات");
  if (password.length < 6) throw new ClinicError("كلمة المرور لا تقل عن 6 أحرف");
  if (!name) throw new ClinicError("اسم الحساب مطلوب");
  const existing = one(await (await getDb()).prepare(`SELECT id FROM users WHERE lower(username) = ?`).get(username));
  if (existing) throw new ClinicError("اسم الدخول مستخدم", 409);
  const id = randomUUID();
  await (await getDb())
    .prepare(
      `INSERT INTO users (id, username, password_hash, display_name, role, active, created_at)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
    )
    .run(id, username, hashPassword(password), name, input.role, new Date().toISOString());
  changed();
  return id;
}

export async function setUserActive(id: string, active: boolean, actorId: string) {
  const user = await getUser(id);
  if (!user) throw new ClinicError("الحساب غير موجود", 404);
  if (!active && id === actorId) throw new ClinicError("لا يمكن إيقاف حسابك الحالي");
  if (!active && user.role === "admin") {
    const admins = countOf(one(await (await getDb()).prepare(`SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND active = 1`).get()));
    if (admins <= 1) throw new ClinicError("يجب أن يبقى حساب إدارة نشط");
  }
  await (await getDb()).prepare(`UPDATE users SET active = ? WHERE id = ?`).run(active ? 1 : 0, id);
  if (!active) await (await getDb()).prepare(`DELETE FROM sessions WHERE user_id = ?`).run(id);
  changed();
}

export async function setUserPassword(id: string, password: string) {
  if (!await getUser(id)) throw new ClinicError("الحساب غير موجود", 404);
  if (password.length < 6) throw new ClinicError("كلمة المرور لا تقل عن 6 أحرف");
  await (await getDb()).prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(hashPassword(password), id);
  await (await getDb()).prepare(`DELETE FROM sessions WHERE user_id = ?`).run(id);
  changed();
}

async function patientIdOf(table: string, id: string, missing: string) {
  const row = one(await (await getDb()).prepare(`SELECT patient_id FROM ${table} WHERE id = ?`).get(id));
  if (!row) throw new ClinicError(missing, 404);
  return str(row, "patient_id");
}

export async function getVisitPatientId(id: string) {
  return await patientIdOf("visits", id, "الزيارة غير موجودة");
}

export async function getRecordPatientId(id: string) {
  return await patientIdOf("medical_records", id, "السجل غير موجود");
}

export async function getImagePatientId(id: string) {
  return await patientIdOf("clinical_images", id, "الصورة غير موجودة");
}

export async function getAppointmentPatientId(id: string) {
  return await patientIdOf("appointments", id, "الموعد غير موجود");
}

export async function listAppointmentsOn(date: string, scope?: PatientScope) {
  const scoped = scopeSql("p", scope);
  return many(
    await (await getDb())
      .prepare(`${appointmentSelect} WHERE a.appointment_date = ?${scoped.sql} ORDER BY a.appointment_time ASC`)
      .all(date, ...scoped.params),
  ).map(mapAppointment);
}

export async function attendedTodayIds(date = todayISO()) {
  return many(await (await getDb()).prepare(`SELECT patient_id FROM daily_attendance WHERE attend_date = ?`).all(date)).map((row) =>
    str(row, "patient_id"),
  );
}

export async function markTodayAttendance(patientId: string, actorId: string, source = "") {
  await ensurePatient(patientId);
  const date = todayISO();
  const existing = one(
    await (await getDb()).prepare(`SELECT id FROM daily_attendance WHERE patient_id = ? AND attend_date = ?`).get(patientId, date),
  );
  if (!existing) {
    await (await getDb())
      .prepare(`INSERT INTO daily_attendance (id, patient_id, attend_date, created_by, created_at, source) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(randomUUID(), patientId, date, actorId, new Date().toISOString(), clip(source, 40));
  }
  const upcoming = many(
    await (await getDb())
      .prepare(`SELECT id FROM appointments WHERE patient_id = ? AND appointment_date = ? AND status = 'upcoming'`)
      .all(patientId, date),
  );
  for (const row of upcoming) await setAppointmentStatus(str(row, "id"), "attended");
  changed();
  return true;
}

export async function listAttendanceVisits(scope?: PatientScope){
  const scoped = scopeSql("p", scope);
  const rows = many(
    await (await getDb())
      .prepare(
        `SELECT d.id, d.attend_date, d.created_at, p.id AS patient_id, p.name, p.file_number, p.doctor
         FROM daily_attendance d
         JOIN patients p ON p.id = d.patient_id
         WHERE 1=1${scoped.sql}
         ORDER BY d.attend_date ASC, d.created_at ASC`,
      )
      .all(...scoped.params),
  );
  return rows.map((row) => ({
    id: str(row, "id"),
    patientId: str(row, "patient_id"),
    patientName: str(row, "name"),
    fileNumber: str(row, "file_number"),
    doctor: str(row, "doctor"),
    attendDate: str(row, "attend_date"),
    recordedAt: str(row, "created_at"),
  }));
}

export async function listTodayAttendance(scope?: PatientScope){
  const date = todayISO();
  const scoped = scopeSql("p", scope);
  const rows = many(
    await (await getDb())
      .prepare(
        `SELECT d.id, d.attend_date, d.created_at, d.source, p.id AS patient_id, p.name, p.file_number, p.phone, p.doctor,
                EXISTS(SELECT 1 FROM appointments a WHERE a.patient_id = p.id AND a.appointment_date = d.attend_date) AS booked
         FROM daily_attendance d
         JOIN patients p ON p.id = d.patient_id
         WHERE d.attend_date = ?${scoped.sql}
         ORDER BY d.created_at ASC`,
      )
      .all(date, ...scoped.params),
  );
  return rows.map((row) => ({
    id: str(row, "id"),
    patientId: str(row, "patient_id"),
    patientName: str(row, "name"),
    fileNumber: str(row, "file_number"),
    phone: str(row, "phone"),
    doctor: str(row, "doctor"),
    attendDate: str(row, "attend_date"),
    recordedAt: str(row, "created_at"),
    source: str(row, "source"),
    hadAppointment: flag(row.booked),
  }));
}

async function clearPatientFollowups(patientId: string) {
  await (await getDb())
    .prepare(`UPDATE followups SET read_at = ? WHERE patient_id = ? AND read_at IS NULL`)
    .run(new Date().toISOString(), patientId);
}

async function resolveDoctorId(patient: Patient) {
  if (patient.doctorId) {
    const doctor = await getUser(patient.doctorId);
    if (doctor && doctor.role === "doctor" && doctor.active) return doctor.id;
  }
  const match = (await listDoctors()).find((doctor) => doctor.name.trim() === patient.doctor.trim());
  if (!match) throw new ClinicError("لا يوجد حساب طبيبة مرتبط بهذا الملف لإرسال الإشعار");
  return match.id;
}

export async function createFollowup(patientId: string, actorId: string) {
  const patient = await getPatient(patientId);
  if (!patient) throw new ClinicError("ملف المريض غير موجود", 404);
  const doctorId = await resolveDoctorId(patient);
  const id = randomUUID();
  await (await getDb())
    .prepare(
      `INSERT INTO followups (id, patient_id, doctor_id, message, created_by, created_at, read_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL)`,
    )
    .run(id, patient.id, doctorId, "حالة متابعة بانتظارك", actorId, new Date().toISOString());
  await markTodayAttendance(patient.id, actorId, "followup");
  return id;
}

export async function listFollowups(doctorId?: string){
  const sql = doctorId
    ? `SELECT f.id, f.patient_id, f.message, f.created_at, f.read_at, p.name, p.file_number, p.doctor
       FROM followups f JOIN patients p ON p.id = f.patient_id
       WHERE f.doctor_id = ? ORDER BY f.created_at DESC`
    : `SELECT f.id, f.patient_id, f.message, f.created_at, f.read_at, p.name, p.file_number, p.doctor
       FROM followups f JOIN patients p ON p.id = f.patient_id
       ORDER BY f.created_at DESC`;
  const rows = many(doctorId ? await (await getDb()).prepare(sql).all(doctorId) : await (await getDb()).prepare(sql).all());
  return rows.map((row) => ({
    id: str(row, "id"),
    patientId: str(row, "patient_id"),
    patientName: str(row, "name"),
    fileNumber: str(row, "file_number"),
    doctor: str(row, "doctor"),
    message: str(row, "message"),
    createdAt: str(row, "created_at"),
    read: Boolean(str(row, "read_at")),
  }));
}

export async function markFollowupRead(id: string, doctorId?: string) {
  const sql = doctorId
    ? `UPDATE followups SET read_at = ? WHERE id = ? AND doctor_id = ? AND read_at IS NULL`
    : `UPDATE followups SET read_at = ? WHERE id = ? AND read_at IS NULL`;
  if (doctorId) await (await getDb()).prepare(sql).run(new Date().toISOString(), id, doctorId);
  else await (await getDb()).prepare(sql).run(new Date().toISOString(), id);
  changed();
}

export async function findPatientMatch(phone: string, fileNumber: string) {
  const file = clip(fileNumber, 40);
  const mobile = clip(phone, 30);
  if (!file && digitsOf(mobile).length < 8) return null;
  const row = one(
    await (await getDb())
      .prepare(
        `SELECT id FROM patients
         WHERE (? != '' AND file_number = ?) OR (? != '' AND phone = ?)
         ORDER BY created_at DESC LIMIT 1`,
      )
      .get(file, file, mobile, mobile),
  );
  if (!row) return null;
  return await getPatient(str(row, "id"));
}
