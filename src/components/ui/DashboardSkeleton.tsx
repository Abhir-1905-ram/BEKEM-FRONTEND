export function DashboardSkeleton() {
  return (
    <div className="page-container space-y-3 animate-pulse">
      <div className="panel overflow-hidden">
        <div className="h-20 bg-surface-muted" />
        <div className="p-3 space-y-2.5">
          <div className="h-16 bg-surface-muted rounded-lg" />
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="h-20 bg-surface-muted rounded-lg" />
            <div className="h-20 bg-surface-muted rounded-lg" />
          </div>
        </div>
      </div>
      <div className="h-24 bg-surface-muted rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-surface-muted rounded-lg" />
        ))}
      </div>
    </div>
  );
}
