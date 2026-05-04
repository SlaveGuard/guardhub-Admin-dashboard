import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ClipboardList, Home, KeyRound, Mail, ShieldCheck, ShieldOff } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  disableAccount,
  enableAccount,
  forcePasswordReset,
  getAccountAudit,
  getAdminAccount,
  resendVerification,
} from '../../api/admin';
import { Badge } from '../../components/Badge';
import { ConfirmActionModal } from '../../components/ConfirmActionModal';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState, getErrorMessage } from '../../components/ErrorState';
import { PageHeader } from '../../components/PageHeader';
import { PermissionDenied } from '../../components/PermissionDenied';
import { useAdminAuthStore } from '../../store/adminAuthStore';

type Tab = 'overview' | 'audit';
type AccountAction = 'disable' | 'enable' | 'force-reset' | 'resend-verification';

function getStatusCode(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    return (error as { response?: { status?: number } }).response?.status;
  }
  return undefined;
}

export function AccountDetailScreen() {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [action, setAction] = useState<AccountAction | null>(null);
  const canRead = useAdminAuthStore((state) => state.hasPermission('admin:accounts:read'));
  const canWrite = useAdminAuthStore((state) => state.hasPermission('admin:accounts:write'));
  const query = useQuery({ queryKey: ['admin', 'accounts', accountId], queryFn: () => getAdminAccount(accountId ?? ''), enabled: canRead && !!accountId });
  const auditQuery = useQuery({
    queryKey: ['admin', 'accounts', accountId, 'audit'],
    queryFn: () => getAccountAudit(accountId ?? ''),
    enabled: canRead && !!accountId && tab === 'audit',
  });

  const invalidateAccount = () => queryClient.invalidateQueries({ queryKey: ['admin', 'accounts', accountId] });
  const disableMutation = useMutation({
    mutationFn: (reason: string) => disableAccount(accountId ?? '', reason),
    onSuccess: (result) => {
      toast.success(result.message);
      setAction(null);
      void invalidateAccount();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const enableMutation = useMutation({
    mutationFn: (reason: string) => enableAccount(accountId ?? '', reason),
    onSuccess: (result) => {
      toast.success(result.message);
      setAction(null);
      void invalidateAccount();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const forceResetMutation = useMutation({
    mutationFn: (reason: string) => forcePasswordReset(accountId ?? '', reason),
    onSuccess: (result) => {
      toast.success(result.message);
      setAction(null);
      void invalidateAccount();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const resendVerificationMutation = useMutation({
    mutationFn: (reason: string) => resendVerification(accountId ?? '', reason),
    onSuccess: (result) => {
      toast.success(result.message);
      setAction(null);
      void invalidateAccount();
    },
    onError: (error) => {
      if (getStatusCode(error) === 409) {
        toast.error('Account email is already verified');
        return;
      }
      toast.error(getErrorMessage(error));
    },
  });

  if (!canRead) return <PermissionDenied description="This section requires account read access." />;
  if (query.isLoading) return <div className="h-96 animate-pulse rounded-2xl bg-white/5" />;
  if (query.error || !query.data) return <ErrorState message={query.error ? getErrorMessage(query.error) : 'Account not found'} onRetry={() => void query.refetch()} />;

  const account = query.data;
  const currentMutation =
    action === 'disable'
      ? disableMutation
      : action === 'enable'
        ? enableMutation
        : action === 'force-reset'
          ? forceResetMutation
          : resendVerificationMutation;
  const actionConfig = {
    disable: {
      title: 'Disable Account',
      description: 'This will prevent the parent from logging in and revoke all active sessions.',
      actionLabel: 'Disable Account',
      variant: 'danger' as const,
      onConfirm: (reason: string) => disableMutation.mutate(reason),
    },
    enable: {
      title: 'Re-enable Account',
      description: "This will restore the parent's ability to log in.",
      actionLabel: 'Re-enable',
      variant: 'default' as const,
      onConfirm: (reason: string) => enableMutation.mutate(reason),
    },
    'force-reset': {
      title: 'Force Password Reset',
      description: 'A password reset email will be sent and all active sessions revoked.',
      actionLabel: 'Send Reset Email',
      variant: 'warning' as const,
      onConfirm: (reason: string) => forceResetMutation.mutate(reason),
    },
    'resend-verification': {
      title: 'Resend Verification Email',
      description: 'A new 6-digit verification PIN will be sent to the account email.',
      actionLabel: 'Send Email',
      variant: 'default' as const,
      onConfirm: (reason: string) => resendVerificationMutation.mutate(reason),
    },
  };
  const modalConfig = action ? actionConfig[action] : null;

  return (
    <>
      <button className="btn-secondary inline-flex items-center gap-2" type="button" onClick={() => navigate('/admin/accounts')}>
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <PageHeader title={account.email} subtitle={`Account ID: ${accountId}`} />

      <div className="flex gap-4 border-b border-white/10">
        {(['overview', 'audit'] as Tab[]).map((item) => (
          <button
            className={`px-1 pb-3 text-sm font-semibold capitalize ${tab === item ? 'border-b-2 border-violet-500 text-violet-400' : 'text-slate-500 hover:text-slate-200'}`}
            key={item}
            type="button"
            onClick={() => setTab(item)}
          >
            {item === 'audit' ? 'Audit Trail' : 'Overview'}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <section className="glass-panel p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Account Info</h2>
                {account.adminDisabled ? <Badge variant="red">Disabled by admin</Badge> : null}
              </div>
              <div className="mt-4 space-y-3 text-sm">
                {[
                  ['Email', account.email],
                  ['Display Name', account.displayName || 'Unknown'],
                  ['Role', account.role],
                  ['Created', new Date(account.createdAt).toLocaleString()],
                ].map(([label, value]) => (
                  <div className="flex justify-between gap-4 border-b border-white/5 pb-2" key={label}>
                    <span className="text-slate-500">{label}</span>
                    <span className="text-slate-200">{value}</span>
                  </div>
                ))}
                <div className="flex justify-between">
                  <span className="text-slate-500">Verified</span>
                  <Badge variant={account.isVerified ? 'green' : 'red'}>{account.isVerified ? 'Verified' : 'Unverified'}</Badge>
                </div>
                {account.deletedAt ? (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Deleted</span>
                    <span>{new Date(account.deletedAt).toLocaleString()}</span>
                  </div>
                ) : null}
                <div className="pt-3">
                  <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Subscription</p>
                  <div className="flex gap-2">
                    <Badge variant="violet">{account.subscription?.planName ?? 'none'}</Badge>
                    <Badge variant="slate">{account.subscription?.status ?? 'none'}</Badge>
                  </div>
                </div>
              </div>
            </section>

            <section className="glass-panel p-5">
              <h2 className="text-lg font-semibold">Support Actions</h2>
              {canWrite ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {account.adminDisabled ? (
                    <button className="btn-secondary inline-flex items-center justify-center gap-2" type="button" onClick={() => setAction('enable')}>
                      <ShieldCheck className="h-4 w-4" />
                      Re-enable Account
                    </button>
                  ) : (
                    <button className="btn-danger inline-flex items-center justify-center gap-2" type="button" onClick={() => setAction('disable')}>
                      <ShieldOff className="h-4 w-4" />
                      Disable Account
                    </button>
                  )}
                  <button className="btn-secondary inline-flex items-center justify-center gap-2" type="button" disabled={!!account.deletedAt} onClick={() => setAction('force-reset')}>
                    <KeyRound className="h-4 w-4" />
                    Force Password Reset
                  </button>
                  {!account.isVerified ? (
                    <button className="btn-secondary inline-flex items-center justify-center gap-2" type="button" onClick={() => setAction('resend-verification')}>
                      <Mail className="h-4 w-4" />
                      Resend Verification
                    </button>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">You do not have write access to account actions.</p>
              )}
            </section>
          </div>

          <section className="glass-panel p-5">
            <h2 className="text-lg font-semibold">Families</h2>
            {account.families.length ? (
              <div className="mt-4 divide-y divide-white/5">
                {account.families.map((family) => (
                  <div className="grid grid-cols-4 items-center gap-3 py-3 text-sm" key={family.id}>
                    <span className="col-span-2 text-slate-200">{family.name}</span>
                    <span className="text-slate-500">{family.profileCount ?? 0} profiles</span>
                    <Link className="text-right text-violet-400 hover:text-violet-300" to={`/admin/families/${family.id}`}>
                      View
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Home} title="No families" subtitle="This account has no family records." />
            )}
          </section>
        </div>
      ) : null}

      {tab === 'audit' ? (
        auditQuery.error ? (
          <ErrorState message={getErrorMessage(auditQuery.error)} onRetry={() => void auditQuery.refetch()} />
        ) : auditQuery.isLoading ? (
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
            <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
            <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
          </div>
        ) : auditQuery.data?.length ? (
          <div className="space-y-3">
            {auditQuery.data.map((item) => (
              <div className="glass-panel p-4" key={item.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={item.source === 'admin_action' ? 'violet' : 'slate'}>{item.source}</Badge>
                    <span className="font-mono text-sm font-semibold text-slate-200">{item.action}</span>
                    {item.entityType ? <span className="text-sm text-slate-500">{item.entityType}</span> : null}
                  </div>
                  <span className="text-sm text-slate-500">{new Date(item.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-sm text-slate-400">Actor: {item.actorAdmin?.email || item.actorUser?.email || 'System'}</p>
                {item.reason ? <p className="mt-1 text-sm italic text-slate-400">Reason: {item.reason}</p> : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={ClipboardList} title="No audit records for this account" />
        )
      ) : null}

      {modalConfig ? (
        <ConfirmActionModal
          isOpen={!!action}
          title={modalConfig.title}
          description={modalConfig.description}
          actionLabel={modalConfig.actionLabel}
          variant={modalConfig.variant}
          requireReason
          isLoading={currentMutation.isPending}
          onConfirm={modalConfig.onConfirm}
          onCancel={() => setAction(null)}
        />
      ) : null}
    </>
  );
}
