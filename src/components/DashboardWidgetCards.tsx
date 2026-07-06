import { ClipboardList, Truck, PackageCheck, ClipboardCheck } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import type { DashboardWidgetsDto } from '@afios/shared';

interface DashboardWidgetCardsProps {
  widgets?: DashboardWidgetsDto['widgets'];
  loading?: boolean;
  onNavigate?: (key: string) => void;
}

const WIDGETS = [
  { key: 'pendingPo', title: 'Pending PO', icon: ClipboardList, tone: 'blue' as const },
  { key: 'pendingDeliveries', title: 'Pending Deliveries', icon: Truck, tone: 'amber' as const },
  {
    key: 'pendingMaterialReceipt',
    title: 'Pending Material Receipt',
    icon: PackageCheck,
    tone: 'blue' as const,
  },
  {
    key: 'pendingApprovals',
    title: 'Pending Approvals',
    icon: ClipboardCheck,
    tone: 'blue' as const,
  },
];

export function DashboardWidgetCards({ widgets, loading, onNavigate }: DashboardWidgetCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 section-gap">
        {WIDGETS.map((w) => (
          <div key={w.key} className="h-20 rounded-lg bg-surface-muted border border-surface-border animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 section-gap">
      {WIDGETS.map((w) => (
        <StatCard
          key={w.key}
          label={w.title}
          value={widgets?.[w.key as keyof typeof widgets] ?? 0}
          icon={<w.icon className="h-4 w-4" />}
          tone={w.tone}
          onClick={onNavigate ? () => onNavigate(w.key) : undefined}
        />
      ))}
    </div>
  );
}
