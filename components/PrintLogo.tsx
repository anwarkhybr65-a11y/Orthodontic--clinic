export function PrintLogo({ className = "h-10" }: { className?: string }) {
  return <img src="/logo.png?v=3" alt="شعار أنوار خيبر" className={`print-logo ${className} w-auto shrink-0 object-contain`} />;
}

export function PrintLetterhead({
  kicker,
  title,
  meta,
  compact = false,
}: {
  kicker?: string;
  title: string;
  meta: string;
  compact?: boolean;
}) {
  return (
    <header className={`flex items-center gap-3 border-b border-slate-300 ${compact ? "pb-1" : "pb-2"}`}>
      <PrintLogo className={compact ? "h-8" : "h-10"} />
      <div className="min-w-0 flex-1">
        {kicker ? <p className="text-[10px] font-bold leading-4 text-slate-500">{kicker}</p> : null}
        <h1 className={`font-extrabold leading-tight text-slate-900 ${compact ? "text-base" : "text-lg"}`}>{title}</h1>
      </div>
      <p className="max-w-[38%] shrink-0 text-left text-[10px] leading-4 text-slate-600">{meta}</p>
    </header>
  );
}
