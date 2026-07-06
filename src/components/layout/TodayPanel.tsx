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
  const safeActions = actions ?? [];

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

  const primary = safeActions[0];

  return (
    <section className="section-gap animate-slide-up" aria-label="Today's priorities">
      <div className="flex items-center gap-1.5 mb-2">
        <ListTodo className="h-3.5 w-3.5 text-bekem-accent" strokeWidth={2} />
        <h2 className="section-label">{t('today.title')}</h2>
      </div>

      {primary && (
        <button
          type="button"
          onClick={() => goToAction(primary.href, navigate, location.pathname)}
          className={cn(
            'w-full text-left rounded-lg border-2 border-bekem-accent bg-bekem-accent-soft/40 p-3 mb-2',
            'transition-colors duration-200 hover:bg-bekem-accent-soft/70',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bekem-accent'
          )}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest text-bekem-accent mb-1">
            Top priority
          </p>
          <p className="text-sm font-semibold text-ink">{primary.title}</p>
          <p className="text-xs text-ink-secondary mt-0.5">{primary.subtitle}</p>
          <span className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-bekem-accent">
            Go now <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </button>
      )}

      {safeActions.length > 1 && (
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
              {safeActions.slice(1, 5).map((action) => (
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
