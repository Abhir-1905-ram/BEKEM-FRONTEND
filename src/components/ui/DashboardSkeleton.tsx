export function DashboardSkeleton() {
  return (
    <div className="page-container animate-pulse space-y-8 lg:space-y-10">
      <div className="rounded-3xl border border-surface-border bg-white overflow-hidden">
        <div className="h-40 bg-surface-muted" />
        <div className="p-8 space-y-4">
          <div className="h-24 bg-surface-muted rounded-3xl" />
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="h-28 bg-surface-muted rounded-3xl" />
            <div className="h-28 bg-surface-muted rounded-3xl" />
          </div>
        </div>
      </div>
      <div className="h-32 bg-surface-muted rounded-3xl" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-surface-muted rounded-3xl" />
        ))}
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-surface-muted rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
