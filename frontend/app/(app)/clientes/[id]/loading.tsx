import { Skeleton } from "@/components/ui/skeleton";

export default function ClienteDetalleLoading() {
  return (
    <div className="w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 h-full">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-md shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <Skeleton className="h-4 w-24" />
              <div className="space-y-2">
                {[...Array(5)].map((_, j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Pedidos */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b">
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="divide-y">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <div className="text-right space-y-1.5">
                  <Skeleton className="h-4 w-20 ml-auto" />
                  <Skeleton className="h-3 w-16 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagos */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b">
            <Skeleton className="h-5 w-44" />
          </div>
          <div className="divide-y">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
