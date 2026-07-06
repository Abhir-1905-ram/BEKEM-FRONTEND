import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PmDailyCapDto } from '@afios/shared';
import { cn } from '@/lib/utils';

function fmtInr(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

export function PmDailyCapBanner({ cap }: { cap?: PmDailyCapDto }) {
  const { data: fetched } = useQuery({
    queryKey: ['pm-daily-cap'],
    queryFn: async () => {
      const res = await api.get<{ data: PmDailyCapDto }>('/material-requests/pm/daily-cap');
      return res.data.data;
    },
    enabled: !cap,
    refetchInterval: 30_000,
  });

  const daily = cap || fetched;
  if (!daily) return null;

  const { dailyApprovedTotal, dailyCap, remaining } = daily;
  const pct = Math.min(100, Math.round((dailyApprovedTotal / dailyCap) * 100));
  const nearCap = remaining <= 500;
  const overCap = dailyApprovedTotal >= dailyCap;

  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2 mb-3',
        overCap
          ? 'border-danger/40 bg-danger/5'
          : nearCap
            ? 'border-warning/40 bg-warning/5'
            : 'border-surface-border bg-surface-muted/30'
      )}
    >
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-ink">
          Approved today: {fmtInr(dailyApprovedTotal)} of {fmtInr(dailyCap)}
        </span>
        <span
          className={cn(
            'text-xs font-semibold tabular-nums',
            overCap ? 'text-danger' : nearCap ? 'text-warning' : 'text-ink-muted'
          )}
        >
          {fmtInr(remaining)} left
        </span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-surface-border overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            overCap ? 'bg-danger' : nearCap ? 'bg-warning' : 'bg-pm'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {overCap && (
        <p className="text-xs text-danger mt-2">
          Daily cap reached — further approvals will escalate to Head Office.
        </p>
      )}
    </div>
  );
}
