import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { createPackage, getAdminPackage, updatePackage } from '../../api/admin';
import { Badge } from '../../components/Badge';
import { ConfirmActionModal } from '../../components/ConfirmActionModal';
import { ErrorState, getErrorMessage } from '../../components/ErrorState';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { PageHeader } from '../../components/PageHeader';
import { PermissionDenied } from '../../components/PermissionDenied';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import type { PackageCreatePayload, PackageStatus, PackageUpdatePayload } from '../../types/admin';

type FormState = {
  code: string;
  name: string;
  displayName: string;
  description: string;
  price: string;
  billingInterval: string;
  currency: string;
  activeProfilesLimit: string;
  archivedProfilesLimit: string;
  devicesPerProfileLimit: string;
  appInstallationsPerProfileLimit: string;
  allowedAppCatalogSlugs: string[];
  trialDays: string;
  isPublic: boolean;
  sortOrder: string;
};

type FieldErrors = Partial<Record<keyof FormState | 'allowedAppCatalogSlugInput', string>>;

const initialState: FormState = {
  code: '',
  name: '',
  displayName: '',
  description: '',
  price: '',
  billingInterval: '',
  currency: 'USD',
  activeProfilesLimit: '',
  archivedProfilesLimit: '',
  devicesPerProfileLimit: '',
  appInstallationsPerProfileLimit: '',
  allowedAppCatalogSlugs: [],
  trialDays: '',
  isPublic: false,
  sortOrder: '0',
};

const limitKeys: Array<keyof Pick<FormState, 'activeProfilesLimit' | 'archivedProfilesLimit' | 'devicesPerProfileLimit' | 'appInstallationsPerProfileLimit'>> = [
  'activeProfilesLimit',
  'archivedProfilesLimit',
  'devicesPerProfileLimit',
  'appInstallationsPerProfileLimit',
];

const limitLabels: Record<(typeof limitKeys)[number], string> = {
  activeProfilesLimit: 'Active Profiles Limit',
  archivedProfilesLimit: 'Archived Profiles Limit',
  devicesPerProfileLimit: 'Devices per Profile',
  appInstallationsPerProfileLimit: 'Apps per Profile',
};

function numberOrUndefined(value: string) {
  if (value.trim() === '') return undefined;
  return Number(value);
}

function limitOrNull(value: string) {
  if (value.trim() === '') return null;
  return Number(value);
}

function getResponseStatus(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    return (error as { response?: { status?: number } }).response?.status;
  }
  return undefined;
}

function packageStatusSubtitle(mode: 'create' | 'edit', status?: PackageStatus) {
  if (mode === 'create') return 'New draft package';
  return status === 'draft' ? 'Draft - all fields editable' : 'Active - only metadata fields editable';
}

export function PackageFormScreen() {
  const { packageId } = useParams();
  const navigate = useNavigate();
  const mode = packageId ? 'edit' : 'create';
  const canWrite = useAdminAuthStore((state) => state.hasPermission('admin:packages:write'));
  const [state, setState] = useState<FormState>(initialState);
  const [slugInput, setSlugInput] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const packageQuery = useQuery({
    queryKey: ['admin', 'packages', packageId],
    queryFn: () => getAdminPackage(packageId ?? ''),
    enabled: canWrite && mode === 'edit' && !!packageId,
  });

  const pkg = packageQuery.data;
  const limitsLocked = mode === 'edit' && pkg?.status !== 'draft';

  useEffect(() => {
    if (!pkg) return;
    setState({
      code: pkg.code,
      name: pkg.name,
      displayName: pkg.displayName,
      description: pkg.description ?? '',
      price: pkg.price == null ? '' : String(pkg.price),
      billingInterval: pkg.billingInterval ?? '',
      currency: pkg.currency ?? 'USD',
      activeProfilesLimit: pkg.activeProfilesLimit == null ? '' : String(pkg.activeProfilesLimit),
      archivedProfilesLimit: pkg.archivedProfilesLimit == null ? '' : String(pkg.archivedProfilesLimit),
      devicesPerProfileLimit: pkg.devicesPerProfileLimit == null ? '' : String(pkg.devicesPerProfileLimit),
      appInstallationsPerProfileLimit: pkg.appInstallationsPerProfileLimit == null ? '' : String(pkg.appInstallationsPerProfileLimit),
      allowedAppCatalogSlugs: pkg.allowedAppCatalogSlugs,
      trialDays: pkg.trialDays == null ? '' : String(pkg.trialDays),
      isPublic: pkg.isPublic,
      sortOrder: String(pkg.sortOrder),
    });
  }, [pkg]);

  const createMutation = useMutation({
    mutationFn: (payload: PackageCreatePayload) => createPackage(payload),
    onSuccess: (result) => {
      toast.success('Draft package created');
      navigate('/admin/packages/' + result.id);
    },
    onError: (error) => {
      if (getResponseStatus(error) === 409) toast.error('A package with this code already exists');
      else toast.error(getErrorMessage(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ reason }: { reason: string }) => updatePackage(packageId ?? '', buildUpdatePayload(reason)),
    onSuccess: () => {
      toast.success('Package updated');
      navigate('/admin/packages/' + packageId);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const title = mode === 'create' ? 'Create Package' : 'Edit Package: ' + (pkg?.displayName ?? '');
  const subtitle = packageStatusSubtitle(mode, pkg?.status);

  const codeInvalid = useMemo(() => state.code.trim() !== '' && !/^[a-z0-9_]+$/.test(state.code.trim()), [state.code]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function validate() {
    const nextErrors: FieldErrors = {};
    if (mode === 'create') {
      if (!state.code.trim()) nextErrors.code = 'Code is required';
      else if (!/^[a-z0-9_]+$/.test(state.code.trim())) nextErrors.code = 'Code must be lowercase letters, numbers, and underscores only';
    }
    if (!state.displayName.trim()) nextErrors.displayName = 'Display name is required';
    if (!state.name.trim()) nextErrors.name = 'Name is required';
    limitKeys.forEach((key) => {
      const value = state[key].trim();
      if (value !== '' && Number(value) < 1) nextErrors[key] = 'Must be at least 1 or blank for unlimited';
    });
    if (state.price.trim() !== '' && Number(state.price) < 0) nextErrors.price = 'Price cannot be negative';
    if (state.trialDays.trim() !== '' && Number(state.trialDays) < 0) nextErrors.trialDays = 'Trial days cannot be negative';
    if (state.sortOrder.trim() !== '' && Number(state.sortOrder) < 0) nextErrors.sortOrder = 'Sort order cannot be negative';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function buildCreatePayload(): PackageCreatePayload {
    return {
      code: state.code.trim(),
      name: state.name.trim(),
      displayName: state.displayName.trim(),
      description: state.description.trim() || undefined,
      price: numberOrUndefined(state.price),
      billingInterval: state.billingInterval || undefined,
      currency: state.currency.trim() || undefined,
      activeProfilesLimit: limitOrNull(state.activeProfilesLimit),
      archivedProfilesLimit: limitOrNull(state.archivedProfilesLimit),
      devicesPerProfileLimit: limitOrNull(state.devicesPerProfileLimit),
      appInstallationsPerProfileLimit: limitOrNull(state.appInstallationsPerProfileLimit),
      allowedAppCatalogSlugs: state.allowedAppCatalogSlugs,
      trialDays: numberOrUndefined(state.trialDays),
      isPublic: state.isPublic,
      sortOrder: numberOrUndefined(state.sortOrder),
    };
  }

  function buildUpdatePayload(reason: string): PackageUpdatePayload {
    const payload: PackageUpdatePayload = {
      name: state.name.trim(),
      displayName: state.displayName.trim(),
      description: state.description.trim() || undefined,
      price: numberOrUndefined(state.price),
      billingInterval: state.billingInterval || undefined,
      currency: state.currency.trim() || undefined,
      trialDays: numberOrUndefined(state.trialDays),
      isPublic: state.isPublic,
      sortOrder: numberOrUndefined(state.sortOrder),
      reason,
    };
    if (!limitsLocked) {
      payload.activeProfilesLimit = limitOrNull(state.activeProfilesLimit);
      payload.archivedProfilesLimit = limitOrNull(state.archivedProfilesLimit);
      payload.devicesPerProfileLimit = limitOrNull(state.devicesPerProfileLimit);
      payload.appInstallationsPerProfileLimit = limitOrNull(state.appInstallationsPerProfileLimit);
      payload.allowedAppCatalogSlugs = state.allowedAppCatalogSlugs;
    }
    return payload;
  }

  function addSlug() {
    const slug = slugInput.trim();
    if (!slug) return;
    if (state.allowedAppCatalogSlugs.includes(slug)) {
      setErrors((current) => ({ ...current, allowedAppCatalogSlugInput: 'Slug already added' }));
      return;
    }
    updateField('allowedAppCatalogSlugs', [...state.allowedAppCatalogSlugs, slug]);
    setSlugInput('');
    setErrors((current) => ({ ...current, allowedAppCatalogSlugInput: undefined }));
  }

  function removeSlug(slug: string) {
    updateField('allowedAppCatalogSlugs', state.allowedAppCatalogSlugs.filter((item) => item !== slug));
  }

  function handleCreate() {
    if (!validate()) return;
    createMutation.mutate(buildCreatePayload());
  }

  function handleUpdateClick() {
    if (!validate()) return;
    setConfirmOpen(true);
  }

  if (!canWrite) return <PermissionDenied description="This section requires package write access." />;
  if (mode === 'edit' && packageQuery.isLoading) return <div className="h-[42rem] animate-pulse rounded-2xl bg-white/5" />;
  if (mode === 'edit' && (packageQuery.error || !pkg)) {
    return <ErrorState message={packageQuery.error ? getErrorMessage(packageQuery.error) : 'Package not found'} onRetry={() => void packageQuery.refetch()} />;
  }

  return (
    <>
      <button
        className="btn-secondary inline-flex items-center gap-2"
        type="button"
        onClick={() => navigate(mode === 'create' ? '/admin/packages' : '/admin/packages/' + packageId)}
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <PageHeader title={title} subtitle={subtitle} />

      <div className="glass-panel space-y-8 p-5">
        <section>
          <h2 className="text-lg font-semibold text-slate-100">Identity</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-300" htmlFor="package-code">Code</label>
              {mode === 'create' ? (
                <input
                  className="glass-input mt-2"
                  id="package-code"
                  value={state.code}
                  onChange={(event) => updateField('code', event.target.value)}
                />
              ) : (
                <p className="mt-2 font-mono text-sm text-slate-300">{state.code}</p>
              )}
              {codeInvalid ? <p className="mt-2 text-sm text-red-400">Code must be lowercase letters, numbers, and underscores only</p> : null}
              {errors.code ? <p className="mt-2 text-sm text-red-400">{errors.code}</p> : null}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300" htmlFor="package-display-name">Display Name</label>
              <input
                className="glass-input mt-2"
                id="package-display-name"
                value={state.displayName}
                onChange={(event) => updateField('displayName', event.target.value)}
              />
              {errors.displayName ? <p className="mt-2 text-sm text-red-400">{errors.displayName}</p> : null}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300" htmlFor="package-name">Name</label>
              <input className="glass-input mt-2" id="package-name" value={state.name} onChange={(event) => updateField('name', event.target.value)} />
              {errors.name ? <p className="mt-2 text-sm text-red-400">{errors.name}</p> : null}
            </div>
            <div className="lg:col-span-2">
              <label className="text-sm font-medium text-slate-300" htmlFor="package-description">Description</label>
              <textarea
                className="glass-input mt-2 resize-none"
                id="package-description"
                rows={3}
                value={state.description}
                onChange={(event) => updateField('description', event.target.value)}
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-100">Limits</h2>
          {limitsLocked ? (
            <div className="mt-4 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm text-yellow-200">
              Limit fields cannot be changed on active packages. Retire and duplicate this package to change limits.
            </div>
          ) : null}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {limitKeys.map((key) => (
              <div key={key}>
                <label className="text-sm font-medium text-slate-300" htmlFor={key}>{limitLabels[key]}</label>
                <input
                  className="glass-input mt-2"
                  disabled={limitsLocked}
                  id={key}
                  min={1}
                  type="number"
                  value={state[key]}
                  onChange={(event) => updateField(key, event.target.value)}
                />
                <p className="mt-1 text-xs text-slate-500">Leave empty for unlimited</p>
                {errors[key] ? <p className="mt-2 text-sm text-red-400">{errors[key]}</p> : null}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-100">Allowed Apps</h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              className="glass-input"
              disabled={limitsLocked}
              value={slugInput}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addSlug();
                }
              }}
              onChange={(event) => {
                setSlugInput(event.target.value);
                setErrors((current) => ({ ...current, allowedAppCatalogSlugInput: undefined }));
              }}
            />
            <button className="btn-secondary inline-flex items-center justify-center gap-2" type="button" disabled={limitsLocked} onClick={addSlug}>
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
          {errors.allowedAppCatalogSlugInput ? <p className="mt-2 text-sm text-red-400">{errors.allowedAppCatalogSlugInput}</p> : null}
          <p className="mt-2 text-xs text-slate-500">Leave empty to allow all app types. Enter specific slugs to restrict.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {state.allowedAppCatalogSlugs.length === 0 ? (
              <Badge variant="green">All apps allowed</Badge>
            ) : (
              state.allowedAppCatalogSlugs.map((slug) => (
                <span className="badge-slate gap-2" key={slug}>
                  {slug}
                  <button className="text-slate-500 hover:text-slate-200" type="button" disabled={limitsLocked} onClick={() => removeSlug(slug)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-100">Billing</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-300" htmlFor="package-price">Price</label>
              <input className="glass-input mt-2" id="package-price" min={0} step="0.01" type="number" value={state.price} onChange={(event) => updateField('price', event.target.value)} />
              {errors.price ? <p className="mt-2 text-sm text-red-400">{errors.price}</p> : null}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300" htmlFor="package-billing-interval">Billing Interval</label>
              <select className="glass-input mt-2" id="package-billing-interval" value={state.billingInterval} onChange={(event) => updateField('billingInterval', event.target.value)}>
                <option value="">None</option>
                <option value="monthly">monthly</option>
                <option value="annual">annual</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300" htmlFor="package-currency">Currency</label>
              <input className="glass-input mt-2" id="package-currency" value={state.currency} onChange={(event) => updateField('currency', event.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300" htmlFor="package-trial-days">Trial Days</label>
              <input className="glass-input mt-2" id="package-trial-days" min={0} type="number" value={state.trialDays} onChange={(event) => updateField('trialDays', event.target.value)} />
              {errors.trialDays ? <p className="mt-2 text-sm text-red-400">{errors.trialDays}</p> : null}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-100">Display</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-3 text-sm font-medium text-slate-300">
              <input checked={state.isPublic} type="checkbox" onChange={(event) => updateField('isPublic', event.target.checked)} />
              Is Public
            </label>
            <div>
              <label className="text-sm font-medium text-slate-300" htmlFor="package-sort-order">Sort Order</label>
              <input className="glass-input mt-2" id="package-sort-order" min={0} type="number" value={state.sortOrder} onChange={(event) => updateField('sortOrder', event.target.value)} />
              {errors.sortOrder ? <p className="mt-2 text-sm text-red-400">{errors.sortOrder}</p> : null}
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3 border-t border-white/10 pt-5">
          <button className="btn-secondary" type="button" onClick={() => navigate(mode === 'create' ? '/admin/packages' : '/admin/packages/' + packageId)}>
            Cancel
          </button>
          {mode === 'create' ? (
            <button className="btn-primary inline-flex items-center gap-2" type="button" disabled={createMutation.isPending} onClick={handleCreate}>
              {createMutation.isPending ? <LoadingSpinner size="sm" /> : null}
              Create Package
            </button>
          ) : (
            <button className="btn-primary inline-flex items-center gap-2" type="button" disabled={updateMutation.isPending} onClick={handleUpdateClick}>
              {updateMutation.isPending ? <LoadingSpinner size="sm" /> : null}
              Save Changes
            </button>
          )}
        </div>
      </div>

      <ConfirmActionModal
        isOpen={confirmOpen}
        title="Update Package"
        description="Changes will take effect immediately for all enforcement calls."
        variant="default"
        requireReason
        actionLabel="Save Changes"
        isLoading={updateMutation.isPending}
        onConfirm={(reason) => updateMutation.mutate({ reason })}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
