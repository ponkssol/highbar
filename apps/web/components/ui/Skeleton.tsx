/** Subtle loading placeholders matching the card style (no heavy borders). */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-border ${className}`} />;
}

export function ChartSkeleton({ className = "h-[300px] md:h-[420px]" }: { className?: string }) {
  return (
    <div role="status" aria-label="Loading chart" className={`flex flex-col gap-3 rounded-lg bg-surface p-3 shadow-card md:p-4 ${className}`}>
      <div className="flex items-center gap-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-12" /><Skeleton className="ml-auto h-4 w-24" /></div>
      <Skeleton className="w-full flex-1" />
    </div>
  );
}

export function TokenTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading tokens" className="rounded-lg bg-surface p-3 shadow-card md:p-4">
      <div className="mb-3 flex gap-2"><Skeleton className="h-7 w-16" /><Skeleton className="h-7 w-20" /><Skeleton className="h-7 w-20" /></div>
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5"><Skeleton className="h-3.5 w-28 max-w-full" /><Skeleton className="h-3 w-16" /></div>
            <Skeleton className="hidden h-3.5 w-16 sm:block" />
            <Skeleton className="hidden h-3.5 w-20 md:block" />
            <Skeleton className="h-3.5 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatsSkeleton({ bare = false }: { bare?: boolean }) {
  return (
    <div role="status" aria-label="Loading stats" className={`grid grid-cols-2 gap-4 p-4 md:p-5 ${bare ? "" : "rounded-lg bg-surface shadow-card"}`}>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex flex-col gap-2"><Skeleton className="h-6 w-20 md:h-7" /><Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-12" /></div>
      ))}
    </div>
  );
}
