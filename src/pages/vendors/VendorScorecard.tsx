import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Star } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency } from '@afios/shared';
import type { VendorScorecardDto } from '@afios/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';

export function VendorScorecardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deliveryScore, setDeliveryScore] = useState(4);
  const [qualityScore, setQualityScore] = useState(4);
  const [note, setNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-scorecard', id],
    queryFn: async () => {
      const res = await api.get<{ data: VendorScorecardDto }>(`/vendors/${id}/scorecard`);
      return res.data.data;
    },
    enabled: !!id,
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ data: VendorScorecardDto }>(`/vendors/${id}/reviews`, {
        deliveryScore,
        qualityScore,
        note,
      });
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Vendor review submitted');
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['vendor-scorecard', id] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });

  if (isLoading || !data) return <DashboardSkeleton />;

  const { vendor, metrics, recentOrders, reviews } = data;
  const displayRating = metrics.compositeRating ?? vendor.rating;

  return (
    <div className="page-container max-w-3xl">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-ink-secondary hover:text-ink mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <PageHeader
        title={vendor.name}
        subtitle={`${vendor.category} · ${vendor.contactInfo}`}
        action={
          <div className="flex items-center gap-1 text-bekem-accent font-bold">
            <Star className="h-5 w-5 fill-current" />
            {displayRating.toFixed(1)}
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Purchase orders" value={metrics.poCount} tone="blue" />
        <StatCard label="Total spend" value={formatCurrency(metrics.totalSpend)} tone="violet" />
        <StatCard label="Fulfillment" value={`${metrics.onTimeDeliveryPct}%`} tone="teal" />
        <StatCard label="Rejected POs" value={metrics.rejectedCount} tone="amber" />
      </div>

      {recentOrders.length > 0 && (
        <section className="panel p-5 mb-6">
          <h2 className="text-sm font-bold text-ink mb-3">Recent approved orders</h2>
          <div className="space-y-2">
            {recentOrders.map((po) => (
              <div
                key={po.id}
                className="flex justify-between items-center text-sm py-2 border-b border-surface-border last:border-0"
              >
                <span className="font-medium text-ink">{po.poNumber}</span>
                <span className="text-ink-secondary">{formatCurrency(po.amount)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="panel p-5 mb-6">
        <h2 className="text-sm font-bold text-ink mb-4">Submit review</h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-semibold text-ink-muted mb-1 block">Delivery (1–5)</label>
            <Input
              type="number"
              min={1}
              max={5}
              value={deliveryScore}
              onChange={(e) => setDeliveryScore(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-muted mb-1 block">Quality (1–5)</label>
            <Input
              type="number"
              min={1}
              max={5}
              value={qualityScore}
              onChange={(e) => setQualityScore(Number(e.target.value))}
            />
          </div>
        </div>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional notes on vendor performance…"
          className="mb-4"
        />
        <Button
          variant="accent"
          disabled={reviewMutation.isPending}
          onClick={() => reviewMutation.mutate()}
        >
          {reviewMutation.isPending ? 'Submitting…' : 'Submit review'}
        </Button>
      </section>

      {reviews.length > 0 && (
        <section className="panel p-5">
          <h2 className="text-sm font-bold text-ink mb-3">Review history</h2>
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-xl bg-surface-muted p-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-ink">{r.ratedByName}</span>
                  <span className="text-ink-muted">{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-ink-secondary">
                  Delivery {r.deliveryScore}/5 · Quality {r.qualityScore}/5
                </p>
                {r.note && <p className="text-sm text-ink mt-1">{r.note}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
