"use client";

import { useRef, useState } from "react";
import { ImagePlus, Plus, Replace, Trash2, X } from "lucide-react";
import { Button, Field, TextInput } from "@/components/ui";
import { mutate } from "@/lib/api-client";
import { CLINICAL_IMAGE_SLOTS } from "@/lib/constants";
import type { ClinicalImage, ImagePhase, Patient } from "@/lib/types";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

function imageSrc(image: ClinicalImage) {
  return image.url || `/api/images/${image.id}`;
}

const phases: Array<{ id: ImagePhase; title: string; text: string }> = [
  { id: "before", title: "قبل العلاج", text: "Before Treatment" },
  { id: "after", title: "بعد العلاج / المتابعة", text: "After / Follow-up" },
];

async function uploadImage(patientId: string, phase: ImagePhase, slot: string, label: string, file: File) {
  if (!file.type.startsWith("image/")) throw new Error("الملف المختار ليس صورة");
  if (file.size > 15 * 1024 * 1024) throw new Error("حجم الصورة أكبر من 15 ميغابايت");
  const body = new FormData();
  body.set("slot", slot);
  body.set("label", label);
  body.set("phase", phase);
  body.set("file", file);
  const response = await fetch(`/api/patients/${patientId}/images`, { method: "POST", body });
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(data.error || "تعذر حفظ الصورة");
}

export function ClinicalGallery({ patient, onDone }: { patient: Patient; onDone: () => void }) {
  const [adding, setAdding] = useState<ImagePhase | null>(null);
  const [extraName, setExtraName] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<ClinicalImage | null>(null);
  const extraFile = useRef<HTMLInputElement>(null);

  async function send(phase: ImagePhase, slot: string, label: string, file: File | undefined, key: string) {
    if (!file) return;
    setBusyKey(key);
    setError("");
    try {
      await uploadImage(patient.id, phase, slot, label, file);
      if (slot === "extra") {
        setExtraName("");
        setAdding(null);
        if (extraFile.current) extraFile.current.value = "";
      }
      onDone();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حفظ الصورة");
    } finally {
      setBusyKey("");
    }
  }

  async function remove(image: ClinicalImage) {
    if (!window.confirm(`حذف صورة «${image.label}»؟`)) return;
    setBusyKey(image.id);
    setError("");
    try {
      await mutate(`/api/images/${image.id}`, "DELETE");
      if (preview?.id === image.id) setPreview(null);
      onDone();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حذف الصورة");
    } finally {
      setBusyKey("");
    }
  }

  return (
    <div className="space-y-5">
      {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}
      {phases.map((phase) => {
        const images = patient.clinicalImages.filter((image) => image.phase === phase.id);
        const bySlot = new Map(images.filter((image) => image.slot !== "extra").map((image) => [image.slot, image]));
        const extras = images.filter((image) => image.slot === "extra");
        return (
          <section key={phase.id} className="rounded-[1.75rem] border border-white bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-ink">{phase.title}</h2>
                <p dir="ltr" className="mt-1 text-left text-sm font-semibold text-slate-500">{phase.text}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAdding(phase.id);
                  setExtraName("");
                  setError("");
                }}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sage-700 text-white shadow-[0_12px_30px_-16px_rgba(36,63,50,0.9)] transition hover:bg-sage-800"
                aria-label={`إضافة صورة في ${phase.title}`}
              >
                <Plus size={22} />
              </button>
            </div>
            {adding === phase.id ? (
              <form
                className="mb-5 grid gap-4 rounded-2xl border border-sage-100 bg-sage-50/60 p-4 sm:grid-cols-[1fr_1fr_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  const file = extraFile.current?.files?.[0];
                  void send(phase.id, "extra", extraName, file, `${phase.id}-extra`);
                }}
              >
                <Field label="اسم الصورة الإضافية" required>
                  <TextInput value={extraName} maxLength={80} placeholder="مثال: صورة تقدم بعد 6 أشهر" onChange={(event) => setExtraName(event.target.value)} required />
                </Field>
                <Field label="الملف" required>
                  <input ref={extraFile} type="file" accept={ACCEPT} required className="block w-full text-sm text-slate-600 file:me-3 file:rounded-xl file:border-0 file:bg-white file:px-3 file:py-2 file:font-bold file:text-sage-800" />
                </Field>
                <div className="flex items-end gap-2">
                  <Button type="submit" disabled={busyKey === `${phase.id}-extra`}>{busyKey === `${phase.id}-extra` ? "جارٍ الحفظ..." : "حفظ الصورة"}</Button>
                  <Button type="button" variant="ghost" onClick={() => setAdding(null)}>إلغاء</Button>
                </div>
              </form>
            ) : null}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {CLINICAL_IMAGE_SLOTS.map((slot) => (
                <SlotCard
                  key={slot.key}
                  label={slot.label}
                  image={bySlot.get(slot.key)}
                  busy={busyKey === `${phase.id}-${slot.key}` || busyKey === bySlot.get(slot.key)?.id}
                  onFile={(file) => void send(phase.id, slot.key, slot.label, file, `${phase.id}-${slot.key}`)}
                  onOpen={setPreview}
                  onRemove={(image) => void remove(image)}
                />
              ))}
            </div>
            {extras.length > 0 ? (
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-extrabold text-sage-800">صور إضافية</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                  {extras.map((image) => (
                    <SlotCard key={image.id} label={image.label} image={image} busy={busyKey === image.id} onOpen={setPreview} onRemove={(item) => void remove(item)} />
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        );
      })}
      {preview ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4" onClick={() => setPreview(null)}>
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[1.5rem] bg-white p-3" onClick={(event) => event.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between gap-3 px-2">
              <p dir="ltr" className="font-extrabold text-sage-900">{preview.label}</p>
              <button type="button" onClick={() => setPreview(null)} className="rounded-xl p-2 text-slate-500 hover:bg-sage-50" aria-label="إغلاق">
                <X size={18} />
              </button>
            </div>
            <img src={imageSrc(preview)} alt={preview.label} className="max-h-[75vh] w-full object-contain" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SlotCard({
  label,
  image,
  busy,
  onFile,
  onOpen,
  onRemove,
}: {
  label: string;
  image?: ClinicalImage;
  busy: boolean;
  onFile?: (file: File) => void;
  onOpen: (image: ClinicalImage) => void;
  onRemove: (image: ClinicalImage) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <article className="overflow-hidden rounded-2xl border border-sage-100 bg-sage-50/40">
      <div className="relative aspect-[4/3] bg-sage-50">
        {image ? (
          <button type="button" className="h-full w-full" onClick={() => onOpen(image)} aria-label={`عرض ${label}`}>
            <img src={imageSrc(image)} alt={label} className="h-full w-full object-contain" />
          </button>
        ) : (
          <button
            type="button"
            disabled={!onFile || busy}
            onClick={() => input.current?.click()}
            className="grid h-full w-full place-items-center text-sage-500 transition hover:bg-white hover:text-sage-800"
          >
            <span className="grid place-items-center gap-2 text-xs font-bold">
              <ImagePlus size={22} />
              {busy ? "جارٍ الرفع..." : "رفع صورة"}
            </span>
          </button>
        )}
        {onFile ? (
          <input
            ref={input}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) onFile(file);
            }}
          />
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <p dir="ltr" className="truncate text-left text-xs font-extrabold tracking-wide text-sage-900">{label}</p>
        {image && onFile ? (
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" disabled={busy} onClick={() => input.current?.click()} className="rounded-lg p-1.5 text-sage-700 hover:bg-white" aria-label={`استبدال ${label}`}>
              <Replace size={14} />
            </button>
            <button type="button" disabled={busy} onClick={() => onRemove(image)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-rose-700" aria-label={`حذف ${label}`}>
              <Trash2 size={14} />
            </button>
          </div>
        ) : null}
        {image && !onFile ? (
          <button type="button" disabled={busy} onClick={() => onRemove(image)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-rose-700" aria-label={`حذف ${label}`}>
            <Trash2 size={14} />
          </button>
        ) : null}
      </div>
    </article>
  );
}
