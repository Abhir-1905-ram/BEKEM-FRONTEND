import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bekem-accent/25 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-bekem-accent text-white hover:bg-bekem-accent-hover border border-bekem-accent',
        accent: 'bg-bekem-accent text-white hover:bg-bekem-accent-hover border border-bekem-accent',
        secondary:
          'bg-white text-bekem-accent border border-bekem-accent/40 hover:bg-bekem-accent-soft/50 hover:border-bekem-accent/60',
        ghost: 'hover:bg-surface-muted text-ink-secondary hover:text-ink border border-transparent',
        destructive: 'bg-danger text-white hover:bg-danger-dark border border-danger',
        success: 'bg-success text-white hover:bg-success-dark border border-success',
      },
      size: {
        sm: 'h-6 px-2 text-[11px]',
        md: 'h-7 px-2.5 text-xs',
        lg: 'h-8 px-3 text-xs',
        xl: 'h-9 px-4 text-sm',
        icon: 'h-7 w-7',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  accentColor?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, accentColor, style, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      style={
        (variant === 'accent' || variant === 'primary') && accentColor
          ? { backgroundColor: accentColor, ...style }
          : style
      }
      {...props}
    />
  )
);
Button.displayName = 'Button';
