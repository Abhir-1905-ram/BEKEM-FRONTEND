import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bekem-accent/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-bekem-accent text-white hover:bg-bekem-accent-hover shadow-sm hover:shadow-md',
        accent:
          'bg-bekem-accent text-white hover:bg-bekem-accent-hover shadow-sm hover:shadow-md',
        secondary:
          'bg-white text-ink border border-surface-border hover:bg-surface-muted shadow-sm',
        ghost: 'hover:bg-surface-muted text-ink-secondary hover:text-ink',
        destructive: 'bg-danger text-white hover:bg-danger-dark shadow-sm',
        success: 'bg-success text-white hover:bg-success-dark shadow-sm',
      },
      size: {
        sm: 'h-9 px-3.5 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-11 px-5 text-[15px]',
        xl: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
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
