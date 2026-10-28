import Link from "next/link";
import { DischargeSheets } from "@/components/DischargeSheets";
import { PrintButton } from "@/components/PrintButton";
import type { DischargeReport } from "@/lib/types";

export function DischargeDocument({ report }: { report: DischargeReport }) {
  return (
    <div>
      <div className="no-print mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-sage-800">الملخص جاهز للطباعة على صفحتين A4.</p>
        <PrintButton label="طباعة التقرير" />
      </div>
      <DischargeSheets
        data={{
          facilityName: report.facilityName,
          reportDate: report.reportDate,
          patientName: report.patientName,
          fileNumber: report.fileNumber,
          age: report.age,
          phone: report.phone,
          doctor: report.doctor,
          details: report.details,
          doctorSignedName: report.doctorSignedName,
          patientSignedName: report.patientSignedName,
          doctorSignature: report.doctorSignature,
          patientSignature: report.patientSignature,
          proceduresDone: report.proceduresDone,
          recommendations: report.recommendations,
          disclaimer: report.disclaimer,
          reason: report.reason,
        }}
      />
      <p className="no-print mt-4 text-sm">
        <Link href={`/patients/${report.patientId}`} className="font-bold text-sage-700 hover:underline">فتح ملف المريض</Link>
      </p>
    </div>
  );
}
