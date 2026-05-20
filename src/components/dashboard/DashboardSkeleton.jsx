import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardSkeleton() {
  return (
    <>
      {/* Hero Balance skeleton */}
      <section className="py-xl mb-md">
        <p className="font-label-caps text-label-caps text-on-surface-variant tracking-[0.15em] mb-xs">DISPONÍVEL ESTE MÊS</p>
        <Skeleton className="h-[60px] w-64 shimmer" />
        <div className="h-[1px] w-full bg-editorial-rule mt-md" />
      </section>

      {/* KPI Grid skeleton */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-sm md:gap-md mb-xl">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-surface border border-surface-border p-card-padding relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-surface-container-high shimmer" />
            <Skeleton className="h-3 w-24 shimmer mb-sm" />
            <Skeleton className="h-8 w-32 shimmer" />
          </div>
        ))}
      </section>

      {/* Transactions + Health Score Grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl mb-xl">
        {/* Transactions List skeleton (8 cols) */}
        <section className="lg:col-span-8">
          <div className="flex items-center justify-between mb-md pb-xs border-b border-surface-border">
            <Skeleton className="h-5 w-40 shimmer" />
            <Skeleton className="h-4 w-20 shimmer" />
          </div>
          <div className="flex flex-col">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="grid grid-cols-12 gap-md px-xs py-md border-b border-surface-border items-center">
                <div className="col-span-6 flex items-center gap-sm">
                  <Skeleton className="w-8 h-8 rounded-full shimmer" />
                  <Skeleton className="h-4 w-32 shimmer" />
                </div>
                <div className="col-span-3"><Skeleton className="h-4 w-16 shimmer" /></div>
                <div className="col-span-3 flex justify-end"><Skeleton className="h-4 w-20 shimmer" /></div>
              </div>
            ))}
          </div>
        </section>

        {/* Health Score skeleton (4 cols) */}
        <section className="lg:col-span-4">
          <div className="bg-surface border border-surface-border p-lg">
            <Skeleton className="h-5 w-40 shimmer mb-lg" />
            <div className="flex flex-col items-center justify-center mb-xl">
              <Skeleton className="w-48 h-48 rounded-full shimmer" />
            </div>
            <div className="space-y-md">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex flex-col gap-xs">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-32 shimmer" />
                    <Skeleton className="h-3 w-16 shimmer" />
                  </div>
                  <Skeleton className="h-1 w-full shimmer" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
