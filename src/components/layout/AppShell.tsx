import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { ROLE_LABELS, UserRole } from '@afios/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { NotificationDto } from '@afios/shared';
import { getRoleHomePath } from '@/lib/rolePaths';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { AccessDeniedToast } from '@/components/AccessDeniedToast';
import { CommandPalette, SearchTrigger } from '@/components/layout/CommandPalette';

export function AppShell() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const role = user?.role as UserRole;
  const homePath = role ? getRoleHomePath(role) : '/';
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get<{ data: NotificationDto[] }>('/notifications');
      return res.data.data;
    },
    refetchInterval: 30000,
  });

  const unread = notifications?.filter((n) => !n.isRead).length || 0;

  const hideNav =
    location.pathname.includes('/allocate') ||
    location.pathname.includes('/forward') ||
    location.pathname.includes('/executive/po/new') ||
    location.pathname.includes('/pm/approvals');

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[200] focus:px-4 focus:py-2 focus:bg-white focus:rounded-lg focus:shadow-lg"
      >
        Skip to content
      </a>
      <AccessDeniedToast />
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      {!hideNav && <AppSidebar unread={unread} />}

      <div className="flex-1 flex flex-col min-w-0">
        {!hideNav && user && (
          <header className="hidden lg:flex h-14 shrink-0 items-center justify-between border-b border-surface-border bg-white/95 backdrop-blur-md px-6 sticky top-0 z-30">
            <div className="flex items-center gap-6 min-w-0">
              <span className="text-sm font-semibold tracking-tight text-ink shrink-0">AFIOS</span>
              <span className="h-4 w-px bg-surface-border shrink-0" aria-hidden />
              <p className="text-sm text-ink-secondary truncate">
                <span className="font-semibold text-ink">{user.name}</span>
                <span className="mx-2 text-ink-muted">·</span>
                <span className="font-medium text-bekem-accent">{ROLE_LABELS[role]}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <SearchTrigger onClick={() => setSearchOpen(true)} />
              <NavLink
                to="/notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-xl text-ink-secondary hover:text-ink hover:bg-surface-muted transition-all duration-200"
                aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
              >
                <Bell className="h-4 w-4" strokeWidth={1.75} />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-bekem-accent text-white text-[10px] font-bold flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </NavLink>
            </div>
          </header>
        )}

        <main
          id="main-content"
          className={cn('flex-1 overflow-y-auto w-full', hideNav ? 'pb-4' : 'pb-20 lg:pb-10')}
        >
          <div className="max-w-dashboard mx-auto px-4 sm:px-6 lg:px-10 py-2">
            <Outlet />
          </div>
        </main>

        {!hideNav && role && (
          <MobileNav role={role} homePath={homePath} unread={unread} />
        )}
      </div>
    </div>
  );
}
