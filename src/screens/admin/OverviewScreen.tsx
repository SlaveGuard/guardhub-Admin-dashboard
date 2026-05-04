import { useQuery } from '@tanstack/react-query';
import { AppWindow, CreditCard, Home, Siren, Smartphone, UserCheck, Users } from 'lucide-react';
import { getAdminOverview } from '../../api/admin';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState, getErrorMessage } from '../../components/ErrorState';
import { PageHeader } from '../../components/PageHeader';
import { StatCard } from '../../components/StatCard';

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

export function OverviewScreen() {
  const query = useQuery({ queryKey: ['admin', 'overview'], queryFn: getAdminOverview });

  if (query.isLoading) {
    return (
      <>
        <PageHeader title="Overview" subtitle="Platform health and key metrics" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div className="h-24 animate-pulse rounded-xl bg-white/5" key={i} />)}</div>
      </>
    );
  }

  if (query.error || !query.data) return <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />;

  const overview = query.data;
  const recentActions = overview.recentAdminActions.slice(0, 5);

  return (
    <>
      <PageHeader title="Overview" subtitle="Platform health and key metrics" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Accounts" value={overview.accounts.total} icon={Users} />
        <StatCard label="Verified Accounts" value={overview.accounts.verified ?? 0} icon={UserCheck} color="green" />
        <StatCard label="Active Families" value={overview.families.active ?? overview.families.total} icon={Home} color="violet" />
        <StatCard label="Active Profiles" value={overview.profiles.active ?? overview.profiles.total} icon={Users} color="violet" />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Active Devices" value={overview.devices.active ?? overview.devices.total} icon={Smartphone} />
        <StatCard label="App Installations" value={overview.appInstallations.total} icon={AppWindow} />
        <StatCard label="Alerts (24h)" value={overview.recentAlerts.length} icon={Siren} color={overview.recentAlerts.length > 0 ? 'red' : 'slate'} />
        <StatCard label="Total Subscriptions" value={overview.subscriptions.total} icon={CreditCard} color="violet" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="glass-panel p-5">
          <h2 className="text-lg font-semibold text-slate-100">Subscriptions by Plan</h2>
          <div className="mt-4 divide-y divide-white/5">
            {overview.subscriptions.byPlan.length ? overview.subscriptions.byPlan.map((row) => (
              <div className="flex items-center justify-between py-3 text-sm" key={row.planName}>
                <span className="text-slate-300">{row.planName}</span>
                <span className="font-semibold text-slate-100">{row.count}</span>
              </div>
            )) : <EmptyState icon={CreditCard} title="No subscriptions" />}
          </div>
        </section>
        <section className="glass-panel p-5">
          <h2 className="text-lg font-semibold text-slate-100">Recent Admin Actions</h2>
          <div className="mt-4 space-y-3">
            {recentActions.length ? recentActions.map((item) => (
              <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3" key={item.id}>
                <p className="text-sm font-semibold text-slate-200">{item.action}</p>
                <p className="mt-1 text-xs text-slate-500">{formatRelative(item.createdAt)}</p>
              </div>
            )) : <EmptyState icon={Users} title="No admin actions yet" />}
          </div>
        </section>
      </div>
    </>
  );
}
