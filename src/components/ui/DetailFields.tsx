import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function DetailFieldGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap gap-x-6 gap-y-3', className)}>{children}</div>
  );
}

export function DetailField({
  label,
  children,
  className,
  fullWidth,
  labelClassName,
  valueClassName,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
  labelClassName?: string;
  valueClassName?: string;
}) {
  return (
    <div
      className={cn(
        'min-w-[8rem] max-w-full shrink-0',
        fullWidth && 'w-full basis-full',
        className
      )}
    >
      <p className={cn('text-xs text-ink-muted', labelClassName)}>{label}</p>
      <div className={cn('font-medium', valueClassName)}>{children}</div>
    </div>
  );
}

export function DetailFieldRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-4 gap-y-1', className)}>
      {children}
    </div>
  );
}

export function DetailFieldInline({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('text-xs text-ink-muted', className)}>
      <span className="font-semibold">{label}:</span> {children}
    </span>
  );
}
