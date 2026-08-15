import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate } from '@afios/shared';
import type { NotificationDto } from '@afios/shared';
import { UserRole } from '@afios/shared';
import { useAuthStore } from '@/stores/authStore';
import { getNotificationPath } from '@/lib/notificationRoutes';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';
import { cn } from '@/lib/utils';

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function groupNotifications(items: NotificationDto[]) {
  const today = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: { label: string; items: NotificationDto[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'This week', items: [] },
    { label: 'Earlier', items: [] },
  ];

  for (const n of items) {
    const created = startOfDay(new Date(n.createdAt));
    if (created.getTime() === today.getTime()) groups[0].items.push(n);
    else if (created.getTime() === yesterday.getTime()) groups[1].items.push(n);
    else if (created >= weekAgo) groups[2].items.push(n);
    else groups[3].items.push(n);
  }

  return groups.filter((g) => g.items.length > 0);
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role) as UserRole;

  const { data: notifications, list } = useListQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get<{ data: NotificationDto[] }>('/notifications');
      return normalizeListData<NotificationDto>(res.data.data);
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const handleTap = (n: NotificationDto) => {
    if (!n.isRead) markRead.mutate(n.id);
    const path = getNotificationPath(n, role);
    if (path) {
      navigate(path);
      return;
    }
    toast.info('This update is for another role — switch role to view procurement details.');
  };

  const groups = notifications ? groupNotifications(notifications) : [];

  return (
    <div className="page-container">
      <PageHeader title="Notification center" subtitle="Updates grouped by when they arrived" />

      <ListQueryBoundary
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={list.onRetry}
        retrying={list.retrying}
        isEmpty={!notifications?.length}
        skeletonRows={6}
        empty={
          <EmptyState
            celebrate
            title="All quiet"
            description="No new notifications. Everything is completed."
          />
        }
      >
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.label}>
              <h2 className="section-label mb-4">{group.label}</h2>
              <div className="space-y-2">
                {group.items.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleTap(n)}
                    className={cn(
                      'data-row w-full text-left',
                      !n.isRead && 'border-l-4 border-l-bekem-accent pl-4'
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[15px] text-ink">{n.title}</p>
                      <p className="text-sm text-ink-secondary mt-1">{n.body}</p>
                      <p className="text-xs text-ink-muted mt-2">{formatDate(n.createdAt)}</p>
                    </div>
                    {!n.isRead && (
                      <span className="h-2 w-2 rounded-full bg-bekem-accent shrink-0" aria-hidden />
                    )}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </ListQueryBoundary>
    </div>
  );
}
