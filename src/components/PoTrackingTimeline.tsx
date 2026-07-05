import { useQuery } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export interface PoTimelineStage {
  stage: string;
  label: string;
  reachedAt: string | null;
  isCurrent: boolean;
  isComplete: boolean;
}

interface PoTrackingTimelineProps {
  poId: string;
  className?: string;
}

export function PoTrackingTimeline({ poId, className }: PoTrackingTimelineProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['po-timeline', poId],
    queryFn: async () => {
      const res = await api.get<{
        data: { stages: PoTimelineStage[]; currentStage: string };
      }>(`/purchase-orders/${poId}/timeline`);
      return res.data.data;
    },
    enabled: !!poId,
  });

  if (isLoading) {
    return <div className={cn('h-16 rounded-xl bg-surface-muted animate-pulse', className)} />;
  }

  const stages = data?.stages ?? [];

  return (
    <div className={cn('overflow-x-auto pb-1', className)}>
      <ol className="flex min-w-max items-start gap-0">
        {stages.map((s, idx) => (
          <li key={s.stage} className="flex items-start">
            <div className="flex flex-col items-center w-[5.5rem] sm:w-[6.5rem]">
              <div
                className={cn(
                  'h-8 w-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0',
                  s.isComplete
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : s.isCurrent
                      ? 'bg-sky-600 border-sky-600 text-white ring-4 ring-sky-100'
                      : 'bg-white border-surface-border text-ink-muted'
                )}
              >
                {s.isComplete ? <Check className="h-4 w-4" /> : idx + 1}
              </div>
              <p
                className={cn(
                  'mt-2 text-[10px] sm:text-xs font-semibold text-center leading-tight',
                  s.isCurrent ? 'text-sky-700' : s.isComplete ? 'text-emerald-700' : 'text-ink-muted'
                )}
              >
                {s.label}
              </p>
              {s.reachedAt && (
                <p className="text-[9px] text-ink-muted mt-0.5 text-center">
                  {new Date(s.reachedAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </p>
              )}
            </div>
            {idx < stages.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-6 sm:w-10 mt-4 shrink-0',
                  s.isComplete ? 'bg-emerald-400' : 'bg-surface-border'
                )}
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
