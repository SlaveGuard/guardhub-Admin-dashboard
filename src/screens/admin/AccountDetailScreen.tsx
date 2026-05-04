import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Home } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getAdminAccount } from '../../api/admin';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState, getErrorMessage } from '../../components/ErrorState';
import { PageHeader } from '../../components/PageHeader';
import { PermissionDenied } from '../../components/PermissionDenied';
import { useAdminAuthStore } from '../../store/adminAuthStore';

export function AccountDetailScreen() {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const canRead = useAdminAuthStore((state) => state.hasPermission('admin:accounts:read'));
  const query = useQuery({ queryKey: ['admin', 'accounts', accountId], queryFn: () => getAdminAccount(accountId ?? ''), enabled: canRead && !!accountId });

  if (!canRead) return <PermissionDenied description="This section requires account read access." />;
  if (query.isLoading) return <div className="h-96 animate-pulse rounded-2xl bg-white/5" />;
  if (query.error || !query.data) return <ErrorState message={query.error ? getErrorMessage(query.error) : 'Account not found'} onRetry={() => void query.refetch()} />;

  const account = query.data;

  return (
    <>
      <button className="btn-secondary inline-flex items-center gap-2" type="button" onClick={() => navigate('/admin/accounts')}>
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <PageHeader title={account.email} subtitle={`Account ID: ${accountId}`} />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass-panel p-5">
          <h2 className="text-lg font-semibold">Account Info</h2>
          <div className="mt-4 space-y-3 text-sm">
            {[
              ['Email', account.email],
              ['Display Name', account.displayName || 'Unknown'],
              ['Role', account.role],
              ['Created', new Date(account.createdAt).toLocaleString()],
            ].map(([label, value]) => <div className="flex justify-between gap-4 border-b border-white/5 pb-2" key={label}><span className="text-slate-500">{label}</span><span className="text-slate-200">{value}</span></div>)}
            <div className="flex justify-between"><span className="text-slate-500">Verified</span><Badge variant={account.isVerified ? 'green' : 'red'}>{account.isVerified ? 'Verified' : 'Unverified'}</Badge></div>
            {account.deletedAt ? <div className="flex justify-between"><span className="text-slate-500">Deleted</span><span>{new Date(account.deletedAt).toLocaleString()}</span></div> : null}
            <div className="pt-3">
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Subscription</p>
              <div className="flex gap-2"><Badge variant="violet">{account.subscription?.planName ?? 'none'}</Badge><Badge variant="slate">{account.subscription?.status ?? 'none'}</Badge></div>
            </div>
          </div>
        </section>
        <section className="glass-panel p-5">
          <h2 className="text-lg font-semibold">Families</h2>
          {account.families.length ? (
            <div className="mt-4 divide-y divide-white/5">
              {account.families.map((family) => (
                <div className="grid grid-cols-4 items-center gap-3 py-3 text-sm" key={family.id}>
                  <span className="col-span-2 text-slate-200">{family.name}</span>
                  <span className="text-slate-500">{family.profileCount ?? 0} profiles</span>
                  <Link className="text-right text-violet-400 hover:text-violet-300" to={`/admin/families/${family.id}`}>View</Link>
                </div>
              ))}
            </div>
          ) : <EmptyState icon={Home} title="No families" subtitle="This account has no family records." />}
        </section>
      </div>
      <section className="glass-panel p-5">
        <h2 className="text-lg font-semibold">Account Audit Trail</h2>
        <p className="mt-2 text-sm text-slate-400">Account audit trail available in Phase 2.</p>
      </section>
    </>
  );
}
