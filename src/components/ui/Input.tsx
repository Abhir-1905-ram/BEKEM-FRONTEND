import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-card border border-surface-border bg-white px-3 text-sm text-ink',
        'placeholder:text-ink-muted transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-bekem-navy/15 focus:border-bekem-navy/30',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[96px] w-full rounded-card border border-surface-border bg-white px-3 py-2.5 text-sm text-ink',
      'placeholder:text-ink-muted transition-colors resize-none',
      'focus:outline-none focus:ring-2 focus:ring-bekem-navy/15 focus:border-bekem-navy/30',
      className
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
