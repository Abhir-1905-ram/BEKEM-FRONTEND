import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle } from 'lucide-react';
import { api } from '@/lib/api';
import type { StatusHistoryDto } from '@afios/shared';
import { formatDate } from '@afios/shared';
import { StatusBadge } from './ui/StatusBadge';

interface StatusTimelineProps {
  entityType: string;
  entityId: string;
}

export function StatusTimeline({ entityType, entityId }: StatusTimelineProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['timeline', entityType, entityId],
    queryFn: async () => {
      const res = await api.get<{ data: StatusHistoryDto[] }>(
        `/timeline/${entityType}/${entityId}`
      );
      return res.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data?.length) {
    return (
      <p className="text-sm text-gray-500 text-center py-6">No timeline events yet.</p>
    );
  }

  return (
    <div className="relative space-y-0">
      {data.map((event, idx) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.05 }}
          className="flex gap-3 pb-6 last:pb-0"
        >
          <div className="flex flex-col items-center">
            {idx === data.length - 1 ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-gray-300 shrink-0" />
            )}
            {idx < data.length - 1 && (
              <div className="w-px flex-1 bg-gray-200 mt-1 min-h-[24px]" />
            )}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={event.toStatus} />
              <span className="text-xs text-gray-400">{formatDate(event.timestamp)}</span>
            </div>
            <p className="text-sm text-gray-700 mt-1">{event.actorName || 'System'}</p>
            {event.note && (
              <p className="text-sm text-gray-500 mt-0.5">{event.note}</p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
