import { NavLink } from 'react-router-dom';
import { LogOut, ArrowLeftRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { ROLE_LABELS, UserRole } from '@afios/shared';
import { useI18n } from '@/i18n/I18nContext';
import { getFirstName } from '@afios/shared';
import { BekemLogo } from '@/components/brand/BekemLogo';
import { useSignOut } from '@/lib/signOut';
import { getRoleNavShortcuts } from '@/lib/roleNav';

const CORE_IDS = new Set(['home', 'notifications', 'profile']);

interface AppSidebarProps {
  unread: number;
}

export function AppSidebar({ unread }: AppSidebarProps) {
  const user = useAuthStore((s) => s.user);
  const { signOut, signingOut } = useSignOut();
  const { t } = useI18n();
  const role = user?.role as UserRole;
  const shortcuts = role ? getRoleNavShortcuts(role) : [];
  const coreNav = shortcuts.filter((s) => CORE_IDS.has(s.id));
  const workspaceNav = shortcuts.filter((s) => !CORE_IDS.has(s.id));

  const labelFor = (id: string, fallback: string) => {
    if (id === 'home') return t('nav.dashboard');
    if (id === 'notifications') return t('nav.notifications');
    if (id === 'profile') return t('nav.profile');
    return fallback;
  };

  const renderLink = (item: (typeof shortcuts)[0]) => (
    <NavLink
      key={item.id}
      to={item.href}
      end={item.id === 'home'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors duration-200',
          isActive
            ? 'bg-white text-bekem-navy'
            : 'text-white/65 hover:text-white hover:bg-white/10'
        )
      }
    >
      <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
      <span className="flex-1 truncate">{labelFor(item.id, item.label)}</span>
      {item.id === 'notifications' && unread > 0 && (
        <span className="min-w-[20px] h-5 px-1.5 rounded-md bg-white text-bekem-navy text-[10px] font-bold flex items-center justify-center shrink-0">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </NavLink>
  );

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-[232px] lg:shrink-0 bg-surface-sidebar lg:sticky lg:top-0 lg:h-screen border-r border-bekem-navy-dark/30">
      <div className="px-4 pt-4 pb-3 border-b border-white/10">
        <BekemLogo variant="light" size="sm" />
      </div>

      <nav className="flex-1 px-2 pt-3 overflow-y-auto sidebar-scroll" aria-label="Main navigation">
        <div className="space-y-1">{coreNav.map(renderLink)}</div>

        {workspaceNav.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-2.5 pb-1.5">
              Workspace
            </p>
            <div className="space-y-1">{workspaceNav.map(renderLink)}</div>
          </div>
        )}
      </nav>

      <div className="p-3 mt-auto shrink-0 border-t border-white/10">
        {user && (
          <div className="rounded-lg bg-white/8 border border-white/10 p-2.5 mb-2">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-lg bg-white/15 flex items-center justify-center text-white text-sm font-bold shrink-0"
                style={user.avatarColor ? { backgroundColor: user.avatarColor } : undefined}
              >
                {user.name?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{getFirstName(user.name)}</p>
                <p
                  className={cn(
                    'text-[11px] font-medium mt-0.5 truncate',
                    role === UserRole.CHAIRMAN ? 'text-gold' : 'text-white/60'
                  )}
                >
                  {ROLE_LABELS[role]}
                </p>
              </div>
            </div>
          </div>
        )}

        {import.meta.env.DEV && (
          <button
            type="button"
            disabled={signingOut}
            onClick={() => signOut()}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 mb-1.5 text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Switch role
          </button>
        )}

        <button
          type="button"
          disabled={signingOut}
          onClick={() => signOut()}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-white/50 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          {signingOut ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LogOut className="h-3.5 w-3.5" />
          )}
          {signingOut ? t('nav.signingOut') : t('nav.signOut')}
        </button>
      </div>
    </aside>
  );
}
