import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, FileBarChart2 } from 'lucide-react';
import { UserRole } from '@afios/shared';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import {
  getReportsForRole,
  reportCategoryLabel,
  resolveReportHref,
  type ReportCategory,
  type ReportDefinition,
} from '@/lib/reportCatalog';

const CATEGORY_ORDER: ReportCategory[] = [
  'inventory',
  'procurement',
  'project',
  'vendor',
  'finance',
  'mis',
  'compliance',
];

export function ReportsHubPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role) as UserRole;
  const reports = useMemo(() => (role ? getReportsForRole(role) : []), [role]);

  const grouped = useMemo(() => {
    const map = new Map<ReportCategory, ReportDefinition[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const report of reports) {
      const list = map.get(report.category) || [];
      list.push(report);
      map.set(report.category, list);
    }
    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      label: reportCategoryLabel(cat),
      items: map.get(cat) || [],
    })).filter((g) => g.items.length);
  }, [reports]);

  if (!role) {
    return (
      <div className="page-container">
        <EmptyState title="Sign in required" description="Open Reports after signing in." />
      </div>
    );
  }

  return (
    <div className="page-container max-w-full">
      <PageHeader
        title="Reports"
        subtitle="SAP-style MIS — inventory, procurement, finance, and compliance for your role"
      />

      <div className="space-y-6">
        {grouped.map((group) => (
          <section key={group.category}>
            <h2 className="section-label mb-2">{group.label}</h2>
            <div className="table-shell">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>Report</th>
                    <th>Description</th>
                    <th className="w-28">Status</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((report) => {
                    const live = report.status === 'live';
                    return (
                      <tr
                        key={report.id}
                        className={live ? 'cursor-pointer' : 'opacity-70'}
                        onClick={() => {
                          if (!live) return;
                          navigate(resolveReportHref(report.href, role));
                        }}
                      >
                        <td className="font-semibold text-ink whitespace-nowrap">
                          <span className="inline-flex items-center gap-2">
                            <FileBarChart2 className="h-4 w-4 text-ink-muted shrink-0" />
                            {report.title}
                          </span>
                        </td>
                        <td className="cell-text text-ink-secondary">{report.description}</td>
                        <td>
                          <span
                            className={
                              live
                                ? 'text-[11px] font-semibold text-emerald-700'
                                : 'text-[11px] font-semibold text-ink-muted'
                            }
                          >
                            {live ? 'Live' : 'Coming soon'}
                          </span>
                        </td>
                        <td className="text-right">
                          {live ? (
                            <ChevronRight className="h-4 w-4 text-ink-muted inline-block" />
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
