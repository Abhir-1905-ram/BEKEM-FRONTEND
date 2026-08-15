import { useQuery, type QueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PmDailyCapDto } from '@afios/shared';
import { cn } from '@/lib/utils';

function fmtInr(n: number | null | undefined) {
  const value = Number(n);
  return `₹${(Number.isFinite(value) ? value : 0).toLocaleString('en-IN')}`;
}

function applyDailyCap(queryClient: QueryClient, key: string[], cap?: Partial<PmDailyCapDto> | null) {
  if (cap?.dailyApprovedTotal == null || cap.dailyCap == null) return;
  const remaining = cap.remaining ?? Math.max(0, cap.dailyCap - cap.dailyApprovedTotal);
  queryClient.setQueryData(key, {
    dailyApprovedTotal: cap.dailyApprovedTotal,
    dailyCap: cap.dailyCap,
    remaining,
  });
}

export function applyPmDailyCap(queryClient: QueryClient, cap?: Partial<PmDailyCapDto> | null) {
  applyDailyCap(queryClient, ['pm-daily-cap'], cap);
}

export function invalidatePmDailyCap(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['pm-daily-cap'] });
  void queryClient.invalidateQueries({ queryKey: ['pm-dashboard'] });
  void queryClient.invalidateQueries({ queryKey: ['dashboard-today'] });
}

export function applyCoordinatorDailyCap(
  queryClient: QueryClient,
  cap?: Partial<PmDailyCapDto> | null
) {
  applyDailyCap(queryClient, ['coordinator-daily-cap'], cap);
}

export function invalidateCoordinatorDailyCap(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['coordinator-daily-cap'] });
  void queryClient.invalidateQueries({ queryKey: ['dashboard-today'] });
  void queryClient.invalidateQueries({ queryKey: ['po-queue-coordinator'] });
}

function DailyCapBanner({
  queryKey,
  endpoint,
  underCapNote,
  overCapNote,
  cap,
}: {
  queryKey: string[];
  endpoint: string;
  underCapNote: (cap: number) => string;
  overCapNote: (cap: number) => string;
  cap?: PmDailyCapDto;
}) {
  const { data: fetched } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await api.get<{ data: PmDailyCapDto }>(endpoint);
      return res.data.data;
    },
    placeholderData: (previous) => previous ?? cap,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 10_000,
  });

  const daily = fetched || cap;
  if (!daily) return null;

  const dailyApprovedTotal = Number(daily.dailyApprovedTotal) || 0;
  const dailyCap = Number(daily.dailyCap) || 0;
  if (!(dailyCap > 0)) return null;
  const remaining = Number(daily.remaining);
  const left = Number.isFinite(remaining) ? remaining : Math.max(0, dailyCap - dailyApprovedTotal);
  const pct = Math.min(100, Math.round((dailyApprovedTotal / dailyCap) * 100));
  const nearCap = left <= 500;
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
          {fmtInr(left)} left
        </span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-surface-border overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            overCap ? 'bg-danger' : nearCap ? 'bg-warning' : 'bg-bekem-accent'
          )}
          style={{ width: `${pct}%`, minWidth: pct > 0 ? '0.5rem' : 0 }}
        />
      </div>
      <p className="text-xs text-ink-muted mt-2">{underCapNote(dailyCap)}</p>
      {overCap && <p className="text-xs text-danger mt-1">{overCapNote(dailyCap)}</p>}
    </div>
  );
}

export function PmDailyCapBanner({ cap }: { cap?: PmDailyCapDto }) {
  return (
    <DailyCapBanner
      queryKey={['pm-daily-cap']}
      endpoint="/material-requests/pm/daily-cap"
      underCapNote={(limit) =>
        `${fmtInr(limit)}/day threshold. Only local Approve & close under ${fmtInr(limit)} counts here. ${fmtInr(limit)} or more goes to Head Office and is not added to this bar.`
      }
      overCapNote={(limit) =>
        `Daily cap of ${fmtInr(limit)} reached — further under-${fmtInr(limit)} approvals will escalate to Head Office.`
      }
      cap={cap}
    />
  );
}

export function CoordinatorDailyCapBanner({ cap }: { cap?: PmDailyCapDto }) {
  return (
    <DailyCapBanner
      queryKey={['coordinator-daily-cap']}
      endpoint="/purchase-orders/coordinator/daily-cap"
      underCapNote={(limit) =>
        `${fmtInr(limit)}/day threshold. Only local Approve & close within this cap counts here. Amounts that exceed today’s remaining cap, or the Coordinator per-PO limit, go to MD/Coordinator and are not added to this bar.`
      }
      overCapNote={(limit) =>
        `Daily cap of ${fmtInr(limit)} reached — further Coordinator-band approvals will escalate to MD/Coordinator.`
      }
      cap={cap}
    />
  );
}
