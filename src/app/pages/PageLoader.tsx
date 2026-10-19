import { Skeleton } from "@/components/ui/skeleton";

export function PageLoader() {
  return (
    <div className="desk-canvas flex flex-col gap-4 p-6" aria-busy="true">
      <Skeleton className="h-8 w-48 rounded-xl" />
      <Skeleton className="h-4 w-80 max-w-full rounded-lg" />
      <div className="desk-panel mt-2 flex-1 overflow-hidden rounded-2xl p-4">
        <Skeleton className="h-full min-h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}
