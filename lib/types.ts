import type { DischargeDetails } from "@/lib/discharge-details";

export type Status = "active" | "completed" | "incomplete" | "discharged" | "other";
export type Jaw = "" | "upper" | "lower" | "both";
export type AppointmentStatus = "upcoming" | "attended" | "absent";
export type ImagePhase = "before" | "after";

export type RecordsMap = {
  photos: boolean;
  panoramic: boolean;
  lateral: boolean;
  scan: boolean;
  intraoral: boolean;
};

export type AppliancesState = {
  metal: boolean;
  ceramic: boolean;
  aligners: boolean;
  removable: boolean;
  other: boolean;
  otherText: string;
};

export type Visit = {
  id: string;
  patientId: string;
  appointmentId: string | null;
  visitDate: string;
  visitTime: string;
  nextVisit: string;
  procedures: string;
  notes: string;
  automatic: boolean;
  createdAt: string;
};

export type MedicalRecord = {
  id: string;
  patientId: string;
  recordDate: string;
  title: string;
  notes: string;
  createdAt: string;
};

export type ClinicalImage = {
  id: string;
  patientId: string;
  slot: string;
  phase: ImagePhase;
  label: string;
  mime: string;
  url: string;
  createdAt: string;
};

export type DischargeReport = {
  id: string;
  patientId: string;
  facilityName: string;
  fileNumber: string;
  patientName: string;
  age: string;
  phone: string;
  doctor: string;
  reportDate: string;
  reason: string;
  proceduresDone: string;
  recommendations: string;
  disclaimer: string;
  acknowledged: boolean;
  patientSignature: string;
  doctorSignature: string;
  patientSignedName: string;
  doctorSignedName: string;
  createdAt: string;
  details: DischargeDetails;
};

export type Patient = {
  id: string;
  facilityName: string;
  fileNumber: string;
  registeredAt: string;
  name: string;
  age: string;
  phone: string;
  doctor: string;
  doctorId: string;
  createdBy: string;
  planReady: boolean;
  chiefComplaint: string;
  clinicalDiagnosis: string;
  records: RecordsMap;
  goals: [string, string, string];
  appliances: AppliancesState;
  jaw: Jaw;
  estimatedDuration: string;
  treatmentStages: string;
  risks: string;
  specialInstructions: string;
  patientSignature: string;
  doctorSignature: string;
  patientSignedName: string;
  doctorSignedName: string;
  consent: boolean;
  status: Status;
  createdAt: string;
  updatedAt: string;
  visits: Visit[];
  medicalRecords: MedicalRecord[];
  clinicalImages: ClinicalImage[];
  discharge: DischargeReport | null;
};

export type PatientSummary = {
  id: string;
  facilityName: string;
  fileNumber: string;
  registeredAt: string;
  name: string;
  age: string;
  phone: string;
  doctor: string;
  doctorId: string;
  createdBy: string;
  planReady: boolean;
  status: Status;
  createdAt: string;
  dischargeId: string | null;
  dischargeReason: string | null;
  dischargeDate: string | null;
};

export type PatientInput = {
  facilityName: string;
  fileNumber: string;
  registeredAt: string;
  name: string;
  age: string;
  phone: string;
  doctor: string;
  doctorId?: string;
  chiefComplaint: string;
  clinicalDiagnosis: string;
  records: RecordsMap;
  goals: [string, string, string];
  appliances: AppliancesState;
  jaw: Jaw;
  estimatedDuration: string;
  treatmentStages: string;
  risks: string;
  specialInstructions: string;
  patientSignature: string;
  doctorSignature: string;
  patientSignedName: string;
  doctorSignedName: string;
  consent: boolean;
};

export type PatientPatch = Partial<PatientInput> & {
  goals?: string[];
  status?: Status;
  doctorId?: string;
  completePlan?: boolean;
};

export type Appointment = {
  id: string;
  patientId: string;
  patientName: string;
  fileNumber: string;
  phone: string;
  appointmentDate: string;
  appointmentTime: string;
  reason: string;
  status: AppointmentStatus;
};

export type AppointmentInput = {
  patientId: string;
  appointmentDate: string;
  appointmentTime: string;
  reason: string;
};

export type AppointmentPatch = {
  appointmentDate?: string;
  appointmentTime?: string;
  reason?: string;
  status?: AppointmentStatus;
};

export type VisitInput = {
  visitDate: string;
  visitTime?: string;
  nextVisit?: string;
  procedures: string;
  notes: string;
};

export type RecordInput = {
  recordDate: string;
  title: string;
  notes: string;
};

export type DischargeInput = {
  patientId: string;
  facilityName: string;
  fileNumber: string;
  patientName: string;
  age: string;
  phone: string;
  doctor: string;
  reportDate: string;
  reason: string;
  proceduresDone: string;
  recommendations: string;
  disclaimer: string;
  acknowledged: boolean;
  patientSignature: string;
  doctorSignature: string;
  patientSignedName: string;
  doctorSignedName: string;
  details?: DischargeDetails;
};

export type ReportDoc = {
  id: string;
  kind: "plan" | "discharge";
  title: string;
  patientId: string;
  patientName: string;
  fileNumber: string;
  patientStatus: Status;
  date: string;
  href: string;
};

export type FollowupNotice = {
  id: string;
  patientId: string;
  patientName: string;
  fileNumber: string;
  doctor: string;
  message: string;
  createdAt: string;
  read: boolean;
};

export type AttendanceVisit = {
  id: string;
  patientId: string;
  patientName: string;
  fileNumber: string;
  doctor: string;
  attendDate: string;
  recordedAt: string;
};

export type AttendanceEntry = {
  id: string;
  patientId: string;
  patientName: string;
  fileNumber: string;
  phone: string;
  doctor: string;
  attendDate: string;
  recordedAt: string;
  source: string;
  hadAppointment: boolean;
};

export type Stats = {
  active: number;
  incomplete: number;
  completed: number;
  discharged: number;
  other: number;
  upcoming: number;
  attended: number;
  absent: number;
  today: Appointment[];
};
