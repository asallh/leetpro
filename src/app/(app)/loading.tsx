import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-10" aria-busy="true" aria-label="Loading">
      <div className="space-y-3">
        <Skeleton className="h-5 w-24 rounded-md" />
        <Skeleton className="h-12 w-[28rem] max-w-full rounded-lg" />
        <Skeleton className="h-5 w-96 max-w-full rounded-md" />
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
