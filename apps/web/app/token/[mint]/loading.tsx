import { ChartSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="flex flex-col gap-1.5"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-20" /></div></div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <ChartSkeleton />
        <Skeleton className="h-64 w-full rounded-lg lg:h-[420px]" />
      </div>
    </div>
  );
}
