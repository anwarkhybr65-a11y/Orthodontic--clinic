"use client";

import { APPLIANCE_OPTIONS, GOAL_LABELS, JAW_OPTIONS, RECORD_OPTIONS } from "@/lib/constants";
import type { AppliancesState, Jaw, RecordsMap } from "@/lib/types";
import { Choice, Field, TextArea, TextInput } from "@/components/ui";

export type ClinicalValue = {
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
};

export function ExamFields({
  value,
  onChange,
}: {
  value: ClinicalValue;
  onChange: (patch: Partial<ClinicalValue>) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="الشكوى الرئيسية">
        <TextArea
          value={value.chiefComplaint}
          maxLength={4000}
          placeholder="مثال: ازدحام في الأسنان الأمامية وبروز في الفك العلوي"
          onChange={(event) => onChange({ chiefComplaint: event.target.value })}
        />
      </Field>
      <Field label="التشخيص السريري">
        <TextArea
          value={value.clinicalDiagnosis}
          maxLength={4000}
          placeholder="مثال: سوء إطباق من الصنف الثاني مع ازدحام متوسط"
          onChange={(event) => onChange({ clinicalDiagnosis: event.target.value })}
        />
      </Field>
      <fieldset>
        <legend className="mb-3 text-sm font-bold text-sage-900">السجلات المتوفرة</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {RECORD_OPTIONS.map((option) => (
            <Choice
              key={option.key}
              label={option.label}
              checked={value.records[option.key]}
              onChange={() =>
                onChange({ records: { ...value.records, [option.key]: !value.records[option.key] } })
              }
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}

export function GoalsFields({
  value,
  onChange,
}: {
  value: ClinicalValue;
  onChange: (patch: Partial<ClinicalValue>) => void;
}) {
  return (
    <div className="grid gap-4">
      {GOAL_LABELS.map((label, index) => (
        <Field key={label} label={label}>
          <TextInput
            value={value.goals[index]}
            maxLength={300}
            placeholder={index === 0 ? "مثال: رصف الأسنان وتصحيح الازدحام" : ""}
            onChange={(event) => {
              const goals = [...value.goals] as [string, string, string];
              goals[index] = event.target.value;
              onChange({ goals });
            }}
          />
        </Field>
      ))}
    </div>
  );
}

export function PlanFields({
  value,
  onChange,
}: {
  value: ClinicalValue;
  onChange: (patch: Partial<ClinicalValue>) => void;
}) {
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-3 text-sm font-bold text-sage-900">نوع الخطة</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {APPLIANCE_OPTIONS.map((option) => (
            <Choice
              key={option.key}
              label={option.label}
              checked={value.appliances[option.key]}
              onChange={() =>
                onChange({
                  appliances: { ...value.appliances, [option.key]: !value.appliances[option.key] },
                })
              }
            />
          ))}
        </div>
      </fieldset>
      {value.appliances.other ? (
        <Field label="وصف الخطة الأخرى">
          <TextInput
            value={value.appliances.otherText}
            maxLength={300}
            onChange={(event) => onChange({ appliances: { ...value.appliances, otherText: event.target.value } })}
          />
        </Field>
      ) : null}
      <fieldset>
        <legend className="mb-3 text-sm font-bold text-sage-900">اختيار الفك</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {JAW_OPTIONS.map((option) => (
            <Choice
              key={option.value}
              type="radio"
              name="jaw"
              label={option.label}
              checked={value.jaw === option.value}
              onChange={() => onChange({ jaw: option.value })}
            />
          ))}
        </div>
      </fieldset>
      <Field label="مدة العلاج التقديرية">
        <TextInput
          value={value.estimatedDuration}
          maxLength={120}
          placeholder="مثال: 18 شهراً"
          onChange={(event) => onChange({ estimatedDuration: event.target.value })}
        />
      </Field>
      <Field label="مراحل العلاج والإجراءات الرئيسية">
        <TextArea
          value={value.treatmentStages}
          maxLength={4000}
          placeholder="مثال: الرصف والتسوية، ثم إغلاق المسافات وتصحيح العلاقة، ثم التثبيت"
          onChange={(event) => onChange({ treatmentStages: event.target.value })}
        />
      </Field>
    </div>
  );
}

export function RiskFields({
  value,
  onChange,
}: {
  value: ClinicalValue;
  onChange: (patch: Partial<ClinicalValue>) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Field label="المخاطر المحتملة">
        <TextArea
          value={value.risks}
          maxLength={4000}
          placeholder="مثال: ألم بعد الشد، تهيّج اللثة، احتمال التسوس وبقع الميناء، انتكاس عند ضعف الالتزام بالمثبت"
          onChange={(event) => onChange({ risks: event.target.value })}
        />
      </Field>
      <Field label="التعليمات الخاصة / الحاجة لخلع">
        <TextArea
          value={value.specialInstructions}
          maxLength={4000}
          placeholder="مثال: خلع الضاحك الأول العلوي على الجهتين قبل التركيب، مع عناية فموية يومية"
          onChange={(event) => onChange({ specialInstructions: event.target.value })}
        />
      </Field>
    </div>
  );
}
