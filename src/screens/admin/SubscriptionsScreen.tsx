import { useQuery } from '@tanstack/react-query';
import { CreditCard, Eye } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { listAdminSubscriptions } from '../../api/admin';
import { Badge } from '../../components/Badge';
import type { Column } from '../../components/DataTable';
import { DataTable } from '../../components/DataTable';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState, getErrorMessage } from '../../components/ErrorState';
import { PageHeader } from '../../components/PageHeader';
import { Pagination } from '../../components/Pagination';
import { PermissionDenied } from '../../components/PermissionDenied';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import type { SubscriptionSummary } from '../../types/admin';

function statusVariant(status: string) {
  if (status === 'active') return 'green' as const;
  if (status === 'inactive' || status === 'canceled') return 'red' as const;
  return 'slate' as const;
}

export function SubscriptionsScreen() {
  const canRead = useAdminAuthStore((state) => state.hasPermission('admin:subscriptions:read'));
  const [page, setPage] = useState(1);
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const hasFilters = planFilter !== 'all' || statusFilter !== 'all';
  const query = useQuery({
    queryKey: ['admin', 'subscriptions', page, planFilter, statusFilter],
    queryFn: () => listAdminSubscriptions({ page, limit: 20, planName: planFilter === 'all' ? undefined : planFilter, status: statusFilter === 'all' ? undefined : statusFilter }),
    enabled: canRead,
  });

  if (!canRead) return <PermissionDenied description="This section requires subscription read access." />;
  if (query.error) return <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />;

  const columns: Column<SubscriptionSummary>[] = [
    { key: 'owner', label: 'Owner Email', render: (row) => row.user.email },
    { key: 'planName', label: 'Plan', render: (row) => <Badge variant="violet">{row.planName}</Badge> },
    { key: 'status', label: 'Status', render: (row) => <Badge variant={statusVariant(row.status)}>{row.status}</Badge> },
    { key: 'createdAt', label: 'Created', render: (row) => new Date(row.createdAt).toLocaleDateString() },
    { key: 'actions', label: 'Actions', render: (row) => <Link className="inline-flex items-center gap-1 text-violet-400 hover:text-violet-300" to={`/admin/subscriptions/${row.id}`}><Eye className="h-4 w-4" />View</Link> },
  ];
  const items = query.data?.items ?? [];

  return (
    <>
      <PageHeader title="Subscriptions" subtitle="All family subscription records" />
      <div className="flex flex-wrap gap-3">
        <select className="glass-input w-auto" value={planFilter} onChange={(event) => { setPlanFilter(event.target.value); setPage(1); }}>
          <option value="all">All plans</option><option value="free">free</option><option value="family_plus">family_plus</option><option value="family_pro">family_pro</option>
        </select>
        <select className="glass-input w-auto" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
          <option value="all">All statuses</option><option value="active">active</option><option value="inactive">inactive</option><option value="canceled">canceled</option>
        </select>
      </div>
      <DataTable columns={columns} data={items} isLoading={query.isLoading} emptyMessage={hasFilters ? 'No results match your filters.' : 'No subscriptions found.'} />
      {!query.isLoading && items.length === 0 && hasFilters ? <button className="btn-secondary" type="button" onClick={() => { setPlanFilter('all'); setStatusFilter('all'); setPage(1); }}>Clear filters</button> : null}
      {!query.isLoading && items.length === 0 && !hasFilters ? <EmptyState icon={CreditCard} title="No subscriptions found" /> : null}
      <Pagination page={page} totalPages={query.data?.totalPages ?? 1} onPage={setPage} />
    </>
  );
}
