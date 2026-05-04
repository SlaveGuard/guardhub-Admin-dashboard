import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Home } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  cancelSubscription,
  changeSubscriptionPackage,
  createQuotaOverride,
  getAdminSubscription,
  listAdminPackages,
  restoreSubscription,
  revokeQuotaOverride,
} from '../../api/admin';
import { Badge } from '../../components/Badge';
import { ConfirmActionModal } from '../../components/ConfirmActionModal';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState, getErrorMessage } from '../../components/ErrorState';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { PageHeader } from '../../components/PageHeader';
import { PermissionDenied } from '../../components/PermissionDenied';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import type { CreateQuotaOverridePayload, QuotaOverride } from '../../types/admin';

type ConfirmAction = 'change-package' | 'cancel' | 'restore';

const limitKeyOptions: CreateQuotaOverridePayload['limitKey'][] = [
  'activeProfilesLimit',
  'archivedProfilesLimit',
  'devicesPerProfileLimit',
  'appInstallationsPerProfileLimit',
];

function statusVariant(status: string) {
  if (status === 'active') return 'green' as const;
  if (status === 'inactive' || status === 'canceled') return 'red' as const;
  return 'slate' as const;
}

function isActiveOverride(override: QuotaOverride) {
  return !override.revokedAt && new Date(override.expiresAt).getTime() > Date.now();
}

function isFutureDate(value: string) {
  if (!value) return false;
  return new Date(value + 'T00:00:00').getTime() > Date.now();
}

export function SubscriptionDetailScreen() {
  const { subscriptionId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canRead = useAdminAuthStore((state) => state.hasPermission('admin:subscriptions:read'));
  const canWrite = useAdminAuthStore((state) => state.hasPermission('admin:subscriptions:write'));
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [selectedPackageCode, setSelectedPackageCode] = useState('');
  const [overrideLimitKey, setOverrideLimitKey] = useState<CreateQuotaOverridePayload['limitKey']>('activeProfilesLimit');
  const [overrideValue, setOverrideValue] = useState('');
  const [overrideExpiresAt, setOverrideExpiresAt] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [revokingOverrideId, setRevokingOverrideId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['admin', 'subscriptions', subscriptionId],
    queryFn: () => getAdminSubscription(subscriptionId ?? ''),
    enabled: canRead && !!subscriptionId,
  });
  const packagesQuery = useQuery({
    queryKey: ['admin', 'packages'],
    queryFn: listAdminPackages,
    enabled: canWrite,
  });

  const activePackages = useMemo(() => (packagesQuery.data ?? []).filter((pkg) => pkg.status === 'active'), [packagesQuery.data]);

  useEffect(() => {
    if (!query.data || !activePackages.length || selectedPackageCode) return;
    const currentPackage = activePackages.find((pkg) => pkg.code === query.data.planName);
    setSelectedPackageCode(currentPackage?.code ?? activePackages[0].code);
  }, [activePackages, query.data, selectedPackageCode]);

  const invalidateSubscription = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'subscriptions', subscriptionId] });
  };

  const changePackageMutation = useMutation({
    mutationFn: ({ packageCode, reason }: { packageCode: string; reason: string }) =>
      changeSubscriptionPackage(subscriptionId ?? '', { packageCode, reason }),
    onSuccess: async (result) => {
      toast.success(result.message || 'Package changed');
      setConfirmAction(null);
      await invalidateSubscription();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => cancelSubscription(subscriptionId ?? '', reason),
    onSuccess: async (result) => {
      toast.success(result.message || 'Subscription canceled');
      setConfirmAction(null);
      await invalidateSubscription();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const restoreMutation = useMutation({
    mutationFn: (reason: string) => restoreSubscription(subscriptionId ?? '', reason),
    onSuccess: async (result) => {
      toast.success(result.message || 'Subscription restored');
      setConfirmAction(null);
      await invalidateSubscription();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const createOverrideMutation = useMutation({
    mutationFn: (payload: CreateQuotaOverridePayload) => createQuotaOverride(subscriptionId ?? '', payload),
    onSuccess: async () => {
      toast.success('Quota override granted');
      setOverrideValue('');
      setOverrideExpiresAt('');
      setOverrideReason('');
      setOverrideError(null);
      await invalidateSubscription();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const revokeOverrideMutation = useMutation({
    mutationFn: (overrideId: string) => revokeQuotaOverride(subscriptionId ?? '', overrideId),
    onMutate: (overrideId) => setRevokingOverrideId(overrideId),
    onSuccess: async (result) => {
      toast.success(result.message || 'Quota override revoked');
      await invalidateSubscription();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
    onSettled: () => setRevokingOverrideId(null),
  });

  if (!canRead) return <PermissionDenied description="This section requires subscription read access." />;
  if (query.isLoading) return <div className="h-96 animate-pulse rounded-2xl bg-white/5" />;
  if (query.error || !query.data) return <ErrorState message={query.error ? getErrorMessage(query.error) : 'Subscription not found'} onRetry={() => void query.refetch()} />;

  const subscription = query.data;
  const quotaOverrides = subscription.quotaOverrides ?? [];
  const activeOverrides = quotaOverrides.filter(isActiveOverride);
  const overrideValueNumber = Number(overrideValue);
  const overrideInvalid =
    !overrideLimitKey ||
    !overrideValue ||
    Number.isNaN(overrideValueNumber) ||
    overrideValueNumber < 1 ||
    !isFutureDate(overrideExpiresAt) ||
    overrideReason.trim().length < 4;

  function handleGrantOverride() {
    if (overrideInvalid) {
      setOverrideError('Choose a limit, value, future expiration date, and reason of at least 4 characters.');
      return;
    }
    setOverrideError(null);
    createOverrideMutation.mutate({
      limitKey: overrideLimitKey,
      overrideValue: overrideValueNumber,
      expiresAt: new Date(overrideExpiresAt + 'T23:59:59').toISOString(),
      reason: overrideReason.trim(),
    });
  }

  return (
    <>
      <button className="btn-secondary inline-flex items-center gap-2" type="button" onClick={() => navigate('/admin/subscriptions')}><ArrowLeft className="h-4 w-4" />Back</button>
      <PageHeader title="Subscription" subtitle={subscriptionId} />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass-panel p-5">
          <h2 className="text-lg font-semibold">Subscription Info</h2>
          <div className="mt-4 space-y-3 text-sm"><Badge variant="violet">{subscription.planName}</Badge><Badge variant={statusVariant(subscription.status)}>{subscription.status}</Badge><p className="text-slate-400">Created {new Date(subscription.createdAt).toLocaleString()}</p></div>
        </section>
        <section className="glass-panel p-5">
          <h2 className="text-lg font-semibold">Account</h2>
          <div className="mt-4 space-y-3 text-sm"><p className="text-slate-200">{subscription.user.email}</p><p className="text-slate-400">{subscription.user.displayName || 'Unknown'}</p><Badge variant={subscription.user.isVerified ? 'green' : 'red'}>{subscription.user.isVerified ? 'Verified' : 'Unverified'}</Badge><div><Link className="text-violet-400 hover:text-violet-300" to={`/admin/accounts/${subscription.user.id}`}>View Account</Link></div></div>
        </section>
      </div>
      <section className="glass-panel p-5">
        <h2 className="text-lg font-semibold">Families</h2>
        {subscription.user.families.length ? <div className="mt-4 flex flex-wrap gap-2">{subscription.user.families.map((family) => <Link className="badge-violet" key={family.id} to={`/admin/families/${family.id}`}>{family.name}</Link>)}</div> : <EmptyState icon={Home} title="No families linked" />}
      </section>

      {canWrite ? (
        <section className="glass-panel p-5">
          <h2 className="text-lg font-semibold text-slate-100">Package Management</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Badge variant="violet">{subscription.planName}</Badge>
            <Badge variant={statusVariant(subscription.status)}>{subscription.status}</Badge>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Change Package</h3>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <select className="glass-input" value={selectedPackageCode} onChange={(event) => setSelectedPackageCode(event.target.value)}>
                  {activePackages.map((pkg) => (
                    <option key={pkg.id} value={pkg.code}>{pkg.displayName} ({pkg.code})</option>
                  ))}
                </select>
                <button
                  className="btn-primary inline-flex items-center justify-center gap-2"
                  type="button"
                  disabled={!selectedPackageCode || selectedPackageCode === subscription.planName || changePackageMutation.isPending}
                  onClick={() => setConfirmAction('change-package')}
                >
                  {changePackageMutation.isPending ? <LoadingSpinner size="sm" /> : null}
                  Change Package
                </button>
              </div>
              {packagesQuery.error ? <p className="mt-2 text-sm text-red-400">{getErrorMessage(packagesQuery.error)}</p> : null}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Cancel / Restore</h3>
              <div className="mt-3">
                {subscription.status === 'active' ? (
                  <button className="btn-danger" type="button" disabled={cancelMutation.isPending} onClick={() => setConfirmAction('cancel')}>Cancel Subscription</button>
                ) : null}
                {subscription.status === 'inactive' || subscription.status === 'canceled' ? (
                  <button className="btn-secondary" type="button" disabled={restoreMutation.isPending} onClick={() => setConfirmAction('restore')}>Restore Subscription</button>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {canWrite || quotaOverrides.length > 0 ? (
        <section className="glass-panel p-5">
          <h2 className="text-lg font-semibold text-slate-100">Quota Overrides</h2>
          <div className="mt-4 space-y-3">
            {activeOverrides.length ? (
              activeOverrides.map((override) => (
                <div className="glass-panel flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between" key={override.id}>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="font-mono text-slate-300">{override.limitKey}</span>
                    <Badge variant="violet">{override.overrideValue}</Badge>
                    <span className="text-slate-400">expires {new Date(override.expiresAt).toLocaleDateString()}</span>
                  </div>
                  {canWrite ? (
                    <button
                      className="btn-danger inline-flex items-center justify-center gap-2 text-sm"
                      type="button"
                      disabled={revokeOverrideMutation.isPending && revokingOverrideId === override.id}
                      onClick={() => revokeOverrideMutation.mutate(override.id)}
                    >
                      {revokeOverrideMutation.isPending && revokingOverrideId === override.id ? <LoadingSpinner size="sm" /> : null}
                      Revoke
                    </button>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No active quota overrides.</p>
            )}
          </div>

          {canWrite ? (
            <div className="mt-6 border-t border-white/10 pt-5">
              <h3 className="text-sm font-semibold text-slate-200">Add Override</h3>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-300" htmlFor="quota-limit-key">Limit Key</label>
                  <select className="glass-input mt-2" id="quota-limit-key" value={overrideLimitKey} onChange={(event) => setOverrideLimitKey(event.target.value as CreateQuotaOverridePayload['limitKey'])}>
                    {limitKeyOptions.map((key) => <option key={key} value={key}>{key}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300" htmlFor="quota-override-value">Override Value</label>
                  <input className="glass-input mt-2" id="quota-override-value" min={1} type="number" value={overrideValue} onChange={(event) => setOverrideValue(event.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300" htmlFor="quota-expires-at">Expires At</label>
                  <input className="glass-input mt-2" id="quota-expires-at" type="date" value={overrideExpiresAt} onChange={(event) => setOverrideExpiresAt(event.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300" htmlFor="quota-reason">Reason</label>
                  <textarea className="glass-input mt-2 resize-none" id="quota-reason" rows={2} value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} />
                </div>
              </div>
              {overrideError ? <p className="mt-3 text-sm text-red-400">{overrideError}</p> : null}
              <button className="btn-primary mt-4 inline-flex items-center gap-2" type="button" disabled={overrideInvalid || createOverrideMutation.isPending} onClick={handleGrantOverride}>
                {createOverrideMutation.isPending ? <LoadingSpinner size="sm" /> : null}
                Grant Override
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="glass-panel border-l-4 border-l-amber-500/70 p-5">
        <h2 className="text-lg font-semibold text-slate-100">Billing</h2>
        <p className="mt-2 text-sm text-amber-100">Billing integration (renewal dates, payment status, invoice history) is available in Phase 4.</p>
      </section>

      <ConfirmActionModal
        isOpen={confirmAction === 'change-package'}
        title="Change Package"
        description={'Change from ' + subscription.planName + ' to ' + selectedPackageCode + '. New limits take effect immediately.'}
        variant="warning"
        requireReason
        actionLabel="Change Package"
        isLoading={changePackageMutation.isPending}
        onConfirm={(reason) => changePackageMutation.mutate({ packageCode: selectedPackageCode, reason })}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmActionModal
        isOpen={confirmAction === 'cancel'}
        title="Cancel Subscription"
        description="The subscription status will be set to inactive. The family retains their current plan limits."
        variant="danger"
        requireReason
        actionLabel="Cancel Subscription"
        isLoading={cancelMutation.isPending}
        onConfirm={(reason) => cancelMutation.mutate(reason)}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmActionModal
        isOpen={confirmAction === 'restore'}
        title="Restore Subscription"
        description="The subscription will be restored and current plan limits will apply."
        variant="default"
        requireReason
        actionLabel="Restore Subscription"
        isLoading={restoreMutation.isPending}
        onConfirm={(reason) => restoreMutation.mutate(reason)}
        onCancel={() => setConfirmAction(null)}
      />
    </>
  );
}
