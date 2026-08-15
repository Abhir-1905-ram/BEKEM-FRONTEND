import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TodayActionDto } from '@afios/shared';
import { useI18n } from '@/i18n/I18nContext';

interface TodayPanelProps {
  actions: TodayActionDto[];
  loading?: boolean;
}

function goToAction(href: string, navigate: ReturnType<typeof useNavigate>, pathname: string) {
  const hashIndex = href.indexOf('#');
  const path = hashIndex >= 0 ? href.slice(0, hashIndex) || pathname : href;
  const hash = hashIndex >= 0 ? href.slice(hashIndex + 1) : '';

  if (hash && path === pathname) {
    const el = document.getElementById(hash);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
  }

  navigate(href);
}

export function TodayPanel({ actions, loading }: TodayPanelProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const safeActions = (actions ?? []).filter((a) => a && typeof a.id === 'string');

  if (loading) {
    return (
      <div className="panel p-3 section-gap animate-pulse">
        <div className="h-3 w-32 bg-surface-muted rounded mb-2" />
        <div className="space-y-2">
          <div className="h-14 bg-surface-muted rounded-lg" />
          <div className="h-12 bg-surface-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (!safeActions.length) return null;

  // Feature the first high-priority items side-by-side (e.g. Verify POs + Material receipt).
  const highPriority = safeActions.filter((a) => a.priority === 'high');
  const featured =
    highPriority.length >= 2 ? highPriority.slice(0, 2) : safeActions.slice(0, 1);
  const featuredIds = new Set(featured.map((a) => a.id));
  const rest = safeActions.filter((a) => !featuredIds.has(a.id)).slice(0, 5);

  return (
    <section className="section-gap animate-slide-up" aria-label="Today's priorities">
      <div className="flex items-center gap-1.5 mb-2">
        <ListTodo className="h-3.5 w-3.5 text-bekem-accent" strokeWidth={2} />
        <h2 className="section-label">{t('today.title')}</h2>
      </div>

      {featured.length > 0 && (
        <div
          className={cn(
            'grid gap-2 mb-2',
            featured.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
          )}
        >
          {featured.map((action, index) => (
            <button
              key={action.id}
              type="button"
              onClick={() => goToAction(action.href, navigate, location.pathname)}
              className={cn(
                'w-full text-left rounded-lg border-2 border-bekem-accent bg-bekem-accent-soft/40 p-3',
                'transition-colors duration-200 hover:bg-bekem-accent-soft/70',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bekem-accent'
              )}
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-bekem-accent mb-1">
                {featured.length > 1
                  ? index === 0
                    ? 'Top priority'
                    : 'Also today'
                  : 'Top priority'}
              </p>
              <p className="text-sm font-semibold text-ink">{action.title}</p>
              <p className="text-xs text-ink-secondary mt-0.5">{action.subtitle}</p>
              <span className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-bekem-accent">
                Go now <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
        </div>
      )}

      {rest.length > 0 && (
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Task</th>
                <th className="hidden sm:table-cell">Details</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {rest.map((action) => (
                <tr
                  key={action.id}
                  className="cursor-pointer"
                  onClick={() => goToAction(action.href, navigate, location.pathname)}
                >
                  <td className="font-semibold">{action.title}</td>
                  <td className="hidden sm:table-cell text-ink-secondary">{action.subtitle}</td>
                  <td className="text-right">
                    <ArrowRight className="h-3.5 w-3.5 text-ink-muted inline-block" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
