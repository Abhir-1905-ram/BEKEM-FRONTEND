import { BRAND_COMPANY } from '@/lib/brand';
import { cn } from '@/lib/utils';

const LOGO_SRC = '/bekem-logo.png';

interface BekemLogoProps {
  /** `light` = white backing on dark chrome (sidebar, login panel) */
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASS = {
  sm: 'h-9',
  md: 'h-11',
  lg: 'h-14',
} as const;

export function BekemLogo({ variant = 'dark', size = 'md', className }: BekemLogoProps) {
  return (
    <img
      src={LOGO_SRC}
      alt={BRAND_COMPANY}
      className={cn(
        'w-auto max-w-full object-contain object-left',
        SIZE_CLASS[size],
        variant === 'light' && 'rounded-md bg-white px-2 py-1 border border-white/20',
        className
      )}
    />
  );
}

/** Compact mark for tight spaces — crops to the BEKEM wordmark block */
export function BekemMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white border border-surface-border',
        className
      )}
      aria-hidden
    >
      <img
        src={LOGO_SRC}
        alt=""
        className="h-full w-[180%] max-w-none object-contain object-left"
      />
    </div>
  );
}
