import { useQuery } from '@tanstack/react-query';
import { Eye, Users } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { listAdminAccounts } from '../../api/admin';
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
import type { AccountSummary } from '../../types/admin';

export function AccountsScreen() {
  const canRead = useAdminAuthStore((state) => state.hasPermission('admin:accounts:read'));
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'deleted' | 'all'>('active');
  const hasFilters = !!search || verifiedFilter !== 'all' || statusFilter !== 'active';
  const onSearch = useCallback((value: string) => { setSearch(value); setPage(1); }, []);

  const query = useQuery({
    queryKey: ['admin', 'accounts', search, page, verifiedFilter, statusFilter],
    queryFn: () => listAdminAccounts({ search, page, limit: 20, verified: verifiedFilter === 'all' ? undefined : verifiedFilter === 'verified', status: statusFilter === 'all' ? undefined : statusFilter }),
    enabled: canRead,
  });

  if (!canRead) return <PermissionDenied description="This section requires account read access." />;

  const columns: Column<AccountSummary>[] = [
    { key: 'email', label: 'Email' },
    { key: 'displayName', label: 'Name', render: (row) => row.displayName || 'Unknown' },
    { key: 'isVerified', label: 'Verified', render: (row) => <Badge variant={row.isVerified ? 'green' : 'red'}>{row.isVerified ? 'Verified' : 'Unverified'}</Badge> },
    { key: 'role', label: 'Role', render: (row) => <Badge variant="slate">{row.role}</Badge> },
    { key: 'plan', label: 'Plan', render: (row) => <Badge variant="violet">{row.subscription?.planName ?? 'none'}</Badge> },
    { key: 'familyCount', label: 'Families' },
    { key: 'createdAt', label: 'Created', render: (row) => new Date(row.createdAt).toLocaleDateString() },
    { key: 'actions', label: 'Actions', render: (row) => <Link className="inline-flex items-center gap-1 text-violet-400 hover:text-violet-300" to={`/admin/accounts/${row.id}`}><Eye className="h-4 w-4" />View</Link> },
  ];

  if (query.error) return <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />;

  const items = query.data?.items ?? [];

  return (
    <>
      <PageHeader title="Accounts" subtitle="All parent accounts" />
      <div className="flex flex-wrap gap-3">
        <SearchInput value={search} onChange={onSearch} placeholder="Search accounts" />
        <select className="glass-input w-auto" value={verifiedFilter} onChange={(event) => { setVerifiedFilter(event.target.value as typeof verifiedFilter); setPage(1); }}>
          <option value="all">All</option><option value="verified">Verified</option><option value="unverified">Unverified</option>
        </select>
        <select className="glass-input w-auto" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as typeof statusFilter); setPage(1); }}>
          <option value="active">Active</option><option value="deleted">Deleted</option><option value="all">All</option>
        </select>
      </div>
      <DataTable columns={columns} data={items} isLoading={query.isLoading} emptyMessage={hasFilters ? 'No results match your filters.' : 'No accounts found.'} />
      {!query.isLoading && items.length === 0 && hasFilters ? <button className="btn-secondary" type="button" onClick={() => { setSearch(''); setVerifiedFilter('all'); setStatusFilter('active'); setPage(1); }}>Clear filters</button> : null}
      {!query.isLoading && items.length === 0 && !hasFilters ? <EmptyState icon={Users} title="No accounts found" /> : null}
      <Pagination page={page} totalPages={query.data?.totalPages ?? 1} onPage={setPage} />
    </>
  );
}
