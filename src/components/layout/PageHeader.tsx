import { type ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ eyebrow, title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-3 lg:mb-4">
      <div>
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-1">
            {eyebrow}
          </p>
        )}
        <h1 className="text-lg lg:text-xl font-semibold text-ink tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-ink-secondary mt-1 max-w-xl">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
