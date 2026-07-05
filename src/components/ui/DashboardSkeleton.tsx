export function DashboardSkeleton() {
  return (
    <div className="page-container space-y-6 lg:space-y-8 animate-pulse">
      <div className="panel overflow-hidden">
        <div className="h-28 bg-surface-muted" />
        <div className="p-6 space-y-4">
          <div className="h-24 bg-surface-muted rounded-lg" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-28 bg-surface-muted rounded-lg" />
            <div className="h-28 bg-surface-muted rounded-lg" />
          </div>
        </div>
      </div>
      <div className="h-32 bg-surface-muted rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-surface-muted rounded-lg" />
        ))}
      </div>
    </div>
  );
}
