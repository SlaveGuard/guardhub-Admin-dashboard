import { useQuery } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import { useState } from 'react';
import { getAdminActivity } from '../../api/admin';
import { Badge } from '../../components/Badge';
import type { Column } from '../../components/DataTable';
import { DataTable } from '../../components/DataTable';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState, getErrorMessage } from '../../components/ErrorState';
import { PageHeader } from '../../components/PageHeader';
import { Pagination } from '../../components/Pagination';
import { PermissionDenied } from '../../components/PermissionDenied';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import type { ActivityItem } from '../../types/admin';

export function ActivityScreen() {
  const canRead = useAdminAuthStore((state) => state.hasPermission('admin:activity:read'));
  const [page, setPage] = useState(1);
  const [familyIdFilter, setFamilyIdFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const hasFilters = !!familyIdFilter || !!dateFrom || !!dateTo;
  const query = useQuery({
    queryKey: ['admin', 'activity', page, familyIdFilter, dateFrom, dateTo],
    queryFn: () => getAdminActivity({ page, limit: 20, familyId: familyIdFilter, from: dateFrom, to: dateTo }),
    enabled: canRead,
  });

  if (!canRead) return <PermissionDenied description="This section requires activity read access." />;
  if (query.error) return <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />;

  const columns: Column<ActivityItem>[] = [
    { key: 'timestamp', label: 'Timestamp', render: (row) => new Date(row.timestamp).toLocaleString() },
    { key: 'appName', label: 'App' },
    { key: 'device', label: 'Device', render: (row) => row.device?.deviceName ?? 'Unknown' },
    { key: 'profile', label: 'Profile', render: (row) => row.device?.childProfile?.name ?? 'Unknown' },
    { key: 'family', label: 'Family', render: (row) => row.family?.name ?? row.family?.id ?? 'Unknown' },
    { key: 'detectionCount', label: 'Detection Count' },
    { key: 'categories', label: 'Categories', render: (row) => <div className="flex flex-wrap gap-1">{row.categories.length ? row.categories.map((category) => <Badge key={category} variant="slate">{category}</Badge>) : <span>None</span>}</div> },
    { key: 'confidenceAvg', label: 'Confidence', render: (row) => `${Math.round(row.confidenceAvg * 100)}%` },
  ];
  const items = query.data?.items ?? [];

  return (
    <>
      <PageHeader title="Activity" subtitle="Cross-family detection activity" />
      <div className="flex flex-wrap gap-3">
        <input className="glass-input w-auto min-w-64" value={familyIdFilter} onChange={(event) => { setFamilyIdFilter(event.target.value); setPage(1); }} placeholder="Family ID" />
        <input className="glass-input w-auto" type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} />
        <input className="glass-input w-auto" type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} />
      </div>
      <DataTable columns={columns} data={items} isLoading={query.isLoading} emptyMessage={hasFilters ? 'No results match your filters.' : 'No activity found.'} />
      {!query.isLoading && items.length === 0 && hasFilters ? <button className="btn-secondary" type="button" onClick={() => { setFamilyIdFilter(''); setDateFrom(''); setDateTo(''); setPage(1); }}>Clear filters</button> : null}
      {!query.isLoading && items.length === 0 && !hasFilters ? <EmptyState icon={Activity} title="No activity found" /> : null}
      <Pagination page={page} totalPages={query.data?.totalPages ?? 1} onPage={setPage} />
    </>
  );
}
