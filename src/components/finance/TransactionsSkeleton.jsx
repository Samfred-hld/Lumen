import { Skeleton } from '@/components/ui/skeleton';

export default function TransactionsSkeleton() {
  return (
    <div className="py-xl space-y-6">
      {/* Page Header skeleton */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <Skeleton className="h-7 w-32 shimmer mb-1" />
          <Skeleton className="h-4 w-48 shimmer" />
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-9 w-20 shimmer rounded-lg" />
            <Skeleton className="h-9 w-20 shimmer rounded-lg" />
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="h-9 w-8 shimmer rounded-lg" />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-14 shimmer rounded-lg" />
            ))}
            <Skeleton className="h-9 w-8 shimmer rounded-lg" />
          </div>
        </div>
      </div>

      {/* KPI Grid skeleton */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-surface border border-surface-border p-card-padding relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-surface-container-high shimmer" />
            <Skeleton className="h-3 w-24 shimmer mb-sm" />
            <Skeleton className="h-8 w-32 shimmer" />
          </div>
        ))}
      </section>

      {/* Bento Layout skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Inline Form skeleton (desktop only) */}
        <section className="hidden lg:block lg:col-span-3 space-y-6">
          <div className="bg-surface border border-surface-border p-4 space-y-4">
            <Skeleton className="h-5 w-32 shimmer" />
            <Skeleton className="h-10 w-full shimmer rounded-lg" />
            <Skeleton className="h-10 w-full shimmer rounded-lg" />
            <Skeleton className="h-10 w-full shimmer rounded-lg" />
            <Skeleton className="h-10 w-full shimmer rounded-lg" />
          </div>
        </section>

        {/* Transaction List & Filters skeleton */}
        <div className="lg:col-span-9 space-y-4">
          {/* Filter bar skeleton */}
          <div className="bg-surface border border-surface-border p-3 space-y-3">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-8 w-24 shimmer rounded-lg" />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-8 w-28 shimmer rounded-lg" />
              <Skeleton className="h-8 w-28 shimmer rounded-lg" />
            </div>
          </div>

          {/* Transaction rows skeleton */}
          <div className="bg-surface border border-surface-border">
            <div className="flex items-center px-xs py-2 border-b border-surface-border">
              <Skeleton className="h-4 w-4 shimmer mr-sm" />
              <Skeleton className="h-3 w-32 shimmer" />
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-sm px-xs py-md border-b border-surface-border">
                <Skeleton className="w-4 h-4 shimmer" />
                <Skeleton className="w-8 h-8 rounded-full shimmer" />
                <div className="flex-1 flex items-center justify-between">
                  <Skeleton className="h-4 w-32 shimmer" />
                  <Skeleton className="h-5 w-20 shimmer rounded" />
                  <Skeleton className="h-4 w-20 shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
