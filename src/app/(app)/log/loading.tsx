export default function Loading() {
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-7 pb-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="h-6 w-24 animate-pulse rounded-control bg-line" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-control bg-line" />
          ))}
        </div>
      </div>
    </div>
  );
}
