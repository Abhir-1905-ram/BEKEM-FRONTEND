import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { MaterialRequestDto } from '@afios/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { downloadExport } from '@/lib/downloadExport';

function lineItems(mr: MaterialRequestDto) {
  if (mr.items?.length) return mr.items;
  if (mr.materialId || mr.material) {
    return [
      {
        materialId: mr.materialId || mr.material?.id,
        quantityRequested: mr.quantityRequested,
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

export function IssueMaterialPage() {
  const [selected, setSelected] = useState<MaterialRequestDto | null>(null);
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [attachments, setAttachments] = useState<IssueAttachment[]>([]);
  const [lastIssue, setLastIssue] = useState<{ id: string; issueNumber: string } | null>(null);
  const docRef = useRef<HTMLInputElement>(null);

  const { data: indents, refetch } = useQuery({
    queryKey: ['ready-to-issue'],
    queryFn: async () => {
      const res = await api.get<{ data: MaterialRequestDto[] }>('/material-requests', {
        params: { status: 'MATERIAL_RECEIVED,CHAIRMAN_APPROVED,ALLOCATED' },
      });
      return res.data.data;
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
      const items = lineItems(selected!);
      const line = items[0];
      const materialId = line.materialId || line.material?.id;
      if (!materialId) throw new Error('No material');
      const res = await api.post<{
        data: { issue: { id: string; issueNumber: string } };
      }>('/material-issues', {
        materialRequestId: selected!.id,
        items: [{ materialId, quantity: parseFloat(qty) }],
        note,
        attachments,
      });
      return res.data.data.issue;
    },
    onSuccess: (issueData) => {
      toast.success('Material issued — site will confirm receipt');
      setLastIssue(issueData);
      setSelected(null);
      setQty('');
      setNote('');
      setAttachments([]);
      refetch();
    },
    onError: (e: Error) => toast.error(e.message || 'Issue failed'),
  });

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
        !indents?.length ? (
          <EmptyState
            title="Nothing ready to issue"
            description="After verifying delivery, complete Material receipt (GRN), or allocate stock from pending indents."
          />
        ) : (
          <div className="space-y-2">
            {indents.map((mr) => (
              <button
                key={mr.id}
                type="button"
                onClick={() => {
                  setSelected(mr);
                  const items = lineItems(mr);
                  setQty(String(items[0]?.quantityRequested ?? ''));
                }}
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
        )
      ) : (
        <div className="panel p-5 space-y-4">
          <p className="font-semibold">{selected.indentNumber}</p>
          <Input
            type="number"
            placeholder="Issue quantity"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
          <Input
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
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
            <p className="text-xs text-ink-muted mt-1">
              Delivery challan, signed copy, or site handover proof (filename recorded on issue slip).
            </p>
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
            <Button variant="primary" disabled={!qty || issue.isPending} onClick={() => issue.mutate()}>
              Issue material
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
