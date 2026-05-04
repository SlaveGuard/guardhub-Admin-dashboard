import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, ArrowLeft, Bell, ClipboardList, Home, Smartphone, StickyNote, Users } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { getAdminFamily, getAdminFamilyActivity, getAdminFamilyAlerts, getAdminFamilyAudit, updateFamilySupportNotes } from '../../api/admin';
import { Badge } from '../../components/Badge';
import { ConfirmActionModal } from '../../components/ConfirmActionModal';
import type { Column } from '../../components/DataTable';
import { DataTable } from '../../components/DataTable';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState, getErrorMessage } from '../../components/ErrorState';
import { PageHeader } from '../../components/PageHeader';
import { PermissionDenied } from '../../components/PermissionDenied';
import { StatCard } from '../../components/StatCard';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import type { ActivityItem } from '../../types/admin';

type Tab = 'overview' | 'alerts' | 'activity' | 'audit';
type SupportNotesAction = 'save' | 'clear';

function statusVariant(status: string) {
  if (status === 'active') return 'green' as const;
  if (status === 'paused' || status === 'invited') return 'yellow' as const;
  if (status === 'archived') return 'slate' as const;
  return 'slate' as const;
}

function SupportNotesPanel({
  familyId,
  originalSupportNotes,
  canWrite,
}: {
  familyId: string;
  originalSupportNotes: string;
  canWrite: boolean;
}) {
  const queryClient = useQueryClient();
  const [supportNotes, setSupportNotes] = useState(originalSupportNotes);
  const [supportNotesAction, setSupportNotesAction] = useState<SupportNotesAction | null>(null);
  const hasSupportNotes = originalSupportNotes.trim().length > 0;
  const supportNotesMutation = useMutation({
    mutationFn: ({ notes, reason }: { notes: string | null; reason: string }) => updateFamilySupportNotes(familyId, notes, reason),
    onSuccess: () => {
      toast.success('Support notes updated');
      setSupportNotesAction(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'families', familyId] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return (
    <section className="glass-panel p-5">
      <div className="flex items-center gap-2">
        <StickyNote className="h-5 w-5 text-violet-400" />
        <h2 className="text-lg font-semibold">Support Notes</h2>
      </div>
      {canWrite ? (
        <div className="mt-4 space-y-3">
          <textarea className="glass-input resize-none" rows={5} value={supportNotes} maxLength={2100} onChange={(event) => setSupportNotes(event.target.value)} />
          {supportNotes.length > 2000 ? <p className="text-sm text-red-400">Support notes must be 2000 characters or fewer.</p> : null}
          <div className="flex flex-wrap gap-3">
            <button className="btn-primary" type="button" disabled={supportNotes === originalSupportNotes || supportNotes.length > 2000} onClick={() => setSupportNotesAction('save')}>
              Save Notes
            </button>
            <button className="btn-danger" type="button" disabled={!hasSupportNotes} onClick={() => setSupportNotesAction('clear')}>
              Clear Notes
            </button>
          </div>
        </div>
      ) : (
        <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">{originalSupportNotes}</pre>
      )}
      <ConfirmActionModal
        isOpen={!!supportNotesAction}
        title={supportNotesAction === 'clear' ? 'Clear Support Notes' : 'Update Support Notes'}
        description={
          supportNotesAction === 'clear'
            ? 'This will permanently remove all support notes for this family.'
            : 'This will update the internal support notes for this family. The notes are only visible to support and super admins.'
        }
        actionLabel={supportNotesAction === 'clear' ? 'Clear Notes' : 'Save Notes'}
        variant={supportNotesAction === 'clear' ? 'danger' : 'default'}
        requireReason
        isLoading={supportNotesMutation.isPending}
        onConfirm={(reason) => supportNotesMutation.mutate({ notes: supportNotesAction === 'clear' ? null : supportNotes, reason })}
        onCancel={() => setSupportNotesAction(null)}
      />
    </section>
  );
}

export function FamilyDetailScreen() {
  const { familyId } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const canRead = useAdminAuthStore((state) => state.hasPermission('admin:families:read'));
  const canWrite = useAdminAuthStore((state) => state.hasPermission('admin:families:write'));
  const canViewSupportNotes = useAdminAuthStore((state) => state.hasRole('support_admin') || state.hasRole('super_admin'));
  const canAlerts = useAdminAuthStore((state) => state.hasPermission('admin:alerts:read'));
  const canActivity = useAdminAuthStore((state) => state.hasPermission('admin:activity:read'));
  const canAudit = useAdminAuthStore((state) => state.hasPermission('admin:audit:read'));
  const familyQuery = useQuery({ queryKey: ['admin', 'families', familyId], queryFn: () => getAdminFamily(familyId ?? ''), enabled: canRead && !!familyId });
  const alertsQuery = useQuery({ queryKey: ['admin', 'families', familyId, 'alerts'], queryFn: () => getAdminFamilyAlerts(familyId ?? '', { limit: 50 }), enabled: canAlerts && !!familyId });
  const activityQuery = useQuery({ queryKey: ['admin', 'families', familyId, 'activity'], queryFn: () => getAdminFamilyActivity(familyId ?? '', { limit: 50 }), enabled: canActivity && !!familyId });
  const auditQuery = useQuery({ queryKey: ['admin', 'families', familyId, 'audit'], queryFn: () => getAdminFamilyAudit(familyId ?? '', { limit: 50 }), enabled: canAudit && !!familyId });

  if (!canRead) return <PermissionDenied description="This section requires family read access." />;
  if (familyQuery.isLoading) return <div className="h-96 animate-pulse rounded-2xl bg-white/5" />;
  if (familyQuery.error || !familyQuery.data) return <ErrorState message={familyQuery.error ? getErrorMessage(familyQuery.error) : 'Family not found'} onRetry={() => void familyQuery.refetch()} />;

  const family = familyQuery.data;
  const originalSupportNotes = family.supportNotes ?? '';
  const hasSupportNotes = originalSupportNotes.trim().length > 0;
  const shouldShowSupportNotes = canViewSupportNotes && (canWrite || hasSupportNotes);
  const tabs: Tab[] = ['overview', 'alerts', 'activity', 'audit'];
  const activityColumns: Column<ActivityItem>[] = [
    { key: 'timestamp', label: 'Timestamp', render: (row) => new Date(row.timestamp).toLocaleString() },
    { key: 'appName', label: 'App' },
    { key: 'device', label: 'Device', render: (row) => row.device?.deviceName ?? 'Unknown' },
    { key: 'profile', label: 'Profile', render: (row) => row.device?.childProfile?.name ?? 'Unknown' },
    { key: 'detectionCount', label: 'Detection Count' },
    { key: 'categories', label: 'Categories', render: (row) => row.categories.join(', ') || 'None' },
  ];

  return (
    <>
      <button className="btn-secondary inline-flex items-center gap-2" type="button" onClick={() => navigate('/admin/families')}><ArrowLeft className="h-4 w-4" />Back</button>
      <PageHeader title={family.name} subtitle={`Family ID: ${familyId}`} />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Active Profiles" value={family.stats.activeProfileCount} icon={Users} color="violet" />
        <StatCard label="Devices" value={family.stats.deviceCount} icon={Smartphone} />
        <StatCard label="App Installations" value={family.stats.appInstallationCount} icon={Activity} />
        <StatCard label="Alerts" value={alertsQuery.data?.length ?? 0} icon={Bell} color={(alertsQuery.data?.length ?? 0) > 0 ? 'red' : 'slate'} />
      </div>
      <div className="flex gap-4 border-b border-white/10">
        {tabs.map((item) => <button className={`px-1 pb-3 text-sm font-semibold capitalize ${tab === item ? 'border-b-2 border-violet-500 text-violet-400' : 'text-slate-500 hover:text-slate-200'}`} key={item} type="button" onClick={() => setTab(item)}>{item}</button>)}
      </div>
      {tab === 'overview' ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="glass-panel p-5"><h2 className="text-lg font-semibold">Owner</h2><div className="mt-3 flex flex-wrap gap-2 text-sm"><span className="text-slate-300">{family.owner.email}</span><Badge variant={family.owner.isVerified ? 'green' : 'red'}>{family.owner.isVerified ? 'Verified' : 'Unverified'}</Badge><Badge variant="violet">{family.subscription?.planName ?? 'none'}</Badge></div></section>
            <section className="glass-panel p-5"><h2 className="text-lg font-semibold">Subscription</h2><div className="mt-3 flex gap-2"><Badge variant="violet">{family.subscription?.planName ?? 'none'}</Badge><Badge variant={family.subscription?.status === 'active' ? 'green' : 'slate'}>{family.subscription?.status ?? 'none'}</Badge></div></section>
          </div>
          {shouldShowSupportNotes ? (
            <SupportNotesPanel key={`${family.id}:${originalSupportNotes}`} familyId={family.id} originalSupportNotes={originalSupportNotes} canWrite={canWrite} />
          ) : null}
          <section className="space-y-3">
            {family.childProfiles.length ? family.childProfiles.map((profile) => (
              <div className="glass-panel p-4" key={profile.id}>
                <button className="flex w-full items-center justify-between text-left" type="button" onClick={() => setExpanded((state) => ({ ...state, [profile.id]: !state[profile.id] }))}>
                  <span className="font-semibold">{profile.name}</span><Badge variant={statusVariant(profile.status)}>{profile.status}</Badge>
                </button>
                {expanded[profile.id] ? <div className="mt-4 space-y-3">{profile.devices.map((device) => <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3" key={device.id}><div className="flex flex-wrap justify-between gap-2 text-sm"><span className="font-semibold text-slate-200">{device.deviceName}</span><span className="text-slate-500">{device.type} - last seen {device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'never'}</span></div><div className="mt-3 flex flex-wrap gap-2">{device.appInstallations.map((app) => <Badge key={app.id} variant={statusVariant(app.status)}>{app.appCatalog.slug}: {app.status}</Badge>)}</div></div>)}</div> : null}
              </div>
            )) : <EmptyState icon={Home} title="No child profiles" />}
          </section>
        </>
      ) : null}
      {tab === 'alerts' ? (!canAlerts ? <PermissionDenied description="This tab requires alert read access." /> : alertsQuery.error ? <ErrorState message={getErrorMessage(alertsQuery.error)} onRetry={() => void alertsQuery.refetch()} /> : <div className="space-y-3">{alertsQuery.isLoading ? <div className="h-40 animate-pulse rounded-2xl bg-white/5" /> : alertsQuery.data?.length ? alertsQuery.data.map((alert) => <div className="glass-panel p-4" key={alert.id}><div className="flex flex-wrap items-center gap-3"><Badge variant={alert.alertType.includes('detection') || alert.alertType.includes('uninstall') ? 'red' : 'yellow'}>{alert.alertType}</Badge><span className="text-sm text-slate-500">{new Date(alert.sentAt).toLocaleString()}</span></div><p className="mt-2 text-slate-200">{alert.message}</p><p className="mt-1 text-sm text-slate-500">{alert.device?.deviceName ?? 'Unknown device'}</p></div>) : <EmptyState icon={Bell} title="No alerts for this family." />}</div>) : null}
      {tab === 'activity' ? (!canActivity ? <PermissionDenied description="This tab requires activity read access." /> : activityQuery.error ? <ErrorState message={getErrorMessage(activityQuery.error)} onRetry={() => void activityQuery.refetch()} /> : <DataTable columns={activityColumns} data={activityQuery.data ?? []} isLoading={activityQuery.isLoading} emptyMessage="No activity recorded for this family." />) : null}
      {tab === 'audit' ? (!canAudit ? <PermissionDenied description="This tab requires audit read access." /> : auditQuery.error ? <ErrorState message={getErrorMessage(auditQuery.error)} onRetry={() => void auditQuery.refetch()} /> : <div className="space-y-3">{auditQuery.isLoading ? <div className="h-40 animate-pulse rounded-2xl bg-white/5" /> : auditQuery.data?.length ? auditQuery.data.map((item) => <div className="glass-panel flex flex-wrap items-center justify-between gap-3 p-4" key={item.id}><div><p className="font-semibold text-slate-200">{item.action}</p><p className="text-sm text-slate-500">{item.entityType} - {new Date(item.createdAt).toLocaleString()}</p></div><Badge variant={item.source === 'admin_action' ? 'violet' : 'slate'}>{item.source}</Badge></div>) : <EmptyState icon={ClipboardList} title="No audit records for this family." />}</div>) : null}
    </>
  );
}
