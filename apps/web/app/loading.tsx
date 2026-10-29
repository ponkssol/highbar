import { StatsSkeleton, TokenTableSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2"><Skeleton className="h-40 w-full rounded-lg" /><StatsSkeleton /></div>
      <TokenTableSkeleton />
    </div>
  );
}
