import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Copy, Eye, Package as PackageIcon, Pencil, Plus, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { activatePackage, duplicatePackage, listAdminPackages, retirePackage } from '../../api/admin';
import { ConfirmActionModal } from '../../components/ConfirmActionModal';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState, getErrorMessage } from '../../components/ErrorState';
import { LimitField } from '../../components/LimitField';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { PackageStatusBadge } from '../../components/PackageStatusBadge';
import { PageHeader } from '../../components/PageHeader';
import { PermissionDenied } from '../../components/PermissionDenied';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import type { Package, PackageStatus } from '../../types/admin';

type PackageAction = 'activate' | 'retire' | 'duplicate';
type StatusFilter = 'all' | PackageStatus;

const statusFilters: Array<{ label: string; value: StatusFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Active', value: 'active' },
  { label: 'Grandfathered', value: 'grandfathered' },
  { label: 'Retired', value: 'retired' },
];

function formatPrice(pkg: Package) {
  if (pkg.price == null) return 'Free';
  const currency = pkg.currency ?? 'USD';
  const amount = new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(pkg.price);
  return pkg.billingInterval ? `${amount} / ${pkg.billingInterval}` : amount;
}

function PackageSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div className="glass-panel h-72 animate-pulse p-5" key={index} />
      ))}
    </div>
  );
}

type PackageCardProps = {
  pkg: Package;
  canWrite: boolean;
  action?: PackageAction;
  setAction: (packageId: string, action?: PackageAction) => void;
};

function PackageCard({ pkg, canWrite, action, setAction }: PackageCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const activateMutation = useMutation({
    mutationFn: (reason: string) => activatePackage(pkg.id, reason),
    onSuccess: async () => {
      toast.success('Package activated');
      setAction(pkg.id);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'packages'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const retireMutation = useMutation({
    mutationFn: (reason: string) => retirePackage(pkg.id, reason),
    onSuccess: async (result) => {
      toast.success('Package retired - ' + result.affectedFamilyCount + ' families affected');
      setAction(pkg.id);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'packages'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const duplicateMutation = useMutation({
    mutationFn: () => duplicatePackage(pkg.id),
    onSuccess: async () => {
      toast.success('Package duplicated as draft');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'packages'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const isBusy = activateMutation.isPending || retireMutation.isPending || duplicateMutation.isPending;

  return (
    <section className="glass-panel flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-100">{pkg.displayName}</h2>
        <PackageStatusBadge status={pkg.status} />
      </div>
      <p className="mt-1 font-mono text-sm text-slate-400">{pkg.code}</p>
      <p className="mt-4 text-sm font-semibold text-slate-200">{formatPrice(pkg)}</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <LimitField label="Active Profiles" value={pkg.activeProfilesLimit} />
        <LimitField label="Archived Profiles" value={pkg.archivedProfilesLimit} />
        <LimitField label="Devices / Profile" value={pkg.devicesPerProfileLimit} />
        <LimitField label="Apps / Profile" value={pkg.appInstallationsPerProfileLimit} />
      </div>
      <p className="mt-4 text-sm text-slate-400">{pkg.assignedFamilyCount ?? 0} families</p>
      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        <button className="btn-secondary inline-flex items-center gap-2 text-sm" type="button" onClick={() => navigate('/admin/packages/' + pkg.id)}>
          <Eye className="h-4 w-4" />
          View
        </button>
        {canWrite ? (
          <>
            <button className="btn-secondary inline-flex items-center gap-2 text-sm" type="button" onClick={() => navigate('/admin/packages/' + pkg.id + '/edit')}>
              <Pencil className="h-4 w-4" />
              Edit
            </button>
            {pkg.status === 'draft' ? (
              <button className="btn-primary inline-flex items-center gap-2 text-sm" type="button" disabled={isBusy} onClick={() => setAction(pkg.id, 'activate')}>
                <Zap className="h-4 w-4" />
                Activate
              </button>
            ) : null}
            {pkg.status === 'active' ? (
              <button className="btn-danger inline-flex items-center gap-2 text-sm" type="button" disabled={isBusy} onClick={() => setAction(pkg.id, 'retire')}>
                <Archive className="h-4 w-4" />
                Retire
              </button>
            ) : null}
            <button className="btn-secondary inline-flex items-center gap-2 text-sm" type="button" disabled={isBusy} onClick={() => duplicateMutation.mutate()}>
              {duplicateMutation.isPending ? <LoadingSpinner size="sm" /> : <Copy className="h-4 w-4" />}
              Duplicate
            </button>
          </>
        ) : null}
      </div>

      <ConfirmActionModal
        isOpen={action === 'activate'}
        title="Activate Package"
        description="This package will become available for assignment to families."
        variant="default"
        requireReason
        actionLabel="Activate"
        isLoading={activateMutation.isPending}
        onConfirm={(reason) => activateMutation.mutate(reason)}
        onCancel={() => setAction(pkg.id)}
      />
      <ConfirmActionModal
        isOpen={action === 'retire'}
        title="Retire Package"
        description={`This package has ${pkg.assignedFamilyCount ?? 0} assigned families. Existing families keep it but no new assignments will be possible.`}
        variant="danger"
        requireReason
        actionLabel="Retire"
        isLoading={retireMutation.isPending}
        onConfirm={(reason) => retireMutation.mutate(reason)}
        onCancel={() => setAction(pkg.id)}
      />
    </section>
  );
}

export function PackagesScreen() {
  const navigate = useNavigate();
  const canRead = useAdminAuthStore((state) => state.hasPermission('admin:packages:read'));
  const canWrite = useAdminAuthStore((state) => state.hasPermission('admin:packages:write'));
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [actionMap, setActionMap] = useState<Map<string, PackageAction>>(() => new Map());

  const query = useQuery({ queryKey: ['admin', 'packages'], queryFn: listAdminPackages, enabled: canRead });
  const packages = query.data ?? [];
  const filteredPackages = useMemo(
    () => (statusFilter === 'all' ? packages : packages.filter((pkg) => pkg.status === statusFilter)),
    [packages, statusFilter],
  );

  function setPackageAction(packageId: string, action?: PackageAction) {
    setActionMap((current) => {
      const next = new Map(current);
      if (action) next.set(packageId, action);
      else next.delete(packageId);
      return next;
    });
  }

  if (!canRead) return <PermissionDenied description="This section requires package read access." />;
  if (query.error) return <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />;

  return (
    <>
      <PageHeader
        title="Packages"
        subtitle="Subscription plan definitions"
        actions={
          canWrite ? (
            <button className="btn-primary inline-flex items-center gap-2" type="button" onClick={() => navigate('/admin/packages/new')}>
              <Plus className="h-4 w-4" />
              Create Package
            </button>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-2">
        {statusFilters.map((filter) => {
          const active = statusFilter === filter.value;
          return (
            <button
              className={active ? 'btn-primary text-sm' : 'btn-secondary text-sm'}
              type="button"
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {query.isLoading ? (
        <PackageSkeletonGrid />
      ) : filteredPackages.length ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredPackages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              canWrite={canWrite}
              action={actionMap.get(pkg.id)}
              setAction={setPackageAction}
            />
          ))}
        </div>
      ) : (
        <EmptyState icon={PackageIcon} title="No packages found" subtitle="Create your first package to get started." />
      )}
    </>
  );
}
