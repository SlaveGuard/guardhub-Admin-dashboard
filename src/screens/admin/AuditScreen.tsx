import { useQuery } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react';
import { useState } from 'react';
import { getAdminAudit } from '../../api/admin';
import { Badge } from '../../components/Badge';
import type { Column } from '../../components/DataTable';
import { DataTable } from '../../components/DataTable';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState, getErrorMessage } from '../../components/ErrorState';
import { PageHeader } from '../../components/PageHeader';
import { Pagination } from '../../components/Pagination';
import { PermissionDenied } from '../../components/PermissionDenied';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import type { AuditItem, AuditSource } from '../../types/admin';

export function AuditScreen() {
  const canRead = useAdminAuthStore((state) => state.hasPermission('admin:audit:read'));
  const [page, setPage] = useState(1);
  const [familyIdFilter, setFamilyIdFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | AuditSource>('all');
  const hasFilters = !!familyIdFilter || sourceFilter !== 'all';
  const query = useQuery({
    queryKey: ['admin', 'audit', page, familyIdFilter, sourceFilter],
    queryFn: () => getAdminAudit({ page, limit: 20, familyId: familyIdFilter, source: sourceFilter === 'all' ? undefined : sourceFilter }),
    enabled: canRead,
  });

  if (!canRead) return <PermissionDenied description="This section requires audit read access." />;
  if (query.error) return <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />;

  const columns: Column<AuditItem>[] = [
    { key: 'action', label: 'Action' },
    { key: 'entityType', label: 'Entity Type' },
    { key: 'source', label: 'Source', render: (row) => <Badge variant={row.source === 'admin_action' ? 'violet' : 'slate'}>{row.source}</Badge> },
    { key: 'actor', label: 'Actor', render: (row) => row.actorAdmin?.email ?? row.actorUser?.email ?? 'System' },
    { key: 'familyId', label: 'Family ID', render: (row) => row.familyId ?? 'Unknown' },
    { key: 'createdAt', label: 'Date', render: (row) => new Date(row.createdAt).toLocaleString() },
  ];
  const items = query.data?.items ?? [];

  return (
    <>
      <PageHeader title="Audit" subtitle="Combined parent and admin audit trail" />
      <div className="flex flex-wrap gap-3">
        <select className="glass-input w-auto" value={sourceFilter} onChange={(event) => { setSourceFilter(event.target.value as typeof sourceFilter); setPage(1); }}>
          <option value="all">All sources</option><option value="parent_action">parent_action</option><option value="admin_action">admin_action</option>
        </select>
        <input className="glass-input w-auto min-w-64" value={familyIdFilter} onChange={(event) => { setFamilyIdFilter(event.target.value); setPage(1); }} placeholder="Family ID" />
      </div>
      <DataTable columns={columns} data={items} isLoading={query.isLoading} emptyMessage={hasFilters ? 'No results match your filters.' : 'No audit records found.'} />
      {!query.isLoading && items.length === 0 && hasFilters ? <button className="btn-secondary" type="button" onClick={() => { setFamilyIdFilter(''); setSourceFilter('all'); setPage(1); }}>Clear filters</button> : null}
      {!query.isLoading && items.length === 0 && !hasFilters ? <EmptyState icon={ClipboardList} title="No audit records found" /> : null}
      <Pagination page={page} totalPages={query.data?.totalPages ?? 1} onPage={setPage} />
    </>
  );
}
