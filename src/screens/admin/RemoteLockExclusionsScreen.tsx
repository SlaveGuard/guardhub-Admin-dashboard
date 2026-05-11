import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Pencil, Plus, ShieldOff, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  createRemoteLockExclusion,
  deleteRemoteLockExclusion,
  listRemoteLockExclusions,
  updateRemoteLockExclusion,
} from '../../api/admin';
import { Badge } from '../../components/Badge';
import { ConfirmActionModal } from '../../components/ConfirmActionModal';
import type { Column } from '../../components/DataTable';
import { DataTable } from '../../components/DataTable';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState, getErrorMessage } from '../../components/ErrorState';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { PageHeader } from '../../components/PageHeader';
import { PermissionDenied } from '../../components/PermissionDenied';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import type { RemoteLockExclusionPackage } from '../../types/admin';

type FormState = {
  packageName: string;
  displayName: string;
  platform: string;
  isActive: boolean;
  reason: string;
};

const emptyForm: FormState = {
  packageName: '',
  displayName: '',
  platform: 'android',
  isActive: true,
  reason: '',
};

export function RemoteLockExclusionsScreen() {
  const queryClient = useQueryClient();
  const canRead = useAdminAuthStore((state) => state.hasPermission('admin:remote-lock-exclusions:read'));
  const canWrite = useAdminAuthStore((state) => state.hasPermission('admin:remote-lock-exclusions:write'));
  const query = useQuery({ queryKey: ['admin', 'remote-lock-exclusions'], queryFn: listRemoteLockExclusions, enabled: canRead });
  const [editing, setEditing] = useState<RemoteLockExclusionPackage | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<RemoteLockExclusionPackage | null>(null);

  useEffect(() => {
    if (!editing) {
      setForm(emptyForm);
      return;
    }

    setForm({
      packageName: editing.packageName,
      displayName: editing.displayName,
      platform: editing.platform,
      isActive: editing.isActive,
      reason: '',
    });
  }, [editing]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'remote-lock-exclusions'] });

  const createMutation = useMutation({
    mutationFn: createRemoteLockExclusion,
    onSuccess: async () => {
      toast.success('Remote lock exclusion added');
      setForm(emptyForm);
      await invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: FormState) => updateRemoteLockExclusion(editing?.id ?? '', payload),
    onSuccess: async () => {
      toast.success('Remote lock exclusion updated');
      setEditing(null);
      await invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const toggleMutation = useMutation({
    mutationFn: (row: RemoteLockExclusionPackage) =>
      updateRemoteLockExclusion(row.id, {
        isActive: !row.isActive,
        reason: row.isActive ? 'Disabled from admin remote lock exclusions table' : 'Enabled from admin remote lock exclusions table',
      }),
    onSuccess: async () => {
      await invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => deleteRemoteLockExclusion(id, reason),
    onSuccess: async () => {
      toast.success('Remote lock exclusion deleted');
      setDeleteTarget(null);
      await invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const columns = useMemo<Column<RemoteLockExclusionPackage>[]>(
    () => [
      { key: 'displayName', label: 'Name', render: (row) => <span className="font-semibold text-slate-100">{row.displayName}</span> },
      { key: 'packageName', label: 'Package', render: (row) => <span className="font-mono text-slate-300">{row.packageName}</span> },
      { key: 'platform', label: 'Platform', render: (row) => <span className="font-mono text-slate-300">{row.platform}</span> },
      { key: 'isActive', label: 'Status', render: (row) => <Badge variant={row.isActive ? 'green' : 'slate'}>{row.isActive ? 'Active' : 'Inactive'}</Badge> },
      { key: 'reason', label: 'Reason', render: (row) => <span className="text-slate-400">{row.reason ?? '-'}</span> },
      {
        key: 'actions',
        label: 'Actions',
        render: (row) =>
          canWrite ? (
            <div className="flex flex-wrap justify-end gap-2">
              <button className="btn-secondary inline-flex items-center gap-1 text-sm" type="button" onClick={() => setEditing(row)}>
                <Pencil className="h-4 w-4" />
                Edit
              </button>
              <button className="btn-secondary text-sm" type="button" disabled={toggleMutation.isPending} onClick={() => toggleMutation.mutate(row)}>
                {row.isActive ? 'Disable' : 'Enable'}
              </button>
              <button className="btn-danger inline-flex items-center gap-1 text-sm" type="button" onClick={() => setDeleteTarget(row)}>
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          ) : (
            <span className="text-sm text-slate-500">Read only</span>
          ),
      },
    ],
    [canWrite, toggleMutation],
  );

  if (!canRead) return <PermissionDenied description="This section requires remote-lock exclusion read access." />;

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const reasonInvalid = form.reason.trim().length < 4;
  const formInvalid = !form.packageName.trim() || !form.displayName.trim() || !form.platform.trim() || reasonInvalid;

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submitForm() {
    const payload = {
      packageName: form.packageName.trim(),
      displayName: form.displayName.trim(),
      platform: form.platform.trim(),
      isActive: form.isActive,
      reason: form.reason.trim(),
    };

    if (editing) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  }

  return (
    <>
      <PageHeader title="Remote Lock Exclusions" subtitle="System and launcher packages allowed through device remote lock" />

      {canWrite ? (
        <section className="glass-panel p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-violet-500/10 p-2 text-violet-400">
                <ShieldOff className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold">{editing ? 'Edit exclusion package' : 'Add exclusion package'}</h2>
            </div>
            {editing ? (
              <button className="btn-secondary inline-flex items-center gap-2" type="button" onClick={() => setEditing(null)}>
                <X className="h-4 w-4" />
                Cancel
              </button>
            ) : null}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_1fr_0.6fr_0.5fr]">
            <div>
              <label className="text-sm font-medium text-slate-300" htmlFor="remote-lock-package-name">Package Name</label>
              <input className="glass-input mt-2 font-mono" id="remote-lock-package-name" value={form.packageName} onChange={(event) => updateField('packageName', event.target.value.trim())} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300" htmlFor="remote-lock-display-name">Display Name</label>
              <input className="glass-input mt-2" id="remote-lock-display-name" value={form.displayName} onChange={(event) => updateField('displayName', event.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300" htmlFor="remote-lock-platform">Platform</label>
              <input className="glass-input mt-2 font-mono" id="remote-lock-platform" value={form.platform} onChange={(event) => updateField('platform', event.target.value.trim())} />
            </div>
            <label className="flex items-end gap-2 pb-3 text-sm font-medium text-slate-300">
              <input checked={form.isActive} className="h-4 w-4 accent-violet-500" type="checkbox" onChange={(event) => updateField('isActive', event.target.checked)} />
              Active
            </label>
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium text-slate-300" htmlFor="remote-lock-reason">Reason</label>
            <textarea className="glass-input mt-2 resize-none" id="remote-lock-reason" rows={2} value={form.reason} onChange={(event) => updateField('reason', event.target.value)} />
            {reasonInvalid ? <p className="mt-2 text-sm text-red-400">Reason must be at least 4 characters.</p> : null}
          </div>

          <div className="mt-5 flex justify-end">
            <button className="btn-primary inline-flex items-center gap-2" type="button" disabled={formInvalid || isSaving} onClick={submitForm}>
              {isSaving ? <LoadingSpinner size="sm" /> : <Plus className="h-4 w-4" />}
              {editing ? 'Save Changes' : 'Add Package'}
            </button>
          </div>
        </section>
      ) : null}

      {query.error ? (
        <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
      ) : query.isLoading ? (
        <div className="flex min-h-48 items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : query.data?.length ? (
        <DataTable columns={columns} data={query.data} isLoading={false} emptyMessage="No remote lock exclusions found." />
      ) : (
        <EmptyState icon={CheckCircle} title="No remote lock exclusions found" subtitle="Add launcher and system packages that must remain reachable during remote lock." />
      )}

      <ConfirmActionModal
        isOpen={!!deleteTarget}
        title="Delete Exclusion Package"
        description={`Delete ${deleteTarget?.packageName ?? 'this package'} from the remote lock exclusion table.`}
        actionLabel="Delete"
        variant="danger"
        requireReason
        isLoading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={(reason) => {
          if (deleteTarget) deleteMutation.mutate({ id: deleteTarget.id, reason });
        }}
      />
    </>
  );
}
