import { Skeleton } from '@/components/ui/skeleton';

export default function ReportsSkeleton() {
  return (
    <div className="py-xl max-w-6xl mx-auto space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Skeleton className="h-7 w-28 shimmer mb-1" />
          <Skeleton className="h-4 w-52 shimmer" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Skeleton className="h-9 w-[140px] shimmer rounded-lg" />
          <Skeleton className="h-9 w-[130px] shimmer rounded-lg" />
          <Skeleton className="h-9 w-16 shimmer rounded-lg" />
          <Skeleton className="h-9 w-24 shimmer rounded-lg" />
        </div>
      </div>

      {/* KPI Grid skeleton */}
      <div className="hidden lg:grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-surface border border-surface-border p-card-padding relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-surface-container-high shimmer" />
            <Skeleton className="h-3 w-24 shimmer mb-sm" />
            <Skeleton className="h-8 w-32 shimmer" />
          </div>
        ))}
      </div>

      {/* Advanced KPIs skeleton */}
      <div className="hidden lg:grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-surface border border-surface-border rounded-lg shadow-sm">
            <div className="p-4">
              <Skeleton className="h-3 w-28 shimmer mb-1" />
              <Skeleton className="h-6 w-24 shimmer" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts row 1 skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Area chart skeleton */}
        <div className="bg-surface border border-surface-border rounded-lg shadow-sm overflow-hidden">
          <div className="p-3 border-b border-surface-border">
            <Skeleton className="h-4 w-36 shimmer" />
          </div>
          <div className="p-4">
            <Skeleton className="h-[220px] w-full shimmer rounded" />
          </div>
        </div>

        {/* Pie chart skeleton */}
        <div className="bg-surface border border-surface-border rounded-lg shadow-sm overflow-hidden">
          <div className="p-3 border-b border-surface-border">
            <Skeleton className="h-4 w-44 shimmer" />
          </div>
          <div className="p-4 flex items-center gap-3">
            <Skeleton className="h-[200px] w-[55%] shimmer rounded-full" />
            <div className="flex-1 space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="w-2.5 h-2.5 rounded-full shimmer" />
                  <Skeleton className="h-3 flex-1 shimmer" />
                  <Skeleton className="h-3 w-16 shimmer" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cash Flow Forecast skeleton */}
      <div className="bg-surface border border-surface-border rounded-lg shadow-sm overflow-hidden">
        <div className="p-3 border-b border-surface-border">
          <Skeleton className="h-4 w-40 shimmer" />
        </div>
        <div className="p-4">
          <Skeleton className="h-[200px] w-full shimmer rounded" />
        </div>
      </div>

      {/* Category bar chart skeleton */}
      <div className="bg-surface border border-surface-border rounded-lg shadow-sm overflow-hidden">
        <div className="p-3 border-b border-surface-border">
          <Skeleton className="h-4 w-52 shimmer" />
        </div>
        <div className="p-4">
          <Skeleton className="h-[220px] w-full shimmer rounded" />
        </div>
      </div>

      {/* Real vs Planejado skeleton */}
      <div className="bg-surface border border-surface-border rounded-lg shadow-sm overflow-hidden">
        <div className="p-3 border-b border-surface-border">
          <Skeleton className="h-4 w-36 shimmer" />
        </div>
        <div className="p-4 space-y-4">
          <Skeleton className="h-[220px] w-full shimmer rounded" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-28 shimmer" />
                <Skeleton className="h-4 w-20 shimmer ml-auto" />
                <Skeleton className="h-4 w-20 shimmer" />
                <Skeleton className="h-4 w-16 shimmer" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions table skeleton */}
      <div className="bg-surface border border-surface-border rounded-lg shadow-sm overflow-hidden">
        <div className="p-3 border-b border-surface-border">
          <Skeleton className="h-4 w-48 shimmer" />
        </div>
        <div className="p-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-surface-border/50">
              <Skeleton className="h-4 w-20 shimmer" />
              <Skeleton className="h-4 w-32 shimmer" />
              <Skeleton className="h-4 w-24 shimmer hidden sm:block" />
              <Skeleton className="h-4 w-16 shimmer hidden md:block ml-auto" />
              <Skeleton className="h-4 w-20 shimmer" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
