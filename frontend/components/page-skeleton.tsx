import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  variant?: "list" | "detail" | "grid";
  rows?: number;
}

export function PageSkeleton({ variant = "list", rows = 8 }: Props) {
  if (variant === "detail") {
    return (
      <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <div className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }
  if (variant === "grid") {
    return (
      <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
        <div className="mx-auto w-full space-y-6">
          <Skeleton className="h-7 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }
  // list
  return (
    <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
      <div className="mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-9 w-full max-w-sm" />
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {[...Array(rows)].map((_, i) => (
            <div key={i} className="flex gap-4 px-4 py-3 border-b last:border-0">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
