export default function Loading() {
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-7 pb-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="h-6 w-32 animate-pulse rounded-control bg-line" />
        <div className="h-20 animate-pulse rounded-control bg-line" />
        <div className="h-14 animate-pulse rounded-control bg-line" />
        <div className="flex gap-4">
          <div className="h-16 flex-1 animate-pulse rounded-control bg-line" />
          <div className="h-16 w-16 shrink-0 animate-pulse rounded-full bg-line" />
        </div>
        <div className="h-24 animate-pulse rounded-control bg-line" />
      </div>
    </div>
  );
}
