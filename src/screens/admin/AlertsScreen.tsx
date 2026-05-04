import { useQuery } from '@tanstack/react-query';
import { Siren } from 'lucide-react';
import { useState } from 'react';
import { getAdminAlerts } from '../../api/admin';
import { Badge } from '../../components/Badge';
import type { Column } from '../../components/DataTable';
import { DataTable } from '../../components/DataTable';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState, getErrorMessage } from '../../components/ErrorState';
import { PageHeader } from '../../components/PageHeader';
import { Pagination } from '../../components/Pagination';
import { PermissionDenied } from '../../components/PermissionDenied';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import type { AlertItem } from '../../types/admin';

export function AlertsScreen() {
  const canRead = useAdminAuthStore((state) => state.hasPermission('admin:alerts:read'));
  const [page, setPage] = useState(1);
  const [familyIdFilter, setFamilyIdFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const hasFilters = !!familyIdFilter || !!dateFrom || !!dateTo;
  const query = useQuery({
    queryKey: ['admin', 'alerts', page, familyIdFilter, dateFrom, dateTo],
    queryFn: () => getAdminAlerts({ page, limit: 20, familyId: familyIdFilter, from: dateFrom, to: dateTo }),
    enabled: canRead,
  });

  if (!canRead) return <PermissionDenied description="This section requires alert read access." />;
  if (query.error) return <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />;

  const columns: Column<AlertItem>[] = [
    { key: 'alertType', label: 'Alert Type', render: (row) => <Badge variant={row.alertType.includes('detection') || row.alertType.includes('uninstall') ? 'red' : 'yellow'}>{row.alertType}</Badge> },
    { key: 'message', label: 'Message' },
    { key: 'family', label: 'Family', render: (row) => row.family?.name ?? row.family?.id ?? 'Unknown' },
    { key: 'device', label: 'Device', render: (row) => row.device?.deviceName ?? 'Unknown' },
    { key: 'profile', label: 'Profile', render: (row) => row.device?.childProfile?.name ?? 'Unknown' },
    { key: 'sentAt', label: 'Sent At', render: (row) => new Date(row.sentAt).toLocaleString() },
    { key: 'status', label: 'Status', render: (row) => <Badge variant={row.isRead ? 'slate' : 'red'}>{row.isRead ? 'Read' : 'Unread'}</Badge> },
  ];
  const items = query.data?.items ?? [];

  return (
    <>
      <PageHeader title="Alerts" subtitle="Cross-family alert feed" />
      <div className="flex flex-wrap gap-3">
        <input className="glass-input w-auto min-w-64" value={familyIdFilter} onChange={(event) => { setFamilyIdFilter(event.target.value); setPage(1); }} placeholder="Family ID" />
        <input className="glass-input w-auto" type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} />
        <input className="glass-input w-auto" type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} />
      </div>
      <DataTable columns={columns} data={items} isLoading={query.isLoading} emptyMessage={hasFilters ? 'No results match your filters.' : 'No alerts found.'} getRowClassName={(row) => row.isRead ? '' : 'bg-white/5'} />
      {!query.isLoading && items.length === 0 && hasFilters ? <button className="btn-secondary" type="button" onClick={() => { setFamilyIdFilter(''); setDateFrom(''); setDateTo(''); setPage(1); }}>Clear filters</button> : null}
      {!query.isLoading && items.length === 0 && !hasFilters ? <EmptyState icon={Siren} title="No alerts found" /> : null}
      <Pagination page={page} totalPages={query.data?.totalPages ?? 1} onPage={setPage} />
    </>
  );
}
