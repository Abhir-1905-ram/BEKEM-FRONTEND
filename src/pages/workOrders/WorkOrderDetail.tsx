import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import {
  ROLE_COLORS,
  UserRole,
  formatCurrency,
  type WorkOrderDto,
  type DelegationStatusDto,
} from '@afios/shared';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatusTimeline } from '@/components/StatusTimeline';
import { Input, Textarea } from '@/components/ui/Input';
import { SuccessScreen } from '@/components/SuccessScreen';
import { forbiddenQueryOptions, isForbiddenError, useRedirectOnForbidden } from '@/lib/forbiddenRedirect';
import { getRoleHomePath } from '@/lib/rolePaths';
import { downloadExport } from '@/lib/downloadExport';

export function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user)!;
  const role = user.role as UserRole;
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);
  const [doneMessage, setDoneMessage] = useState('');

  const [certQty, setCertQty] = useState('');
  const [certNote, setCertNote] = useState('');
  const [certEvidence, setCertEvidence] = useState('');
  const [issueMaterialId, setIssueMaterialId] = useState('');
  const [issueQty, setIssueQty] = useState('');
  const [progressQty, setProgressQty] = useState('');
  const [exporting, setExporting] = useState(false);

  const accent =
    role === UserRole.COORDINATOR
      ? ROLE_COLORS[UserRole.COORDINATOR].primary
      : role === UserRole.CHAIRMAN
        ? ROLE_COLORS[UserRole.CHAIRMAN].primary
        : ROLE_COLORS[UserRole.EXECUTIVE].primary;

  const { data: delegationStatus } = useQuery({
    queryKey: ['delegation-status'],
    queryFn: async () => {
      const res = await api.get<{ data: DelegationStatusDto }>('/delegations/status');
      return res.data.data;
    },
  });

  const { data: wo, isLoading, isError, error } = useQuery({
    queryKey: ['work-order', id],
    queryFn: async () => {
      const res = await api.get<{ data: WorkOrderDto }>(`/work-orders/${id}`);
      return res.data.data;
    },
    enabled: !!id,
    ...forbiddenQueryOptions,
  });

  const { data: stock } = useQuery({
    queryKey: ['stock-for-wo', wo?.siteId],
    queryFn: async () => {
      const res = await api.get<{
        data: Array<{
          materialId: string;
          quantityOnHand: number;
          material: { name: string; unit: string };
        }>;
      }>(`/stock/site/${wo!.siteId}`);
      return res.data.data;
    },
    enabled: !!wo?.siteId && role === UserRole.STORE_INCHARGE,
  });

  useRedirectOnForbidden(error);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['work-order', id] });
    queryClient.invalidateQueries({ queryKey: ['wo-queue'] });
  };

  const verify = useMutation({
    mutationFn: (action: 'APPROVE' | 'RETURN') =>
      api.post(`/work-orders/${id}/verify`, { action, note }),
    onSuccess: (_, action) => {
      setDoneMessage(action === 'APPROVE' ? 'Verified and sent to Chairman' : 'Returned to Executive');
      setDone(true);
    },
    onError: () => toast.error('Verification failed'),
    onSettled: invalidate,
  });

  const approve = useMutation({
    mutationFn: () => api.post(`/work-orders/${id}/approve`, { note }),
    onSuccess: () => {
      setDoneMessage('Work order approved — awaiting contractor acceptance');
      setDone(true);
    },
    onError: () => toast.error('Approval failed'),
    onSettled: invalidate,
  });

  const reject = useMutation({
    mutationFn: () => api.post(`/work-orders/${id}/reject`, { note }),
    onSuccess: () => {
      setDoneMessage('Work order rejected');
      setDone(true);
    },
    onError: () => toast.error('Rejection failed'),
    onSettled: invalidate,
  });

  const accept = useMutation({
    mutationFn: () => api.post(`/work-orders/${id}/accept`, { note }),
    onSuccess: () => {
      setDoneMessage('Contractor acceptance recorded — work can now start');
      setDone(true);
    },
    onError: () => toast.error('Failed to record acceptance'),
    onSettled: invalidate,
  });

  const certify = useMutation({
    mutationFn: () =>
      api.post(`/work-orders/${id}/certify`, {
        quantity: parseFloat(certQty),
        note: certNote,
        evidenceNote: certEvidence,
      }),
    onSuccess: () => {
      toast.success('Work certified — pending PM verification');
      setCertQty('');
      setCertNote('');
      setCertEvidence('');
    },
    onError: () => toast.error('Certification failed'),
    onSettled: invalidate,
  });

  const verifyCert = useMutation({
    mutationFn: ({ certId, action }: { certId: string; action: 'VERIFY' | 'REJECT' }) =>
      api.post(`/work-orders/${id}/certifications/${certId}/verify`, { action, pmNote: note }),
    onSuccess: () => toast.success('Certification processed'),
    onError: () => toast.error('Failed to process certification'),
    onSettled: invalidate,
  });

  const issueMaterial = useMutation({
    mutationFn: () =>
      api.post(`/work-orders/${id}/issue-material`, {
        materialId: issueMaterialId,
        quantity: parseFloat(issueQty),
      }),
    onSuccess: () => {
      toast.success('Material issued to work order');
      setIssueMaterialId('');
      setIssueQty('');
    },
    onError: () => toast.error('Material issue failed'),
    onSettled: invalidate,
  });

  const updateProgress = useMutation({
    mutationFn: (payload: { completedQuantity?: number; milestones?: Array<{ id: string; status: string }> }) =>
      api.post(`/work-orders/${id}/progress`, payload),
    onSuccess: () => toast.success('Progress updated'),
    onError: () => toast.error('Failed to update progress'),
    onSettled: invalidate,
  });

  const closeWo = useMutation({
    mutationFn: () => api.post(`/work-orders/${id}/close`, { note }),
    onSuccess: () => {
      setDoneMessage('Work order closed');
      setDone(true);
    },
    onError: () => toast.error('Cannot close work order yet'),
    onSettled: invalidate,
  });

  if (done) {
    return (
      <SuccessScreen
        title="Done!"
        message={doneMessage}
        accentColor={accent}
        primaryAction={{ label: 'Back to home', onClick: () => navigate(getRoleHomePath(role)) }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="px-4 pt-6">
        <div className="h-40 bg-gray-100 rounded-card animate-pulse" />
      </div>
    );
  }

  if (isError && isForbiddenError(error)) return null;
  if (!wo) return null;

  const isCoordinatorVerify =
    role === UserRole.COORDINATOR && wo.status === 'COORDINATOR_PENDING';
  const canFinalApprove =
    wo.status === 'CHAIRMAN_PENDING' &&
    (role === UserRole.COORDINATOR || delegationStatus?.canActAsChairman);
  const canAccept = role === UserRole.EXECUTIVE && wo.status === 'PENDING_ACCEPTANCE';
  const canCertify =
    role === UserRole.SITE_INCHARGE && ['ACCEPTED', 'IN_PROGRESS'].includes(wo.status);
  const canIssue =
    role === UserRole.STORE_INCHARGE && ['ACCEPTED', 'IN_PROGRESS'].includes(wo.status);
  const canTrack =
    role === UserRole.PROJECT_MANAGER && ['ACCEPTED', 'IN_PROGRESS'].includes(wo.status);
  const canClose =
    (role === UserRole.PROJECT_MANAGER || role === UserRole.EXECUTIVE) &&
    wo.status === 'IN_PROGRESS' &&
    wo.progressPercent >= 100;

  const remaining = wo.totalQuantity - wo.completedQuantity;

  const exportPdf = async () => {
    setExporting(true);
    try {
      await downloadExport(`/exports/work-orders/${wo.id}.pdf`, `${wo.woNumber}.pdf`);
      toast.success('Work order exported');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="px-4 pt-4 pb-6 max-w-lg mx-auto">
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-gray-100"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-semibold">{wo.woNumber}</h1>
          <StatusBadge status={wo.status} className="mt-1" />
        </div>
        <Button variant="ghost" size="sm" onClick={exportPdf} disabled={exporting}>
          <Download className="h-4 w-4" />
          PDF
        </Button>
      </header>

      <Card className="space-y-3 mb-6">
        <div>
          <p className="text-xs text-gray-500">Scope</p>
          <p className="font-medium">{wo.scope}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Contractor</p>
          <p className="font-medium">{wo.vendor?.name}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Contract value</p>
          <p className="font-medium text-lg">{formatCurrency(wo.contractValue)}</p>
        </div>
        {wo.purchaseOrder && (
          <div>
            <p className="text-xs text-gray-500">Linked PO</p>
            <p className="font-medium">{wo.purchaseOrder.poNumber}</p>
          </div>
        )}
        {wo.project && (
          <div>
            <p className="text-xs text-gray-500">Project</p>
            <p className="font-medium">
              {wo.project.code} — {wo.project.name}
            </p>
          </div>
        )}
      </Card>

      {['ACCEPTED', 'IN_PROGRESS', 'CLOSED'].includes(wo.status) && (
        <Card className="mb-6">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-xs text-gray-500">Progress</p>
              <p className="font-semibold text-lg">
                {wo.completedQuantity.toLocaleString()} / {wo.totalQuantity.toLocaleString()}{' '}
                {wo.quantityUnit}
              </p>
            </div>
            <span className="text-2xl font-bold text-bekem-accent">{wo.progressPercent}%</span>
          </div>
          <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
            <div
              className="h-full bg-bekem-accent transition-all"
              style={{ width: `${wo.progressPercent}%` }}
            />
          </div>
          {remaining > 0 && (
            <p className="text-xs text-ink-muted mt-2">
              {remaining.toLocaleString()} {wo.quantityUnit} remaining
            </p>
          )}
        </Card>
      )}

      {wo.milestones.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-sm mb-2">Milestones</h2>
          <div className="space-y-2">
            {wo.milestones.map((ms) => (
              <div
                key={ms.id}
                className="flex items-center justify-between rounded-lg border border-surface-border px-3 py-2"
              >
                <span className="text-sm font-medium">{ms.name}</span>
                {canTrack ? (
                  <select
                    value={ms.status}
                    className="text-xs border rounded px-2 py-1"
                    onChange={(e) =>
                      updateProgress.mutate({
                        milestones: [{ id: ms.id, status: e.target.value }],
                      })
                    }
                  >
                    <option value="PENDING">Pending</option>
                    <option value="RUNNING">Running</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                ) : (
                  <StatusBadge status={ms.status} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {wo.materialIssues.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-sm mb-2">Materials issued</h2>
          <div className="space-y-2">
            {wo.materialIssues.map((issue) => (
              <Card key={issue.id} className="py-2 flex justify-between text-sm">
                <span>{issue.materialName}</span>
                <span className="font-medium">
                  {issue.quantity} {issue.materialUnit}
                </span>
              </Card>
            ))}
          </div>
        </div>
      )}

      {wo.certifications.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-sm mb-2">Certifications</h2>
          <div className="space-y-2">
            {wo.certifications.map((cert) => (
              <Card key={cert.id} className="py-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">
                      {cert.quantity} {wo.quantityUnit}
                    </p>
                    <p className="text-xs text-ink-secondary">{cert.note}</p>
                    {cert.evidenceNote && (
                      <p className="text-xs text-ink-muted mt-1">Evidence: {cert.evidenceNote}</p>
                    )}
                  </div>
                  <StatusBadge status={cert.status} />
                </div>
                {canTrack && cert.status === 'PENDING_PM' && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="accent"
                      accentColor={ROLE_COLORS[UserRole.PROJECT_MANAGER].primary}
                      onClick={() => verifyCert.mutate({ certId: cert.id, action: 'VERIFY' })}
                    >
                      Verify
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => verifyCert.mutate({ certId: cert.id, action: 'REJECT' })}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      <h2 className="font-semibold text-sm mb-3">Timeline</h2>
      <StatusTimeline entityType="WorkOrder" entityId={wo.id} />

      {canCertify && (
        <div className="mt-6 space-y-3 border-t border-surface-border pt-6">
          <h2 className="font-semibold text-sm">Certify completed work</h2>
          <Input
            type="number"
            placeholder={`Quantity (${wo.quantityUnit})`}
            value={certQty}
            onChange={(e) => setCertQty(e.target.value)}
          />
          <Textarea
            placeholder="What was completed?"
            value={certNote}
            onChange={(e) => setCertNote(e.target.value)}
          />
          <Input
            placeholder="Evidence note (photos, survey ref…)"
            value={certEvidence}
            onChange={(e) => setCertEvidence(e.target.value)}
          />
          <Button
            variant="accent"
            accentColor={ROLE_COLORS[UserRole.SITE_INCHARGE].primary}
            disabled={!certQty || !certNote.trim() || certify.isPending}
            onClick={() => certify.mutate()}
          >
            Submit certification
          </Button>
        </div>
      )}

      {canIssue && (
        <div className="mt-6 space-y-3 border-t border-surface-border pt-6">
          <h2 className="font-semibold text-sm">Issue material</h2>
          <select
            className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm"
            value={issueMaterialId}
            onChange={(e) => setIssueMaterialId(e.target.value)}
          >
            <option value="">Select material</option>
            {stock?.map((s) => (
              <option key={s.materialId} value={s.materialId}>
                {s.material.name} — {s.quantityOnHand} {s.material.unit} available
              </option>
            ))}
          </select>
          <Input
            type="number"
            placeholder="Quantity"
            value={issueQty}
            onChange={(e) => setIssueQty(e.target.value)}
          />
          <Button
            variant="accent"
            accentColor={ROLE_COLORS[UserRole.STORE_INCHARGE].primary}
            disabled={!issueMaterialId || !issueQty || issueMaterial.isPending}
            onClick={() => issueMaterial.mutate()}
          >
            Issue to work order
          </Button>
        </div>
      )}

      {canTrack && (
        <div className="mt-6 space-y-3 border-t border-surface-border pt-6">
          <h2 className="font-semibold text-sm">Update progress</h2>
          <Input
            type="number"
            placeholder={`Completed quantity (${wo.quantityUnit})`}
            value={progressQty}
            onChange={(e) => setProgressQty(e.target.value)}
          />
          <Button
            variant="secondary"
            disabled={!progressQty || updateProgress.isPending}
            onClick={() =>
              updateProgress.mutate({ completedQuantity: parseFloat(progressQty) })
            }
          >
            Save progress
          </Button>
        </div>
      )}

      {(isCoordinatorVerify || canFinalApprove || canAccept) && (
        <div className="mt-6 space-y-3 border-t border-surface-border pt-6">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note or reason…"
          />
          {isCoordinatorVerify && (
            <div className="flex flex-col gap-2">
              <Button
                variant="accent"
                size="lg"
                accentColor={accent}
                disabled={verify.isPending}
                onClick={() => verify.mutate('APPROVE')}
              >
                Verify & send to Chairman
              </Button>
              <Button
                variant="ghost"
                size="lg"
                disabled={verify.isPending}
                onClick={() => verify.mutate('RETURN')}
              >
                Return to Executive
              </Button>
            </div>
          )}
          {canFinalApprove && (
            <div className="flex flex-col gap-2">
              <Button
                variant="accent"
                size="lg"
                accentColor={accent}
                disabled={approve.isPending}
                onClick={() => approve.mutate()}
              >
                Approve work order
              </Button>
              <Button
                variant="destructive"
                size="lg"
                disabled={!note.trim() || reject.isPending}
                onClick={() => reject.mutate()}
              >
                Reject
              </Button>
            </div>
          )}
          {canAccept && (
            <Button
              variant="accent"
              size="lg"
              accentColor={accent}
              disabled={accept.isPending}
              onClick={() => accept.mutate()}
            >
              Record contractor acceptance
            </Button>
          )}
        </div>
      )}

      {canClose && (
        <div className="mt-6">
          <Button variant="accent" size="lg" className="w-full" onClick={() => closeWo.mutate()}>
            Close work order
          </Button>
        </div>
      )}
    </div>
  );
}
