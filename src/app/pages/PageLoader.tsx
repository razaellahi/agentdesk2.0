import { Skeleton } from "@/components/ui/skeleton";

export function PageLoader() {
  return (
    <div className="flex flex-col gap-3 p-6" aria-busy="true">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <Skeleton className="mt-4 h-64 w-full" />
    </div>
  );
}
