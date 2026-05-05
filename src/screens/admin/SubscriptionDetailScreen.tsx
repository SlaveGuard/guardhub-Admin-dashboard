import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, ArrowLeft, ChevronsDown, ChevronsRight, Home, Link2Off, Receipt } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  cancelSubscription,
  changeSubscriptionPackage,
  createQuotaOverride,
  endTrial,
  extendTrial,
  getAdminSubscription,
  getSubscriptionBillingState,
  getSubscriptionEvents,
  getSubscriptionInvoices,
  listAdminPackages,
  restoreSubscription,
  revokeQuotaOverride,
} from '../../api/admin';
import { Badge } from '../../components/Badge';
import { BillingStatusBadge } from '../../components/BillingStatusBadge';
import { ConfirmActionModal } from '../../components/ConfirmActionModal';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState, getErrorMessage } from '../../components/ErrorState';
import { InvoiceStatusBadge } from '../../components/InvoiceStatusBadge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { MoneyAmount } from '../../components/MoneyAmount';
import { PageHeader } from '../../components/PageHeader';
import { PermissionDenied } from '../../components/PermissionDenied';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import type { BillingInvoice, BillingState, CreateQuotaOverridePayload, EndTrialPayload, ExtendTrialPayload, QuotaOverride } from '../../types/admin';

type ConfirmAction = 'change-package' | 'cancel' | 'restore';
type BillingTab = 'state' | 'invoices' | 'events';
type TrialAction = 'extend' | 'end';

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

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString() : null;
}

function formatPeriod(start: string | null | undefined, end: string | null | undefined) {
  const formattedStart = formatDate(start);
  const formattedEnd = formatDate(end);
  if (!formattedStart && !formattedEnd) return '-';
  return `${formattedStart ?? '-'} -> ${formattedEnd ?? '-'}`;
}

function formatRelative(value: string) {
  const diff = new Date(value).getTime() - Date.now();
  const units: [Intl.RelativeTimeFormatUnit, number][] = [['day', 86_400_000], ['hour', 3_600_000], ['minute', 60_000]];
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  for (const [unit, ms] of units) {
    const amount = Math.round(diff / ms);
    if (Math.abs(amount) >= 1) return rtf.format(amount, unit);
  }
  return rtf.format(0, 'minute');
}

function isActiveTrial(trialEndsAt: string | null | undefined) {
  return !!trialEndsAt && new Date(trialEndsAt).getTime() > Date.now();
}

function NotLinkedPanel() {
  return (
    <div className="glass-panel border-l-4 border-l-yellow-500/70 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-yellow-500/10 p-2 text-yellow-400">
          <Link2Off className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Not linked to billing provider</h3>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            This subscription has no Stripe subscription ID. Webhook events will link it automatically once the customer subscribes via the payment provider.
          </p>
        </div>
      </div>
    </div>
  );
}

type BillingStatePanelProps = {
  billing: BillingState;
  canWriteBilling: boolean;
  extendTrialDate: string;
  showExtendTrialDate: boolean;
  todayDate: string;
  isExtendTrialDateFuture: boolean;
  isTrialMutationPending: boolean;
  setExtendTrialDate: (value: string) => void;
  setShowExtendTrialDate: (value: boolean) => void;
  openExtendTrialConfirm: () => void;
  openEndTrialConfirm: () => void;
};

function BillingStatePanel({
  billing,
  canWriteBilling,
  extendTrialDate,
  showExtendTrialDate,
  todayDate,
  isExtendTrialDateFuture,
  isTrialMutationPending,
  setExtendTrialDate,
  setShowExtendTrialDate,
  openExtendTrialConfirm,
  openEndTrialConfirm,
}: BillingStatePanelProps) {
  const trialActive = isActiveTrial(billing.trialEndsAt);

  return (
    <div className="mt-4 space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <BillingStatusBadge status={billing.billingStatus} />
            {billing.planName ? <Badge variant="violet">{billing.planName}</Badge> : null}
            {billing.localStatus ? <Badge variant={statusVariant(billing.localStatus)}>{billing.localStatus}</Badge> : null}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Provider Customer</p>
            <p className="mt-1 break-all font-mono text-xs text-slate-300">{billing.providerCustomerId ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Provider Subscription</p>
            <p className="mt-1 break-all font-mono text-xs text-slate-300">{billing.providerSubscriptionId ?? '-'}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-white/10 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Current Period</p>
            <p className="mt-1 text-slate-200">{formatPeriod(billing.currentPeriodStart, billing.currentPeriodEnd)}</p>
          </div>
          <div className="rounded-xl border border-white/10 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Trial Ends</p>
            <p className="mt-1 text-slate-200">{formatDate(billing.trialEndsAt) ?? 'No active trial'}</p>
          </div>
          <div className="rounded-xl border border-white/10 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Scheduled Cancel</p>
            <p className="mt-1 text-slate-200">{formatDate(billing.cancelAt) ?? '-'}</p>
          </div>
          <div className="rounded-xl border border-white/10 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Canceled At</p>
            <p className="mt-1 text-slate-200">{formatDate(billing.canceledAt) ?? '-'}</p>
          </div>
          <div className="col-span-2 rounded-xl border border-white/10 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Cancel Reason</p>
            <p className="mt-1 text-slate-200">{billing.cancelReason ?? '-'}</p>
          </div>
        </div>
      </div>

      {canWriteBilling ? (
        <div className="border-t border-white/10 pt-5">
          <h3 className="text-sm font-semibold text-slate-200">Trial Management</h3>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <button
              className="btn-secondary inline-flex items-center justify-center gap-2"
              type="button"
              disabled={isTrialMutationPending}
              onClick={() => setShowExtendTrialDate(!showExtendTrialDate)}
            >
              <ChevronsRight className="h-4 w-4" />
              Extend Trial
            </button>
            <button
              className="btn-danger inline-flex items-center justify-center gap-2"
              type="button"
              disabled={!trialActive || isTrialMutationPending}
              onClick={openEndTrialConfirm}
            >
              <ChevronsDown className="h-4 w-4" />
              End Trial Now
            </button>
          </div>
          {showExtendTrialDate ? (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                className="glass-input"
                min={todayDate}
                type="date"
                value={extendTrialDate}
                onChange={(event) => setExtendTrialDate(event.target.value)}
              />
              <button
                className="btn-primary inline-flex items-center justify-center gap-2"
                type="button"
                disabled={!isExtendTrialDateFuture || isTrialMutationPending}
                onClick={openExtendTrialConfirm}
              >
                Confirm Extend
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function SubscriptionDetailScreen() {
  const { subscriptionId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canRead = useAdminAuthStore((state) => state.hasPermission('admin:subscriptions:read'));
  const canWrite = useAdminAuthStore((state) => state.hasPermission('admin:subscriptions:write'));
  const canReadBilling = useAdminAuthStore((state) => state.hasPermission('admin:billing:read'));
  const canWriteBilling = useAdminAuthStore((state) => state.hasPermission('admin:billing:write'));
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [billingTab, setBillingTab] = useState<BillingTab>('state');
  const [billingTabTouched, setBillingTabTouched] = useState(false);
  const [invoicesState, setInvoicesState] = useState<{ items: BillingInvoice[]; hasMore: boolean; lastId?: string }>({ items: [], hasMore: false });
  const [invoicesLinked, setInvoicesLinked] = useState<boolean | null>(null);
  const [invoicesRequested, setInvoicesRequested] = useState(false);
  const [trialAction, setTrialAction] = useState<TrialAction | null>(null);
  const [extendTrialDate, setExtendTrialDate] = useState('');
  const [showExtendTrialDate, setShowExtendTrialDate] = useState(false);
  const [selectedPackageCode, setSelectedPackageCode] = useState('');
  const [overrideLimitKey, setOverrideLimitKey] = useState<CreateQuotaOverridePayload['limitKey']>('activeProfilesLimit');
  const [overrideValue, setOverrideValue] = useState('');
  const [overrideExpiresAt, setOverrideExpiresAt] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [revokingOverrideId, setRevokingOverrideId] = useState<string | null>(null);

  const todayDate = new Date().toISOString().split('T')[0];
  const isExtendTrialDateFuture = isFutureDate(extendTrialDate);

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
  const billingQuery = useQuery({
    queryKey: ['admin', 'subscriptions', subscriptionId, 'billing'],
    queryFn: () => getSubscriptionBillingState(subscriptionId ?? ''),
    enabled: canReadBilling && billingTabTouched && billingTab === 'state' && !!subscriptionId,
  });
  const eventsQuery = useQuery({
    queryKey: ['admin', 'subscriptions', subscriptionId, 'events'],
    queryFn: () => getSubscriptionEvents(subscriptionId ?? ''),
    enabled: canReadBilling && billingTabTouched && billingTab === 'events' && !!subscriptionId,
  });

  const activePackages = useMemo(() => (packagesQuery.data ?? []).filter((pkg) => pkg.status === 'active'), [packagesQuery.data]);

  useEffect(() => {
    if (!query.data || !activePackages.length || selectedPackageCode) return;
    const currentPackage = activePackages.find((pkg) => pkg.code === query.data.planName);
    setSelectedPackageCode(currentPackage?.code ?? activePackages[0].code);
  }, [activePackages, query.data, selectedPackageCode]);

  const invoicesMutation = useMutation({
    mutationFn: (startingAfter?: string) => {
      if (!canReadBilling || !subscriptionId) throw new Error('Requires admin:billing:read permission.');
      return getSubscriptionInvoices(subscriptionId, { limit: 20, startingAfter });
    },
    onSuccess: (result, startingAfter) => {
      setInvoicesLinked(result.linked);
      setInvoicesState((current) => {
        const items = startingAfter ? [...current.items, ...result.invoices] : result.invoices;
        return {
          items,
          hasMore: result.hasMore,
          lastId: items.at(-1)?.id,
        };
      });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  useEffect(() => {
    if (!canReadBilling || !subscriptionId || billingTab !== 'invoices' || !billingTabTouched || invoicesRequested || invoicesState.items.length > 0 || invoicesMutation.isPending) return;
    setInvoicesRequested(true);
    invoicesMutation.mutate(undefined);
  }, [billingTab, billingTabTouched, canReadBilling, invoicesMutation, invoicesRequested, invoicesState.items.length, subscriptionId]);

  const invalidateSubscription = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'subscriptions', subscriptionId] });
  };

  const invalidateBilling = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'subscriptions', subscriptionId] });
    await queryClient.invalidateQueries({ queryKey: ['admin', 'subscriptions', subscriptionId, 'billing'] });
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

  const extendTrialMutation = useMutation({
    mutationFn: (payload: ExtendTrialPayload) => {
      if (!canWriteBilling || !subscriptionId) throw new Error('Requires admin:billing:write permission.');
      return extendTrial(subscriptionId, payload);
    },
    onSuccess: async (result) => {
      toast.success('Trial extended to ' + new Date(result.trialEndsAt).toLocaleDateString());
      setTrialAction(null);
      setShowExtendTrialDate(false);
      setExtendTrialDate('');
      await invalidateBilling();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const endTrialMutation = useMutation({
    mutationFn: (payload: EndTrialPayload) => {
      if (!canWriteBilling || !subscriptionId) throw new Error('Requires admin:billing:write permission.');
      return endTrial(subscriptionId, payload);
    },
    onSuccess: async () => {
      toast.success('Trial ended');
      setTrialAction(null);
      await invalidateBilling();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
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
  const isTrialMutationPending = extendTrialMutation.isPending || endTrialMutation.isPending;

  function selectBillingTab(tab: BillingTab) {
    setBillingTab(tab);
    setBillingTabTouched(true);
  }

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

  function openExtendTrialConfirm() {
    if (!isExtendTrialDateFuture) {
      toast.error('Choose a future trial end date.');
      return;
    }
    setTrialAction('extend');
  }

  function renderInvoiceContent() {
    if (invoicesMutation.isPending && invoicesState.items.length === 0) {
      return (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      );
    }
    if (invoicesMutation.error && invoicesState.items.length === 0) {
      return <ErrorState message={getErrorMessage(invoicesMutation.error)} onRetry={() => { setInvoicesRequested(true); invoicesMutation.mutate(undefined); }} />;
    }
    if (invoicesLinked === false) return <p className="mt-4 text-sm text-slate-400">No billing provider linked.</p>;
    if (invoicesState.items.length === 0) return <EmptyState icon={Receipt} title="No invoices found" />;

    return (
      <div className="mt-4 space-y-4">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/5">
            <thead className="bg-slate-950/50">
              <tr>
                <th className="table-header-cell">Number</th>
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell">Amount Due</th>
                <th className="table-header-cell">Amount Paid</th>
                <th className="table-header-cell">Period</th>
                <th className="table-header-cell">Paid At</th>
                <th className="table-header-cell">Link</th>
              </tr>
            </thead>
            <tbody>
              {invoicesState.items.map((invoice) => (
                <tr className="table-row" key={invoice.id}>
                  <td className="table-cell font-mono text-slate-300">{invoice.number ?? invoice.id}</td>
                  <td className="table-cell"><InvoiceStatusBadge status={invoice.status} /></td>
                  <td className="table-cell"><MoneyAmount amountCents={invoice.amountDue} currency={invoice.currency} /></td>
                  <td className="table-cell"><MoneyAmount amountCents={invoice.amountPaid} currency={invoice.currency} /></td>
                  <td className="table-cell">{formatPeriod(invoice.periodStart, invoice.periodEnd)}</td>
                  <td className="table-cell">{formatDate(invoice.paidAt) ?? '-'}</td>
                  <td className="table-cell">
                    {invoice.hostedInvoiceUrl ? (
                      <a className="text-violet-400 hover:text-violet-300" href={invoice.hostedInvoiceUrl} rel="noreferrer" target="_blank">
                        View
                      </a>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {invoicesMutation.error ? <p className="text-sm text-red-400">{getErrorMessage(invoicesMutation.error)}</p> : null}
        {invoicesState.hasMore ? (
          <button
            className="btn-secondary inline-flex items-center justify-center gap-2"
            type="button"
            disabled={invoicesMutation.isPending}
            onClick={() => invoicesMutation.mutate(invoicesState.lastId)}
          >
            {invoicesMutation.isPending ? <LoadingSpinner size="sm" /> : null}
            Load more
          </button>
        ) : null}
      </div>
    );
  }

  function renderBillingContent() {
    if (!canReadBilling) return <PermissionDenied description="Requires admin:billing:read permission." />;
    if (!billingTabTouched) return null;
    if (billingTab === 'state') {
      if (billingQuery.isLoading) {
        return (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        );
      }
      if (billingQuery.error || !billingQuery.data) {
        return <ErrorState message={billingQuery.error ? getErrorMessage(billingQuery.error) : 'Billing state not found'} onRetry={() => void billingQuery.refetch()} />;
      }
      if (!billingQuery.data.linked) return <div className="mt-4"><NotLinkedPanel /></div>;
      return (
        <BillingStatePanel
          billing={billingQuery.data}
          canWriteBilling={canWriteBilling}
          extendTrialDate={extendTrialDate}
          showExtendTrialDate={showExtendTrialDate}
          todayDate={todayDate}
          isExtendTrialDateFuture={isExtendTrialDateFuture}
          isTrialMutationPending={isTrialMutationPending}
          setExtendTrialDate={setExtendTrialDate}
          setShowExtendTrialDate={setShowExtendTrialDate}
          openExtendTrialConfirm={openExtendTrialConfirm}
          openEndTrialConfirm={() => setTrialAction('end')}
        />
      );
    }
    if (billingTab === 'invoices') return renderInvoiceContent();
    if (eventsQuery.isLoading) {
      return (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      );
    }
    if (eventsQuery.error) return <ErrorState message={getErrorMessage(eventsQuery.error)} onRetry={() => void eventsQuery.refetch()} />;
    const events = eventsQuery.data ?? [];
    if (!events.length) return <EmptyState icon={Activity} title="No webhook events recorded" />;
    return (
      <div className="mt-4 space-y-3">
        {events.map((event) => (
          <div className="glass-panel flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between" key={event.id}>
            <div>
              <p className="font-mono text-sm text-slate-200">{event.eventType}</p>
              <p className="mt-1 text-xs text-slate-500">{formatRelative(event.processedAt)}</p>
            </div>
            {event.processingNote ? <p className="text-sm italic text-slate-400">{event.processingNote}</p> : null}
          </div>
        ))}
      </div>
    );
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

      <section className="glass-panel p-5">
        <h2 className="text-lg font-semibold text-slate-100">Billing</h2>
        {canReadBilling ? (
          <>
            <div className="mt-4 flex gap-2">
              <button className={billingTabTouched && billingTab === 'state' ? 'btn-primary text-sm' : 'btn-secondary text-sm'} type="button" onClick={() => selectBillingTab('state')}>
                State
              </button>
              <button className={billingTabTouched && billingTab === 'invoices' ? 'btn-primary text-sm' : 'btn-secondary text-sm'} type="button" onClick={() => selectBillingTab('invoices')}>
                Invoices
              </button>
              <button className={billingTabTouched && billingTab === 'events' ? 'btn-primary text-sm' : 'btn-secondary text-sm'} type="button" onClick={() => selectBillingTab('events')}>
                Events
              </button>
            </div>
            {renderBillingContent()}
          </>
        ) : (
          <div className="mt-4">
            {renderBillingContent()}
          </div>
        )}
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
      <ConfirmActionModal
        isOpen={trialAction === 'extend'}
        title="Extend Trial"
        description={'Set trial end date to ' + extendTrialDate + '.'}
        variant="default"
        requireReason
        actionLabel="Extend Trial"
        isLoading={extendTrialMutation.isPending}
        onConfirm={(reason) => extendTrialMutation.mutate({ trialEndsAt: extendTrialDate + 'T23:59:59.000Z', reason })}
        onCancel={() => setTrialAction(null)}
      />
      <ConfirmActionModal
        isOpen={trialAction === 'end'}
        title="End Trial Now"
        description="This will immediately end the trial period."
        variant="danger"
        requireReason
        actionLabel="End Trial"
        isLoading={endTrialMutation.isPending}
        onConfirm={(reason) => endTrialMutation.mutate({ reason })}
        onCancel={() => setTrialAction(null)}
      />
    </>
  );
}
