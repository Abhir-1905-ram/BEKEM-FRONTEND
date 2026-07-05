import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { ISSUE_REASON_LABELS, type IssueReason, type MaterialRequestDto } from '@afios/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StockComparisonTable } from '@/components/StockComparisonTable';
import { downloadExport } from '@/lib/downloadExport';

function lineItems(mr: MaterialRequestDto) {
  if (mr.items?.length) return mr.items;
  if (mr.materialId || mr.material) {
    return [
      {
        id: mr.id,
        materialId: mr.materialId || mr.material?.id || '',
        quantityRequested: mr.quantityRequested || 0,
        material: mr.material,
      },
    ];
  }
  return [];
}

interface IssueAttachment {
  name: string;
  fileType: string;
  category?: string;
}

const REASONS = Object.entries(ISSUE_REASON_LABELS) as [IssueReason, string][];

export function IssueMaterialPage() {
  const [selected, setSelected] = useState<MaterialRequestDto | null>(null);
  const [reason, setReason] = useState<IssueReason | ''>('');
  const [reasonOther, setReasonOther] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [note, setNote] = useState('');
  const [attachments, setAttachments] = useState<IssueAttachment[]>([]);
  const [lastIssue, setLastIssue] = useState<{ id: string; issueNumber: string } | null>(null);
  const docRef = useRef<HTMLInputElement>(null);

  const { data: indents, list, refetch } = useListQuery({
    queryKey: ['ready-to-issue'],
    queryFn: async () => {
      const res = await api.get<{ data: MaterialRequestDto[] }>('/material-requests', {
        params: { status: 'MATERIAL_RECEIVED,CHAIRMAN_APPROVED,ALLOCATED' },
      });
      return normalizeListData<MaterialRequestDto>(res.data.data);
    },
  });

  const pickFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const added = Array.from(files).map((f) => ({
      name: f.name,
      fileType: f.type || 'application/octet-stream',
      category: 'ISSUE_SLIP',
    }));
    setAttachments((prev) => [...prev, ...added]);
  };

  const issue = useMutation({
    mutationFn: async () => {
      if (!reason) throw new Error('Please select an issue reason');
      if (reason === 'other' && !reasonOther.trim()) {
        throw new Error('Please provide details when reason is Other');
      }
      const res = await api.post<{
        data: { issue: { id: string; issueNumber: string } };
      }>('/material-issues', {
        materialRequestId: selected!.id,
        reason,
        reasonOtherText: reason === 'other' ? reasonOther.trim() : undefined,
        note,
        attachments,
      });
      return res.data.data.issue;
    },
    onSuccess: (issueData) => {
      toast.success('Material issued — site will confirm receipt');
      setLastIssue(issueData);
      setSelected(null);
      setReason('');
      setReasonOther('');
      setReasonError('');
      setNote('');
      setAttachments([]);
      refetch();
    },
    onError: (e: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(e.response?.data?.message || e.message || 'Issue failed');
    },
  });

  const submitIssue = () => {
    if (!reason) {
      setReasonError('Issue reason is required');
      return;
    }
    if (reason === 'other' && !reasonOther.trim()) {
      setReasonError('Please provide details when reason is Other');
      return;
    }
    setReasonError('');
    issue.mutate();
  };

  const downloadSlip = async () => {
    if (!lastIssue) return;
    try {
      await downloadExport(
        `/exports/material-issues/${lastIssue.id}.pdf`,
        `${lastIssue.issueNumber}.pdf`
      );
      toast.success('Issue slip downloaded');
    } catch {
      toast.error('Could not download issue slip');
    }
  };

  return (
    <div className="page-container max-w-lg">
      <PageHeader
        title="Issue to site"
        subtitle="Issue material against indent and generate issue slip"
      />

      {lastIssue && (
        <div className="panel p-4 mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">{lastIssue.issueNumber}</p>
            <p className="text-sm text-ink-secondary">Issue slip ready to print</p>
          </div>
          <Button variant="secondary" onClick={downloadSlip}>
            Download PDF
          </Button>
        </div>
      )}

      {!selected ? (
        <ListQueryBoundary
          isLoading={list.isLoading}
          isError={list.isError}
          onRetry={list.onRetry}
          retrying={list.retrying}
          isEmpty={!indents?.length}
          empty={
            <EmptyState
              title="Nothing ready to issue"
              description="After verifying delivery, complete Material receipt (GRN), or allocate stock from pending indents."
            />
          }
        >
          <div className="space-y-2">
            {(indents ?? []).map((mr) => (
              <button
                key={mr.id}
                type="button"
                onClick={() => setSelected(mr)}
                className="panel w-full p-4 text-left"
              >
                <div className="flex justify-between gap-2">
                  <p className="font-semibold">{mr.indentNumber}</p>
                  <StatusBadge status={mr.status} />
                </div>
                <p className="text-sm text-ink-secondary mt-1">{mr.purpose}</p>
              </button>
            ))}
          </div>
        </ListQueryBoundary>
      ) : (
        <div className="space-y-4">
          <div className="panel p-5">
            <p className="font-semibold mb-4">{selected.indentNumber}</p>
            <StockComparisonTable items={lineItems(selected)} />
          </div>

          <div className="panel p-5 space-y-4">
            <div>
              <label className="text-sm font-medium text-ink-secondary block mb-2">
                Issue reason <span className="text-danger">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value as IssueReason | '');
                  if (e.target.value) setReasonError('');
                }}
                className="w-full border border-surface-border rounded-xl px-3 py-2.5 text-sm bg-white"
              >
                <option value="">Select reason…</option>
                {REASONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {reasonError && <p className="text-xs text-danger mt-1">{reasonError}</p>}
            </div>

            {reason === 'other' && (
              <Textarea
                value={reasonOther}
                onChange={(e) => setReasonOther(e.target.value)}
                placeholder="Describe the reason…"
              />
            )}

            <Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />

            <div>
              <p className="text-sm font-medium text-ink-secondary mb-2">Upload documents</p>
              <input
                ref={docRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                className="block w-full text-sm"
                onChange={(e) => pickFiles(e.target.files)}
              />
              {attachments.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {attachments.map((a, i) => (
                    <li key={i} className="text-xs text-ink-secondary flex justify-between gap-2">
                      <span>{a.name}</span>
                      <button
                        type="button"
                        className="text-danger"
                        onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setSelected(null)}>
                Back
              </Button>
              <Button variant="primary" disabled={issue.isPending} onClick={submitIssue}>
                Issue material
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
