import { useEffect } from 'react';

type ApprovalShortcuts = {
  onApprove?: () => void;
  onReject?: () => void;
  enabled?: boolean;
};

/**
 * Keyboard shortcuts for approval flows: A = approve, R = reject (when not typing in inputs).
 */
export function useApprovalShortcuts({ onApprove, onReject, enabled = true }: ApprovalShortcuts) {
  useEffect(() => {
    if (!enabled) return;

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === 'a' && onApprove) {
        e.preventDefault();
        onApprove();
      } else if (key === 'r' && onReject) {
        e.preventDefault();
        onReject();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onApprove, onReject, enabled]);
}
