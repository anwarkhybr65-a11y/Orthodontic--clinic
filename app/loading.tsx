export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-56 animate-pulse rounded-2xl bg-white" />
      <div className="h-40 animate-pulse rounded-[1.75rem] bg-white" />
      <div className="h-64 animate-pulse rounded-[1.75rem] bg-white/80" />
    </div>
  );
}
