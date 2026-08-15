import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Star } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@afios/shared';
import type { VendorScorecardDto } from '@afios/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';

export function VendorScorecardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deliveryScore, setDeliveryScore] = useState(4);
  const [qualityScore, setQualityScore] = useState(4);
  const [note, setNote] = useState('');

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
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

  if (!id) return null;

  const { vendor, metrics, recentOrders, reviews } = data ?? {
    vendor: null,
    metrics: null,
    recentOrders: [],
    reviews: [],
  };
  const displayRating = metrics?.compositeRating ?? vendor?.rating ?? 0;
  const clampScore = (v: number) => Math.max(1, Math.min(5, v));

  return (
    <div className="page-container max-w-full">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-ink-secondary hover:text-ink mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <ListQueryBoundary
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        retrying={isFetching && !isLoading}
        isEmpty={!data}
        skeletonRows={8}
        empty={<></>}
      >
        {vendor && metrics && (
          <>
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

      <div className="table-shell mb-4">
        <table className="data-table">
          <thead>
            <tr>
              <th className="num">Purchase orders</th>
              <th className="num">Total spend</th>
              <th className="num">Fulfillment</th>
              <th className="num">Rejected POs</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="num tabular-nums">{metrics.poCount}</td>
              <td className="num tabular-nums whitespace-nowrap">{formatCurrency(metrics.totalSpend)}</td>
              <td className="num tabular-nums">{metrics.onTimeDeliveryPct}%</td>
              <td className="num tabular-nums">{metrics.rejectedCount}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {recentOrders.length > 0 && (
        <section className="panel p-3 mb-3">
          <h2 className="text-sm font-bold text-ink mb-3">Recent approved orders</h2>
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>PO No</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((po) => (
                  <tr key={po.id}>
                    <td className="cell-code whitespace-nowrap">{po.poNumber}</td>
                    <td className="num tabular-nums whitespace-nowrap">{formatCurrency(po.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="panel p-3 mb-3">
        <h2 className="text-sm font-bold text-ink mb-4">Submit review</h2>
        <div className="grid sm:grid-cols-2 gap-2.5 mb-4">
          <div>
            <label className="text-xs font-semibold text-ink-muted mb-1 block">Delivery (1–5)</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => setDeliveryScore(score)}
                  className="p-1 rounded hover:bg-surface-muted"
                  aria-label={`Delivery ${score} star`}
                >
                  <Star
                    className={`h-5 w-5 ${score <= clampScore(deliveryScore) ? 'text-bekem-accent fill-current' : 'text-ink-muted'}`}
                  />
                </button>
              ))}
              <span className="text-xs text-ink-secondary ml-1">{clampScore(deliveryScore)}/5</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-muted mb-1 block">Quality (1–5)</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => setQualityScore(score)}
                  className="p-1 rounded hover:bg-surface-muted"
                  aria-label={`Quality ${score} star`}
                >
                  <Star
                    className={`h-5 w-5 ${score <= clampScore(qualityScore) ? 'text-bekem-accent fill-current' : 'text-ink-muted'}`}
                  />
                </button>
              ))}
              <span className="text-xs text-ink-secondary ml-1">{clampScore(qualityScore)}/5</span>
            </div>
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
        <section className="panel p-3">
          <h2 className="text-sm font-bold text-ink mb-3">Review history</h2>
          <div className="table-shell">
            <table className="data-table min-w-[56rem]">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reviewer</th>
                  <th className="num">Delivery</th>
                  <th className="num">Quality</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap">{formatDate(r.createdAt)}</td>
                    <td className="cell-text whitespace-nowrap">{r.ratedByName}</td>
                    <td className="num tabular-nums">{r.deliveryScore}/5</td>
                    <td className="num tabular-nums">{r.qualityScore}/5</td>
                    <td className="cell-text">{r.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
          </>
        )}
      </ListQueryBoundary>
    </div>
  );
}
