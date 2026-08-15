import { cn } from '@/lib/utils';

type EmailStatus = 'pending' | 'queued' | 'sent' | 'failed' | 'skipped';

const LABELS: Record<EmailStatus, string> = {
  pending: 'Email pending',
  queued: 'Queued (SMTP off)',
  sent: 'Email sent',
  failed: 'Email failed',
  skipped: 'Email skipped',
};

const TONES: Record<EmailStatus, string> = {
  pending: 'bg-surface-muted text-ink-secondary',
  queued: 'bg-amber-50 text-amber-800 border-amber-200',
  sent: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  failed: 'bg-red-50 text-red-800 border-red-200',
  skipped: 'bg-surface-muted text-ink-muted',
};

interface PoEmailStatusChipProps {
  status?: string | null;
  sentAt?: string | null;
  className?: string;
}

export function PoEmailStatusChip({ status, sentAt, className }: PoEmailStatusChipProps) {
  if (!status) return null;
  const key = status as EmailStatus;
  const label =
    key === 'sent' && sentAt
      ? `${LABELS.sent} · ${new Date(sentAt).toLocaleDateString('en-IN')}`
      : LABELS[key] ?? status;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        TONES[key] ?? TONES.pending,
        className
      )}
    >
      {label}
    </span>
  );
}
