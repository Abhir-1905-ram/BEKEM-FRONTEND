import { BRAND_COMPANY } from '@/lib/brand';
import { cn } from '@/lib/utils';

interface BekemLogoProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md';
  className?: string;
}

export function BekemLogo({ variant = 'dark', size = 'md', className }: BekemLogoProps) {
  const isLight = variant === 'light';
  return (
    <div className={cn('flex flex-col', className)}>
      <div className={cn('flex items-baseline gap-1', size === 'sm' ? 'text-base' : 'text-lg')}>
        <span
          className={cn(
            'font-extrabold tracking-tight',
            isLight ? 'text-white' : 'text-bekem-navy'
          )}
        >
          Bekem
        </span>
        <span
          className={cn('font-bold', isLight ? 'text-white/90' : 'text-bekem-accent')}
        >
          OS
        </span>
      </div>
      {size === 'md' && (
        <span
          className={cn(
            'text-[10px] font-medium tracking-wide mt-0.5',
            isLight ? 'text-white/40' : 'text-ink-muted'
          )}
        >
          {BRAND_COMPANY}
        </span>
      )}
    </div>
  );
}

export function BekemMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'h-10 w-10 rounded-xl bg-bekem-accent flex items-center justify-center shrink-0 shadow-lg shadow-bekem-accent/30',
        className
      )}
      aria-hidden
    >
      <span className="text-white text-base font-extrabold">B</span>
    </div>
  );
}
