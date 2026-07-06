import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-7 w-full rounded border border-surface-border bg-white px-2 text-xs text-ink',
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
      'flex min-h-[48px] w-full rounded border border-surface-border bg-white px-2 py-1 text-xs text-ink',
      'placeholder:text-ink-muted transition-colors resize-none',
      'focus:outline-none focus:ring-2 focus:ring-bekem-navy/15 focus:border-bekem-navy/30',
      className
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
