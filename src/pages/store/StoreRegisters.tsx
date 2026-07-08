import { useState } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@afios/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';
import { cn } from '@/lib/utils';

type RegisterTab = 'inward' | 'outward' | 'stock';

interface GrnRow {
  id: string;
  grnNumber: string;
  poNumber: string;
  indentNumber: string;
  vendorName: string;
  status: string;
  receivedAt: string | null;
}

interface IssueRow {
  id: string;
  issueNumber: string;
  materialRequest?: { indentNumber?: string };
  issuedToName?: string;
  issueType?: string;
  issuedAt?: string;
  createdAt?: string;
  items: Array<{ quantity: number; material?: { name?: string } }>;
}

interface BalanceRow {
  id: string;
  itemCode: string;
  itemDescription: string;
  unit: string;
  totalReceived: number;
  totalIssued: number;
  currentBalance: number;
}

const TABS: Array<{ key: RegisterTab; label: string }> = [
  { key: 'inward', label: 'Inward Register' },
  { key: 'outward', label: 'Outward Register' },
  { key: 'stock', label: 'Stock Register' },
];

export function StoreRegistersPage() {
  const [tab, setTab] = useState<RegisterTab>('inward');

  const inward = useListQuery({
    queryKey: ['register-inward'],
    queryFn: async () => {
      const res = await api.get<{ data: GrnRow[] }>('/goods-receipts');
      return normalizeListData<GrnRow>(res.data.data);
    },
    enabled: tab === 'inward',
  });

  const outward = useListQuery({
    queryKey: ['register-outward'],
    queryFn: async () => {
      const res = await api.get<{ data: IssueRow[] }>('/material-issues');
      return normalizeListData<IssueRow>(res.data.data);
    },
    enabled: tab === 'outward',
  });

  const stock = useListQuery({
    queryKey: ['register-stock'],
    queryFn: async () => {
      const res = await api.get<{ data: BalanceRow[] }>('/stock/balance');
      return normalizeListData<BalanceRow>(res.data.data);
    },
    enabled: tab === 'stock',
  });

  return (
    <div className="page-container max-w-full">
      <PageHeader
        title="Material registers"
        subtitle="Inward (GRNs) · Outward (Issues) · Stock = Inward − Outward"
      />

      <div className="flex gap-1 bg-surface-muted rounded-lg p-1 mb-4 w-full sm:w-fit overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2 text-sm font-semibold rounded-md whitespace-nowrap transition-colors',
              tab === t.key ? 'bg-white text-ink border border-surface-border' : 'text-ink-secondary hover:text-ink'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'inward' && (
        <ListQueryBoundary
          isLoading={inward.list.isLoading}
          isError={inward.list.isError}
          onRetry={inward.list.onRetry}
          retrying={inward.list.retrying}
          isEmpty={!inward.data?.length}
          empty={<EmptyState title="No inward entries" description="GRNs appear here when material is received." />}
        >
          <div className="table-shell">
            <table className="data-table min-w-[56rem]">
              <thead>
                <tr>
                  <th>GRN Number</th>
                  <th>PO Number</th>
                  <th>Indent Number</th>
                  <th>Vendor</th>
                  <th>Material Receipt Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(inward.data ?? []).map((g) => (
                  <tr key={g.id}>
                    <td className="cell-code">{g.grnNumber}</td>
                    <td className="cell-code">{g.poNumber || '—'}</td>
                    <td className="cell-code">{g.indentNumber || '—'}</td>
                    <td className="cell-text">{g.vendorName || '—'}</td>
                    <td className="whitespace-nowrap">{g.receivedAt ? formatDate(g.receivedAt) : '—'}</td>
                    <td>
                      <StatusBadge status={g.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ListQueryBoundary>
      )}

      {tab === 'outward' && (
        <ListQueryBoundary
          isLoading={outward.list.isLoading}
          isError={outward.list.isError}
          onRetry={outward.list.onRetry}
          retrying={outward.list.retrying}
          isEmpty={!outward.data?.length}
          empty={<EmptyState title="No outward entries" description="Material issues appear here after store issue." />}
        >
          <div className="table-shell">
            <table className="data-table min-w-[56rem]">
              <thead>
                <tr>
                  <th>Issue Number</th>
                  <th>Indent Number</th>
                  <th>Issue Type</th>
                  <th>Issued To</th>
                  <th className="num">Lines</th>
                  <th>Material Issue Date</th>
                </tr>
              </thead>
              <tbody>
                {(outward.data ?? []).map((row) => (
                  <tr key={row.id}>
                    <td className="cell-code">{row.issueNumber}</td>
                    <td className="cell-code">{row.materialRequest?.indentNumber || '—'}</td>
                    <td>{row.issueType === 'CONTRACT_ISSUE' ? 'Contract Issue' : 'Work Issue'}</td>
                    <td className="cell-text">{row.issuedToName || '—'}</td>
                    <td className="num">{row.items?.length || 0}</td>
                    <td className="whitespace-nowrap">
                      {formatDate(row.issuedAt || row.createdAt || '')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ListQueryBoundary>
      )}

      {tab === 'stock' && (
        <ListQueryBoundary
          isLoading={stock.list.isLoading}
          isError={stock.list.isError}
          onRetry={stock.list.onRetry}
          retrying={stock.list.retrying}
          isEmpty={!stock.data?.length}
          empty={<EmptyState title="No stock balances" description="Balances update from GRN inward and material issue outward." />}
        >
          <div className="table-shell">
            <table className="data-table min-w-[48rem]">
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Item Description</th>
                  <th>Unit</th>
                  <th className="num">Total Received</th>
                  <th className="num">Total Issued</th>
                  <th className="num">Current Balance</th>
                </tr>
              </thead>
              <tbody>
                {(stock.data ?? []).map((row) => (
                  <tr key={row.id}>
                    <td className="cell-code">{row.itemCode}</td>
                    <td className="cell-text">{row.itemDescription}</td>
                    <td>{row.unit || '—'}</td>
                    <td className="num tabular-nums">{row.totalReceived}</td>
                    <td className="num tabular-nums">{row.totalIssued}</td>
                    <td className="num tabular-nums font-semibold">{row.currentBalance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ListQueryBoundary>
      )}
    </div>
  );
}
