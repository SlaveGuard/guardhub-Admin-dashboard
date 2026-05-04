import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { listAdminUsers } from '../../api/admin';
import { Badge } from '../../components/Badge';
import type { Column } from '../../components/DataTable';
import { DataTable } from '../../components/DataTable';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState, getErrorMessage } from '../../components/ErrorState';
import { PageHeader } from '../../components/PageHeader';
import { PermissionDenied } from '../../components/PermissionDenied';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import type { AdminUserSummary } from '../../types/admin';

function statusVariant(status: string) {
  if (status === 'active') return 'green' as const;
  if (status === 'invited') return 'yellow' as const;
  if (status === 'disabled') return 'red' as const;
  return 'slate' as const;
}

function relative(value?: string | null) {
  if (!value) return 'Never';
  const diff = new Date(value).getTime() - Date.now();
  const days = Math.round(diff / 86_400_000);
  return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(days, 'day');
}

export function AdminUsersScreen() {
  const isSuperAdmin = useAdminAuthStore((state) => state.hasRole('super_admin'));
  const query = useQuery({ queryKey: ['admin', 'admin-users'], queryFn: listAdminUsers, enabled: isSuperAdmin });

  if (!isSuperAdmin) return <PermissionDenied description="This section is restricted to super admins." />;
  if (query.error) return <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />;

  const columns: Column<AdminUserSummary>[] = [
    { key: 'email', label: 'Email' },
    { key: 'displayName', label: 'Display Name', render: (row) => row.displayName || 'Unknown' },
    { key: 'status', label: 'Status', render: (row) => <Badge variant={statusVariant(row.status)}>{row.status}</Badge> },
    { key: 'mfaEnabled', label: 'MFA', render: (row) => <Badge variant={row.mfaEnabled ? 'green' : 'red'}>{row.mfaEnabled ? 'Enabled' : 'Disabled'}</Badge> },
    { key: 'roles', label: 'Roles', render: (row) => <div className="flex flex-wrap gap-1">{row.roles.map((role) => <Badge key={role} variant="violet">{role}</Badge>)}</div> },
    { key: 'lastLoginAt', label: 'Last Login', render: (row) => relative(row.lastLoginAt) },
    { key: 'createdAt', label: 'Created', render: (row) => new Date(row.createdAt).toLocaleDateString() },
  ];
  const items = query.data ?? [];

  return (
    <>
      <PageHeader title="Admin Users" subtitle="Manage operator accounts" actions={<div className="text-sm text-slate-500">Full invite and role management available in Phase 2.</div>} />
      <DataTable columns={columns} data={items} isLoading={query.isLoading} emptyMessage="No admin users found." />
      {!query.isLoading && items.length === 0 ? <EmptyState icon={ShieldCheck} title="No admin users found" /> : null}
    </>
  );
}
