import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, Copy, Pencil, Zap } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { activatePackage, duplicatePackage, getAdminPackage, getPackageImpactPreview, retirePackage } from '../../api/admin';
import { Badge } from '../../components/Badge';
import { ConfirmActionModal } from '../../components/ConfirmActionModal';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState, getErrorMessage } from '../../components/ErrorState';
import { LimitField } from '../../components/LimitField';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { PackageStatusBadge } from '../../components/PackageStatusBadge';
import { PageHeader } from '../../components/PageHeader';
import { PermissionDenied } from '../../components/PermissionDenied';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import type { ImpactDisallowedItem, ImpactFamilyItem, ImpactProfileItem, PackageDetail } from '../../types/admin';

type DetailTab = 'overview' | 'impact';

function formatPrice(pkg: PackageDetail) {
  if (pkg.price == null) return 'Free';
  const currency = pkg.currency ?? 'USD';
  const amount = new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(pkg.price);
  return pkg.billingInterval ? `${amount} / ${pkg.billingInterval}` : amount;
}

function FamilyImpactTable({ items }: { items: ImpactFamilyItem[] }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-slate-500">
          <tr>
            <th className="py-2 pr-4">Family Name</th>
            <th className="py-2 pr-4">Current Count</th>
            <th className="py-2 pr-4">Limit</th>
            <th className="py-2 pr-4">Over by</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {items.map((item) => (
            <tr key={item.familyId}>
              <td className="py-3 pr-4 text-slate-200">{item.familyName}</td>
              <td className="py-3 pr-4 text-slate-400">{item.currentCount}</td>
              <td className="py-3 pr-4 text-slate-400">{item.limit}</td>
              <td className="py-3 pr-4 font-semibold text-red-400">{item.currentCount - item.limit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProfileImpactTable({ items }: { items: ImpactProfileItem[] }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-slate-500">
          <tr>
            <th className="py-2 pr-4">Profile Name</th>
            <th className="py-2 pr-4">Family</th>
            <th className="py-2 pr-4">Current Count</th>
            <th className="py-2 pr-4">Limit</th>
            <th className="py-2 pr-4">Over by</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {items.map((item) => (
            <tr key={item.profileId}>
              <td className="py-3 pr-4 text-slate-200">{item.profileName}</td>
              <td className="py-3 pr-4 font-mono text-xs text-slate-500">{item.familyId}</td>
              <td className="py-3 pr-4 text-slate-400">{item.currentCount}</td>
              <td className="py-3 pr-4 text-slate-400">{item.limit}</td>
              <td className="py-3 pr-4 font-semibold text-red-400">{item.currentCount - item.limit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DisallowedAppsTable({ items }: { items: ImpactDisallowedItem[] }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-slate-500">
          <tr>
            <th className="py-2 pr-4">Family Name</th>
            <th className="py-2 pr-4">Disallowed App Slugs</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {items.map((item) => (
            <tr key={item.familyId}>
              <td className="py-3 pr-4 text-slate-200">{item.familyName}</td>
              <td className="py-3 pr-4 text-slate-400">{item.disallowedSlugs.join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ImpactSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="glass-panel p-4" open>
      <summary className="cursor-pointer text-sm font-semibold text-slate-100">{title}</summary>
      {children}
    </details>
  );
}

export function PackageDetailScreen() {
  const { packageId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canRead = useAdminAuthStore((state) => state.hasPermission('admin:packages:read'));
  const canWrite = useAdminAuthStore((state) => state.hasPermission('admin:packages:write'));
  const [tab, setTab] = useState<DetailTab>('overview');
  const [activateOpen, setActivateOpen] = useState(false);
  const [retireOpen, setRetireOpen] = useState(false);

  const packageQuery = useQuery({
    queryKey: ['admin', 'packages', packageId],
    queryFn: () => getAdminPackage(packageId ?? ''),
    enabled: canRead && !!packageId,
  });
  const impactQuery = useQuery({
    queryKey: ['admin', 'packages', packageId, 'impact'],
    queryFn: () => getPackageImpactPreview(packageId ?? ''),
    enabled: canRead && !!packageId,
  });

  const activateMutation = useMutation({
    mutationFn: (reason: string) => activatePackage(packageId ?? '', reason),
    onSuccess: async () => {
      toast.success('Package activated');
      setActivateOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'packages'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'packages', packageId] }),
      ]);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const retireMutation = useMutation({
    mutationFn: (reason: string) => retirePackage(packageId ?? '', reason),
    onSuccess: async (result) => {
      toast.success('Package retired - ' + result.affectedFamilyCount + ' families affected');
      setRetireOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'packages'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'packages', packageId] }),
      ]);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const duplicateMutation = useMutation({
    mutationFn: () => duplicatePackage(packageId ?? ''),
    onSuccess: async () => {
      toast.success('Package duplicated as draft');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'packages'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  if (!canRead) return <PermissionDenied description="This section requires package read access." />;
  if (packageQuery.isLoading) return <div className="h-96 animate-pulse rounded-2xl bg-white/5" />;
  if (packageQuery.error || !packageQuery.data) {
    return <ErrorState message={packageQuery.error ? getErrorMessage(packageQuery.error) : 'Package not found'} onRetry={() => void packageQuery.refetch()} />;
  }

  const pkg = packageQuery.data;
  const assignedFamilies = pkg.assignedFamilyCount ?? 0;

  return (
    <>
      <button className="btn-secondary inline-flex items-center gap-2" type="button" onClick={() => navigate('/admin/packages')}>
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <PageHeader
        title={pkg.displayName}
        subtitle={'Code: ' + pkg.code}
        actions={
          canWrite ? (
            <div className="flex flex-wrap gap-2">
              {pkg.status === 'draft' ? (
                <button className="btn-secondary inline-flex items-center gap-2" type="button" onClick={() => navigate('/admin/packages/' + packageId + '/edit')}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
              ) : null}
              {pkg.status === 'active' ? (
                <button className="btn-secondary inline-flex items-center gap-2" type="button" onClick={() => navigate('/admin/packages/' + packageId + '/edit')}>
                  <Pencil className="h-4 w-4" />
                  Edit Metadata
                </button>
              ) : null}
              {pkg.status === 'draft' ? (
                <button className="btn-primary inline-flex items-center gap-2" type="button" onClick={() => setActivateOpen(true)}>
                  <Zap className="h-4 w-4" />
                  Activate
                </button>
              ) : null}
              {pkg.status === 'active' || pkg.status === 'grandfathered' ? (
                <button className="btn-danger" type="button" onClick={() => setRetireOpen(true)}>
                  Retire
                </button>
              ) : null}
              <button className="btn-secondary inline-flex items-center gap-2" type="button" disabled={duplicateMutation.isPending} onClick={() => duplicateMutation.mutate()}>
                {duplicateMutation.isPending ? <LoadingSpinner size="sm" /> : <Copy className="h-4 w-4" />}
                Duplicate
              </button>
            </div>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <PackageStatusBadge status={pkg.status} />
        <span className="text-slate-300">Price: {formatPrice(pkg)}</span>
        <span className="text-slate-300">Assigned: {assignedFamilies} families</span>
        <Badge variant={pkg.isPublic ? 'green' : 'slate'}>{pkg.isPublic ? 'Public' : 'Private'}</Badge>
        <span className="text-slate-400">Created: {new Date(pkg.createdAt).toLocaleDateString()}</span>
      </div>

      <div className="flex gap-2">
        <button className={tab === 'overview' ? 'btn-primary text-sm' : 'btn-secondary text-sm'} type="button" onClick={() => setTab('overview')}>
          Overview
        </button>
        <button className={tab === 'impact' ? 'btn-primary text-sm' : 'btn-secondary text-sm'} type="button" onClick={() => setTab('impact')}>
          Impact Preview
        </button>
      </div>

      {tab === 'overview' ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="glass-panel p-5">
              <h2 className="text-lg font-semibold text-slate-100">Limits</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <LimitField label="Active Profiles" value={pkg.activeProfilesLimit} />
                <LimitField label="Archived Profiles" value={pkg.archivedProfilesLimit} />
                <LimitField label="Devices / Profile" value={pkg.devicesPerProfileLimit} />
                <LimitField label="Apps / Profile" value={pkg.appInstallationsPerProfileLimit} />
              </div>
              <div className="mt-5">
                <p className="mb-2 text-xs uppercase text-slate-500">Allowed Apps</p>
                {pkg.allowedAppCatalogSlugs.length === 0 ? (
                  <p className="text-sm font-semibold text-green-400">All apps allowed</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {pkg.allowedAppCatalogSlugs.map((slug) => (
                      <Badge key={slug} variant="slate">{slug}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </section>
            <section className="glass-panel p-5">
              <h2 className="text-lg font-semibold text-slate-100">Billing</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <p>Price: {formatPrice(pkg)}</p>
                <p>Billing Interval: {pkg.billingInterval ?? 'None'}</p>
                <p>Currency: {pkg.currency ?? 'USD'}</p>
                <p>{pkg.trialDays ? 'Trial: ' + pkg.trialDays + ' days' : 'No trial'}</p>
                <p>Visibility: {pkg.isPublic ? 'Public' : 'Private'}</p>
                <p>Sort Order: {pkg.sortOrder}</p>
              </div>
            </section>
          </div>
          {pkg.status === 'draft' ? (
            <div className="glass-panel border-l-4 border-l-yellow-500/70 p-4 text-sm text-yellow-200">
              This package is in draft status and cannot be assigned to families until activated.
            </div>
          ) : null}
          {pkg.status === 'retired' ? (
            <div className="glass-panel border-l-4 border-l-red-500/70 p-4 text-sm text-red-200">
              This package is retired. The {assignedFamilies} families currently on this plan keep it but cannot be joined.
            </div>
          ) : null}
        </>
      ) : null}

      {tab === 'impact' ? (
        <section className="space-y-4">
          {impactQuery.isLoading ? <div className="flex justify-center py-12"><LoadingSpinner /></div> : null}
          {impactQuery.error ? <ErrorState message={getErrorMessage(impactQuery.error)} onRetry={() => void impactQuery.refetch()} /> : null}
          {impactQuery.data && impactQuery.data.totalAffectedFamilies === 0 ? (
            <EmptyState icon={CheckCircle} title="No impact detected" subtitle="Activating this package will not affect any currently assigned families." />
          ) : null}
          {impactQuery.data && impactQuery.data.totalAffectedFamilies > 0 ? (
            <>
              <Badge variant="red">{impactQuery.data.totalAffectedFamilies} families affected</Badge>
              {impactQuery.data.familiesOverActiveProfileLimit.length ? (
                <ImpactSection title="Families over active profile limit">
                  <FamilyImpactTable items={impactQuery.data.familiesOverActiveProfileLimit} />
                </ImpactSection>
              ) : null}
              {impactQuery.data.familiesOverArchivedProfileLimit.length ? (
                <ImpactSection title="Families over archived profile limit">
                  <FamilyImpactTable items={impactQuery.data.familiesOverArchivedProfileLimit} />
                </ImpactSection>
              ) : null}
              {impactQuery.data.profilesOverDeviceLimit.length ? (
                <ImpactSection title="Profiles over device limit">
                  <ProfileImpactTable items={impactQuery.data.profilesOverDeviceLimit} />
                </ImpactSection>
              ) : null}
              {impactQuery.data.profilesOverAppInstallationLimit.length ? (
                <ImpactSection title="Profiles over app installation limit">
                  <ProfileImpactTable items={impactQuery.data.profilesOverAppInstallationLimit} />
                </ImpactSection>
              ) : null}
              {impactQuery.data.familiesWithDisallowedAppTypes.length ? (
                <ImpactSection title="Families with disallowed app types">
                  <DisallowedAppsTable items={impactQuery.data.familiesWithDisallowedAppTypes} />
                </ImpactSection>
              ) : null}
            </>
          ) : null}
        </section>
      ) : null}

      <ConfirmActionModal
        isOpen={activateOpen}
        title="Activate Package"
        description="This package will become available for assignment to families."
        variant="default"
        requireReason
        actionLabel="Activate"
        isLoading={activateMutation.isPending}
        onConfirm={(reason) => activateMutation.mutate(reason)}
        onCancel={() => setActivateOpen(false)}
      />
      <ConfirmActionModal
        isOpen={retireOpen}
        title="Retire Package"
        description={`This package has ${assignedFamilies} assigned families. Existing families keep it but no new assignments will be possible.`}
        variant="danger"
        requireReason
        actionLabel="Retire"
        isLoading={retireMutation.isPending}
        onConfirm={(reason) => retireMutation.mutate(reason)}
        onCancel={() => setRetireOpen(false)}
      />
    </>
  );
}
