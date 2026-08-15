import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Bell, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserRole } from '@afios/shared';
import { getRoleNavShortcuts, isNavShortcutActive, type NavShortcut } from '@/lib/roleNav';

const CORE_IDS = new Set(['home', 'notifications', 'profile']);

interface MobileNavProps {
  role: UserRole;
  homePath: string;
  unread: number;
  isSystemAdmin?: boolean;
}

export function MobileNav({ role, homePath, unread, isSystemAdmin }: MobileNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const shortcuts = getRoleNavShortcuts(role, { isSystemAdmin });
  const workspaceNav = shortcuts.filter((s) => !CORE_IDS.has(s.id));
  const primaryAction = workspaceNav.find((s) =>
    ['new-request', 'create-po', 'pending', 'approvals', 'verify-po'].includes(s.id)
  );

  const dockItems = [
    { id: 'home', label: 'Home', href: homePath, icon: LayoutDashboard },
    ...(primaryAction
      ? [{ id: primaryAction.id, label: primaryAction.label.split(' ')[0], href: primaryAction.href, icon: primaryAction.icon }]
      : []),
    { id: 'notifications', label: 'Alerts', href: '/notifications', icon: Bell },
    { id: 'menu', label: 'More', href: '#', icon: Menu, isMenu: true },
  ];

  const shortcutById = new Map(shortcuts.map((s) => [s.id, s]));
  const isItemActive = (id: string, href: string) => {
    const shortcut = shortcutById.get(id);
    if (shortcut) return isNavShortcutActive(location.pathname, shortcut);
    return isNavShortcutActive(location.pathname, { id, href } as NavShortcut);
  };

  return (
    <>
      {menuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[60] bg-black/40"
          onClick={() => setMenuOpen(false)}
          aria-hidden
        />
      )}

      {menuOpen && (
        <div className="lg:hidden fixed bottom-[60px] left-0 right-0 z-[70] max-h-[55vh] overflow-y-auto sidebar-scroll bg-surface-sidebar border-t border-white/10 rounded-t-xl safe-bottom animate-slide-up">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <p className="text-xs font-bold uppercase tracking-widest text-white/50">Menu</p>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-white/60 hover:bg-white/10"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-2 space-y-1">
            {shortcuts
              .filter((s) => s.section === 'po' || (s.section || 'workspace') === 'workspace')
              .filter((s) => !CORE_IDS.has(s.id))
              .map((item) => {
                const active = isNavShortcutActive(location.pathname, item);
                return (
                  <Link
                    key={item.id}
                    to={item.href}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold',
                      active ? 'bg-white text-bekem-navy' : 'text-white/70 hover:bg-white/10'
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                  </Link>
                );
              })}
            {shortcuts
              .filter((s) => s.id === 'notifications' || s.id === 'profile')
              .map((item) => {
                const active = isNavShortcutActive(location.pathname, item);
                return (
                  <Link
                    key={item.id}
                    to={item.href}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold',
                      active ? 'bg-white text-bekem-navy' : 'text-white/70 hover:bg-white/10'
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.id === 'notifications' && unread > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-bekem-accent text-white text-[10px] font-bold flex items-center justify-center">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </Link>
                );
              })}
          </div>
        </div>
      )}

      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface-sidebar safe-bottom z-50 border-t border-white/10"
        aria-label="Mobile navigation"
      >
        <div className="flex justify-around items-center h-[60px] px-1">
          {dockItems.map((item) => {
            if ('isMenu' in item && item.isMenu) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className={cn(
                    'flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-semibold min-w-[52px]',
                    menuOpen ? 'text-white' : 'text-white/45'
                  )}
                >
                  <item.icon className="h-5 w-5" strokeWidth={2} />
                  <span>{item.label}</span>
                </button>
              );
            }

            const active = isItemActive(item.id, item.href);
            return (
              <Link
                key={item.id}
                to={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-semibold relative min-w-[52px]',
                  active ? 'text-white' : 'text-white/45'
                )}
              >
                <item.icon className="h-5 w-5" strokeWidth={2} />
                <span className="truncate max-w-[64px]">{item.label}</span>
                {item.id === 'notifications' && unread > 0 && (
                  <span className="absolute top-0 right-1 min-w-[16px] h-4 px-1 rounded-full bg-white text-bekem-navy text-[9px] font-bold flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
