export default function Loading() {
  return (
    <div className="h-full overflow-y-auto px-7 pb-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="h-8 w-28 animate-pulse rounded-control bg-line" />
      <div className="mt-10 space-y-2">
        <div className="h-4 w-full animate-pulse rounded-control bg-line" />
        <div className="h-4 w-5/6 animate-pulse rounded-control bg-line" />
      </div>
    </div>
  );
}
