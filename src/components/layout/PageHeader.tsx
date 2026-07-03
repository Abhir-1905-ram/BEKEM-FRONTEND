import { type ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ eyebrow, title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 lg:mb-10">
      <div>
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-2">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[22px] lg:text-[26px] font-semibold text-ink tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-[15px] text-ink-secondary mt-2 max-w-xl leading-relaxed">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
