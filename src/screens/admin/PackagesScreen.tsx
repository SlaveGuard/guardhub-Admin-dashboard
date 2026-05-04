import { useQuery } from '@tanstack/react-query';
import { Info, Package } from 'lucide-react';
import { listAdminPackages } from '../../api/admin';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState, getErrorMessage } from '../../components/ErrorState';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { PageHeader } from '../../components/PageHeader';
import { PermissionDenied } from '../../components/PermissionDenied';
import { useAdminAuthStore } from '../../store/adminAuthStore';

function limitLabel(value?: number | null) {
  return value == null ? <span className="text-green-400">Unlimited</span> : <span>{value}</span>;
}

export function PackagesScreen() {
  const canRead = useAdminAuthStore((state) => state.hasPermission('admin:packages:read'));
  const query = useQuery({ queryKey: ['admin', 'packages'], queryFn: listAdminPackages, enabled: canRead });

  if (!canRead) return <PermissionDenied description="This section requires package read access." />;
  if (query.error) return <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />;

  return (
    <>
      <PageHeader title="Packages" subtitle="Subscription plan definitions (read-only in Phase 1)" />
      <div className="glass-panel border-l-4 border-l-yellow-500/70 p-4">
        <div className="flex gap-3 text-sm text-slate-300"><Info className="h-5 w-5 text-yellow-400" />Package management (create, edit, activate) is available in Phase 3. These plans are currently hardcoded in the backend.</div>
      </div>
      {query.isLoading ? <div className="flex justify-center py-16"><LoadingSpinner /></div> : query.data?.length ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {query.data.map((item) => (
            <section className="glass-panel p-5" key={item.code}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-100">{item.displayName}</h2>
                <Badge variant={item.source === 'hardcoded' ? 'yellow' : 'violet'}>{item.source}</Badge>
              </div>
              <p className="mt-1 font-mono text-sm text-slate-400">{item.code}</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[['Active Profiles', item.limits.activeProfileCount], ['Archived Profiles', item.limits.archivedProfileCount], ['Devices per Profile', item.limits.devicesPerProfile], ['Apps per Profile', item.limits.appsPerProfile]].map(([label, value]) => (
                  <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3" key={String(label)}>
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-1 font-bold text-slate-100">{limitLabel(value as number | null | undefined)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5">
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Allowed Apps</p>
                {item.limits.allowedAppCatalogSlugs == null ? <p className="text-sm font-semibold text-green-400">All apps allowed</p> : <div className="flex flex-wrap gap-2">{item.limits.allowedAppCatalogSlugs.map((slug) => <Badge key={slug} variant="slate">{slug}</Badge>)}</div>}
              </div>
            </section>
          ))}
        </div>
      ) : <EmptyState icon={Package} title="No packages found" />}
    </>
  );
}
