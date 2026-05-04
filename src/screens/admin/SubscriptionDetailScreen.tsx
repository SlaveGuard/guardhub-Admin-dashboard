import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Home } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getAdminSubscription } from '../../api/admin';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState, getErrorMessage } from '../../components/ErrorState';
import { PageHeader } from '../../components/PageHeader';
import { PermissionDenied } from '../../components/PermissionDenied';
import { useAdminAuthStore } from '../../store/adminAuthStore';

export function SubscriptionDetailScreen() {
  const { subscriptionId } = useParams();
  const navigate = useNavigate();
  const canRead = useAdminAuthStore((state) => state.hasPermission('admin:subscriptions:read'));
  const query = useQuery({ queryKey: ['admin', 'subscriptions', subscriptionId], queryFn: () => getAdminSubscription(subscriptionId ?? ''), enabled: canRead && !!subscriptionId });

  if (!canRead) return <PermissionDenied description="This section requires subscription read access." />;
  if (query.isLoading) return <div className="h-96 animate-pulse rounded-2xl bg-white/5" />;
  if (query.error || !query.data) return <ErrorState message={query.error ? getErrorMessage(query.error) : 'Subscription not found'} onRetry={() => void query.refetch()} />;

  const subscription = query.data;

  return (
    <>
      <button className="btn-secondary inline-flex items-center gap-2" type="button" onClick={() => navigate('/admin/subscriptions')}><ArrowLeft className="h-4 w-4" />Back</button>
      <PageHeader title="Subscription" subtitle={subscriptionId} />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass-panel p-5">
          <h2 className="text-lg font-semibold">Subscription Info</h2>
          <div className="mt-4 space-y-3 text-sm"><Badge variant="violet">{subscription.planName}</Badge><Badge variant={subscription.status === 'active' ? 'green' : 'red'}>{subscription.status}</Badge><p className="text-slate-400">Created {new Date(subscription.createdAt).toLocaleString()}</p><p className="text-slate-500">Billing integration (renewal dates, payment status, invoices) is available in Phase 4.</p></div>
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
    </>
  );
}
