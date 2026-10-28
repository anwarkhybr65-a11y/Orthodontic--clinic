import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const fieldClass =
  "w-full rounded-2xl border border-sage-200 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-sage-500 focus:ring-4 focus:ring-sage-100";

export function Field({
  label,
  required,
  hint,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-2 flex items-center gap-1 text-sm font-bold text-sage-900">
        {label}
        {required ? <span className="text-rose-600">*</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs leading-5 text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input autoComplete="off" {...props} className={cn(fieldClass, props.className)} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(fieldClass, "min-h-28 resize-y leading-7", props.className)} />;
}

export function Choice({
  checked,
  label,
  onChange,
  type = "checkbox",
  name,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
  type?: "checkbox" | "radio";
  name?: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition",
        checked
          ? "border-sage-500 bg-sage-50 text-sage-900 shadow-sm"
          : "border-sage-100 bg-white text-slate-700 hover:border-sage-300",
      )}
    >
      <input type={type} name={name} checked={checked} onChange={onChange} className="h-4 w-4 accent-sage-700" />
      {label}
    </label>
  );
}

export function SectionCard({ index, title, children }: { index: string; title: string; children: ReactNode }) {
  return (
    <section className="rounded-[1.75rem] border border-white bg-white/90 p-5 shadow-[0_18px_50px_-30px_rgba(36,63,50,0.55)] sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sage-700 text-sm font-extrabold text-white">
          {index}
        </span>
        <h2 className="text-lg font-extrabold text-ink">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-sage-700 text-white shadow-[0_12px_30px_-16px_rgba(36,63,50,0.9)] hover:bg-sage-800",
    secondary: "border border-sage-200 bg-white text-sage-900 hover:bg-sage-50",
    ghost: "bg-transparent text-sage-800 hover:bg-sage-100",
    danger: "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50",
  }[variant];
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
        styles,
        className,
      )}
    />
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-sage-200 bg-white/75 px-6 py-14 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-sage-50 text-sage-700">{icon}</div>
      <h3 className="text-lg font-extrabold text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-slate-600">{text}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
