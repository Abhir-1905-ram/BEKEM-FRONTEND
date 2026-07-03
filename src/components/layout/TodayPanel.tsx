import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
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

  if (loading) {
    return (
      <div className="rounded-3xl border border-surface-border bg-white p-8 mb-8 animate-pulse">
        <div className="h-4 w-40 bg-surface-muted rounded mb-6" />
        <div className="space-y-3">
          <div className="h-20 bg-surface-muted rounded-2xl" />
          <div className="h-16 bg-surface-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!actions.length) return null;

  const primary = actions[0];

  return (
    <section className="mb-8 lg:mb-10" aria-label="Today's priorities">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-bekem-accent" strokeWidth={2} />
        <h2 className="section-label">{t('today.title')}</h2>
      </div>

      {primary && (
        <button
          type="button"
          onClick={() => goToAction(primary.href, navigate, location.pathname)}
          className={cn(
            'w-full text-left rounded-3xl p-8 mb-3 transition-all duration-200',
            'bg-gradient-to-br from-bekem-navy to-bekem-navy-light text-white shadow-card-hover',
            'hover:-translate-y-1',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bekem-accent'
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-2">
            Top priority
          </p>
          <p className="text-xl font-semibold">{primary.title}</p>
          <p className="text-sm text-white/65 mt-2">{primary.subtitle}</p>
          <span className="inline-flex items-center gap-2 mt-5 text-sm font-semibold text-white">
            Go now <ArrowRight className="h-4 w-4" />
          </span>
        </button>
      )}

      {actions.length > 1 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {actions.slice(1, 4).map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => goToAction(action.href, navigate, location.pathname)}
              className="action-card p-5 group"
            >
              <span className="action-card-strip bg-bekem-accent" aria-hidden />
              <p className="font-semibold text-ink text-[15px] pl-2">{action.title}</p>
              <p className="text-sm text-ink-muted mt-1 pl-2">{action.subtitle}</p>
              <span className="inline-flex items-center gap-1 mt-3 pl-2 text-xs font-semibold text-bekem-accent opacity-0 group-hover:opacity-100 transition-opacity">
                Go now <ArrowRight className="h-3 w-3" />
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
