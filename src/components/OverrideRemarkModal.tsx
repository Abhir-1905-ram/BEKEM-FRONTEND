import { useState } from 'react';
import { cn } from '@/lib/utils';

const MAX = 300;
const MIN = 30;

interface OverrideRemarkModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (remark: string) => void;
  pending?: boolean;
}

export function OverrideRemarkModal({ open, onClose, onSubmit, pending }: OverrideRemarkModalProps) {
  const [remark, setRemark] = useState('');

  if (!open) return null;

  const remaining = MAX - remark.length;
  const valid = remark.trim().length >= MIN && remark.length <= MAX;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-3 shadow-xl">
        <h3 className="font-semibold text-ink">Approve in Chairman&apos;s absence</h3>
        <p className="text-xs text-ink-secondary mt-1">
          This action is permanently recorded. Explain why the Chairman could not approve (minimum{' '}
          {MIN} characters).
        </p>
        <textarea
          className="mt-4 w-full rounded-xl border border-surface-border px-3 py-2 text-sm min-h-[120px]"
          value={remark}
          maxLength={MAX}
          placeholder="Chairman is travelling / not on premises…"
          onChange={(e) => setRemark(e.target.value.slice(0, MAX))}
        />
        <p
          className={cn(
            'text-xs mt-1 tabular-nums',
            remark.trim().length < MIN
              ? 'text-danger font-semibold'
              : remaining <= 30
                ? 'text-amber-700 font-semibold'
                : 'text-ink-muted'
          )}
        >
          {remark.trim().length < MIN
            ? `${MIN - remark.trim().length} more characters required`
            : `${remaining} characters remaining`}
        </p>
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            className="flex-1 h-10 rounded-xl border border-surface-border text-sm font-medium"
            onClick={() => {
              setRemark('');
              onClose();
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!valid || pending}
            className="flex-1 h-10 rounded-xl bg-amber-600 text-white text-sm font-semibold disabled:opacity-50"
            onClick={() => onSubmit(remark.trim())}
          >
            Confirm override approval
          </button>
        </div>
      </div>
    </div>
  );
}
