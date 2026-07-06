import { type ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ eyebrow, title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1.5 mb-2 lg:mb-3">
      <div>
        {eyebrow && (
          <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted mb-0.5">
            {eyebrow}
          </p>
        )}
        <h1 className="text-base lg:text-lg font-semibold text-ink tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-xs text-ink-secondary mt-0.5 max-w-xl">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
