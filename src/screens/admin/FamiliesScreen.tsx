import { useQuery } from '@tanstack/react-query';
import { Eye, Home } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { listAdminFamilies } from '../../api/admin';
import { Badge } from '../../components/Badge';
import type { Column } from '../../components/DataTable';
import { DataTable } from '../../components/DataTable';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState, getErrorMessage } from '../../components/ErrorState';
import { PageHeader } from '../../components/PageHeader';
import { Pagination } from '../../components/Pagination';
import { PermissionDenied } from '../../components/PermissionDenied';
import { SearchInput } from '../../components/SearchInput';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import type { FamilySummary } from '../../types/admin';

export function FamiliesScreen() {
  const canRead = useAdminAuthStore((state) => state.hasPermission('admin:families:read'));
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [packageFilter, setPackageFilter] = useState('all');
  const hasFilters = !!search || packageFilter !== 'all';
  const onSearch = useCallback((value: string) => { setSearch(value); setPage(1); }, []);
  const query = useQuery({
    queryKey: ['admin', 'families', search, page, packageFilter],
    queryFn: () => listAdminFamilies({ search, page, limit: 20, packageName: packageFilter === 'all' ? undefined : packageFilter }),
    enabled: canRead,
  });

  if (!canRead) return <PermissionDenied description="This section requires family read access." />;
  if (query.error) return <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />;

  const columns: Column<FamilySummary>[] = [
    { key: 'name', label: 'Family Name' },
    { key: 'owner', label: 'Owner Email', render: (row) => row.owner.email },
    { key: 'plan', label: 'Plan', render: (row) => <Badge variant="violet">{row.subscription?.planName ?? 'none'}</Badge> },
    { key: 'profiles', label: 'Active Profiles', render: (row) => row.stats.activeProfileCount },
    { key: 'devices', label: 'Devices', render: (row) => row.stats.deviceCount },
    { key: 'apps', label: 'Apps', render: (row) => row.stats.appInstallationCount },
    { key: 'createdAt', label: 'Created', render: (row) => new Date(row.createdAt).toLocaleDateString() },
    { key: 'actions', label: 'Actions', render: (row) => <Link className="inline-flex items-center gap-1 text-violet-400 hover:text-violet-300" to={`/admin/families/${row.id}`}><Eye className="h-4 w-4" />View</Link> },
  ];
  const items = query.data?.items ?? [];

  return (
    <>
      <PageHeader title="Families" subtitle="All families across the platform" />
      <div className="flex flex-wrap gap-3">
        <SearchInput value={search} onChange={onSearch} placeholder="Search families" />
        <select className="glass-input w-auto" value={packageFilter} onChange={(event) => { setPackageFilter(event.target.value); setPage(1); }}>
          <option value="all">All packages</option><option value="free">free</option><option value="family_plus">family_plus</option><option value="family_pro">family_pro</option>
        </select>
      </div>
      <DataTable columns={columns} data={items} isLoading={query.isLoading} emptyMessage={hasFilters ? 'No results match your filters.' : 'No families found.'} />
      {!query.isLoading && items.length === 0 && hasFilters ? <button className="btn-secondary" type="button" onClick={() => { setSearch(''); setPackageFilter('all'); setPage(1); }}>Clear filters</button> : null}
      {!query.isLoading && items.length === 0 && !hasFilters ? <EmptyState icon={Home} title="No families found" /> : null}
      <Pagination page={page} totalPages={query.data?.totalPages ?? 1} onPage={setPage} />
    </>
  );
}
