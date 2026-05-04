import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ClipboardList, PencilLine, ShieldCheck, ShieldOff, UserPlus } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { disableAdminUser, enableAdminUser, getAdminUserAudit, listAdminUsers } from '../../api/admin';
import { Badge } from '../../components/Badge';
import { ConfirmActionModal } from '../../components/ConfirmActionModal';
import type { Column } from '../../components/DataTable';
import { DataTable } from '../../components/DataTable';
import { EditRolesModal } from '../../components/admin/EditRolesModal';
import { InviteAdminUserModal } from '../../components/admin/InviteAdminUserModal';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState, getErrorMessage } from '../../components/ErrorState';
import { PageHeader } from '../../components/PageHeader';
import { PermissionDenied } from '../../components/PermissionDenied';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import type { AdminUserAuditItem, AdminUserSummary } from '../../types/admin';

type DrawerMode = 'roles' | 'disable' | 'enable' | 'audit' | null;

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

function metadataSummary(item: AdminUserAuditItem) {
  if (!item.metadata) return null;
  return JSON.stringify(item.metadata);
}

export function AdminUsersScreen() {
  const queryClient = useQueryClient();
  const isSuperAdmin = useAdminAuthStore((state) => state.hasRole('super_admin'));
  const admin = useAdminAuthStore((state) => state.admin);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserSummary | null>(null);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const query = useQuery({ queryKey: ['admin', 'admin-users'], queryFn: listAdminUsers, enabled: isSuperAdmin });
  const auditQuery = useQuery({
    queryKey: ['admin', 'admin-users', selectedUser?.id, 'audit'],
    queryFn: () => getAdminUserAudit(selectedUser?.id ?? ''),
    enabled: isSuperAdmin && drawerMode === 'audit' && !!selectedUser?.id,
  });
  const disableMutation = useMutation({
    mutationFn: (reason: string) => disableAdminUser(selectedUser?.id ?? '', reason),
    onSuccess: (result) => {
      toast.success(result.message);
      closeDrawer();
      void queryClient.invalidateQueries({ queryKey: ['admin', 'admin-users'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const enableMutation = useMutation({
    mutationFn: (reason: string) => enableAdminUser(selectedUser?.id ?? '', reason),
    onSuccess: (result) => {
      toast.success(result.message);
      closeDrawer();
      void queryClient.invalidateQueries({ queryKey: ['admin', 'admin-users'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  function openDrawer(mode: DrawerMode, user: AdminUserSummary) {
    setSelectedUser(user);
    setDrawerMode(mode);
  }

  function closeDrawer() {
    setSelectedUser(null);
    setDrawerMode(null);
  }

  if (!isSuperAdmin) return <PermissionDenied description="This section is restricted to super admins." />;
  if (query.error) return <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />;

  const items = query.data ?? [];
  const isLastSuperAdmin =
    !!selectedUser?.roles.includes('super_admin') && items.filter((item) => item.roles.includes('super_admin')).length === 1;
  const columns: Column<AdminUserSummary>[] = [
    { key: 'email', label: 'Email' },
    { key: 'displayName', label: 'Display Name', render: (row) => row.displayName || 'Unknown' },
    { key: 'status', label: 'Status', render: (row) => <Badge variant={statusVariant(row.status)}>{row.status}</Badge> },
    { key: 'mfaEnabled', label: 'MFA', render: (row) => <Badge variant={row.mfaEnabled ? 'green' : 'red'}>{row.mfaEnabled ? 'Enabled' : 'Disabled'}</Badge> },
    {
      key: 'roles',
      label: 'Roles',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.roles.map((role) => (
            <Badge key={role} variant="violet">
              {role}
            </Badge>
          ))}
        </div>
      ),
    },
    { key: 'lastLoginAt', label: 'Last Login', render: (row) => relative(row.lastLoginAt) },
    { key: 'createdAt', label: 'Created', render: (row) => new Date(row.createdAt).toLocaleDateString() },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => {
        const isSelf = admin?.id === row.id;
        const selfTitle = isSelf ? 'Cannot modify your own account' : undefined;
        return (
          <div className="flex gap-2">
            <button className="btn-secondary px-3 py-2" type="button" disabled={isSelf} title={selfTitle ?? 'Edit roles'} onClick={() => openDrawer('roles', row)} aria-label="Edit roles">
              <PencilLine className="h-4 w-4" />
            </button>
            {row.status === 'disabled' ? (
              <button className="btn-secondary px-3 py-2" type="button" disabled={isSelf} title={selfTitle ?? 'Re-enable admin user'} onClick={() => openDrawer('enable', row)} aria-label="Re-enable admin user">
                <ShieldCheck className="h-4 w-4" />
              </button>
            ) : (
              <button className="btn-danger px-3 py-2" type="button" disabled={isSelf} title={selfTitle ?? 'Disable admin user'} onClick={() => openDrawer('disable', row)} aria-label="Disable admin user">
                <ShieldOff className="h-4 w-4" />
              </button>
            )}
            <button className="btn-secondary px-3 py-2" type="button" disabled={isSelf} title={selfTitle ?? 'View audit'} onClick={() => openDrawer('audit', row)} aria-label="View audit">
              <ClipboardList className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Admin Users"
        subtitle="Manage operator accounts"
        actions={
          <button className="btn-primary inline-flex items-center gap-2" type="button" onClick={() => setInviteModalOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Invite Admin User
          </button>
        }
      />

      {drawerMode === 'audit' && selectedUser ? (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <button className="btn-secondary inline-flex items-center gap-2" type="button" onClick={closeDrawer}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <h2 className="text-lg font-semibold text-slate-100">Audit: {selectedUser.email}</h2>
          </div>
          {auditQuery.error ? (
            <ErrorState message={getErrorMessage(auditQuery.error)} onRetry={() => void auditQuery.refetch()} />
          ) : auditQuery.isLoading ? (
            <div className="h-40 animate-pulse rounded-2xl bg-white/5" />
          ) : auditQuery.data?.length ? (
            <div className="space-y-3">
              {auditQuery.data.map((item) => (
                <div className="glass-panel p-3" key={item.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-mono text-sm font-semibold text-slate-200">{item.action}</span>
                    <span className="text-sm text-slate-500">{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  {item.reason ? <p className="mt-2 text-sm italic text-slate-400">Reason: {item.reason}</p> : null}
                  {metadataSummary(item) ? <p className="mt-2 break-all text-xs text-slate-500">Metadata: {metadataSummary(item)}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={ClipboardList} title="No audit records for this admin user" />
          )}
        </section>
      ) : (
        <DataTable columns={columns} data={items} isLoading={query.isLoading} emptyMessage="No admin users found." />
      )}

      <InviteAdminUserModal isOpen={inviteModalOpen} onClose={() => setInviteModalOpen(false)} />
      <EditRolesModal isOpen={drawerMode === 'roles'} user={selectedUser} isLastSuperAdmin={isLastSuperAdmin} onClose={closeDrawer} />
      <ConfirmActionModal
        isOpen={drawerMode === 'disable' && !!selectedUser}
        title="Disable Admin User"
        description={`Disable ${selectedUser?.email ?? 'this admin user'}. All their sessions will be revoked.`}
        actionLabel="Disable"
        variant="danger"
        requireReason
        isLoading={disableMutation.isPending}
        onConfirm={(reason) => disableMutation.mutate(reason)}
        onCancel={closeDrawer}
      />
      <ConfirmActionModal
        isOpen={drawerMode === 'enable' && !!selectedUser}
        title="Re-enable Admin User"
        description={`Restore admin access for ${selectedUser?.email ?? 'this admin user'}.`}
        actionLabel="Re-enable"
        variant="default"
        requireReason
        isLoading={enableMutation.isPending}
        onConfirm={(reason) => enableMutation.mutate(reason)}
        onCancel={closeDrawer}
      />
    </>
  );
}
