import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, subtitle, children, className }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-ink/30"
        onClick={onClose}
        aria-label="Close dialog"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          'relative w-full max-w-lg rounded-lg border border-surface-border bg-white animate-slide-up',
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-surface-border">
          <div>
            <h2 id="modal-title" className="text-lg font-semibold text-ink">
              {title}
            </h2>
            {subtitle && <p className="text-sm text-ink-secondary mt-1">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl text-ink-muted hover:bg-surface-muted hover:text-ink transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
