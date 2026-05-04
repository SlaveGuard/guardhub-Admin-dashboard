import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Search, SearchX } from 'lucide-react';
import { useState } from 'react';
import { getRecentPairingFailures, lookupPairingCode } from '../../api/admin';
import { Badge } from '../../components/Badge';
import type { Column } from '../../components/DataTable';
import { DataTable } from '../../components/DataTable';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState, getErrorMessage } from '../../components/ErrorState';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { PageHeader } from '../../components/PageHeader';
import { PermissionDenied } from '../../components/PermissionDenied';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import type { PairingCodeLookupResult, PairingFailureItem } from '../../types/admin';

type Tab = 'failures' | 'lookup';

function pairingStatusVariant(status?: string) {
  if (status === 'active') return 'green' as const;
  if (status === 'expired') return 'red' as const;
  if (status === 'revoked') return 'yellow' as const;
  return 'slate' as const;
}

export function SupportScreen() {
  const [tab, setTab] = useState<Tab>('failures');
  const [lookupCode, setLookupCode] = useState('');
  const [lookupResult, setLookupResult] = useState<PairingCodeLookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const canRead = useAdminAuthStore((state) => state.hasPermission('admin:support:read'));
  const failuresQuery = useQuery({ queryKey: ['admin', 'support', 'pairing-failures'], queryFn: getRecentPairingFailures, enabled: canRead });
  const columns: Column<PairingFailureItem>[] = [
    { key: 'maskedCode', label: 'Code', render: (row) => <span className="font-mono text-slate-300">{row.maskedCode}</span> },
    { key: 'profileName', label: 'Profile' },
    { key: 'familyName', label: 'Family' },
    { key: 'appCatalogSlug', label: 'App Type', render: (row) => <span className="font-mono text-slate-300">{row.appCatalogSlug}</span> },
    { key: 'status', label: 'Status', render: (row) => <Badge variant={pairingStatusVariant(row.status)}>{row.status}</Badge> },
    { key: 'reason', label: 'Reason', render: (row) => <span className="italic text-slate-400">{row.reason}</span> },
    { key: 'expiresAt', label: 'Expires', render: (row) => new Date(row.expiresAt).toLocaleDateString() },
    { key: 'createdAt', label: 'Created', render: (row) => new Date(row.createdAt).toLocaleDateString() },
  ];

  if (!canRead) return <PermissionDenied description="This section requires support read access." />;

  async function runLookup() {
    if (lookupCode.length !== 7 || lookupLoading) return;
    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);
    try {
      const result = await lookupPairingCode(lookupCode);
      setLookupResult(result);
    } catch (error) {
      setLookupError(getErrorMessage(error));
    } finally {
      setLookupLoading(false);
    }
  }

  return (
    <>
      <PageHeader title="Support Workspace" subtitle="Pairing diagnostics and troubleshooting tools" />
      <div className="flex gap-4 border-b border-white/10">
        {[
          ['failures', 'Recent Failures'],
          ['lookup', 'Code Lookup'],
        ].map(([value, label]) => (
          <button
            className={`px-1 pb-3 text-sm font-semibold ${tab === value ? 'border-b-2 border-violet-500 text-violet-400' : 'text-slate-500 hover:text-slate-200'}`}
            key={value}
            type="button"
            onClick={() => setTab(value as Tab)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'failures' ? (
        failuresQuery.error ? (
          <ErrorState message={getErrorMessage(failuresQuery.error)} onRetry={() => void failuresQuery.refetch()} />
        ) : failuresQuery.isLoading ? (
          <div className="flex min-h-48 items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : failuresQuery.data?.length ? (
          <DataTable columns={columns} data={failuresQuery.data} isLoading={false} emptyMessage="No pairing failures found." />
        ) : (
          <EmptyState icon={CheckCircle} title="No pairing failures found" subtitle="All recent pairing codes were used successfully." />
        )
      ) : null}

      {tab === 'lookup' ? (
        <div className="mx-auto max-w-lg space-y-4">
          <section className="glass-panel p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-violet-500/10 p-2 text-violet-400">
                <Search className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold">Look up a pairing code</h2>
            </div>
            <div className="mt-5 space-y-3">
              <input
                className="glass-input"
                inputMode="numeric"
                maxLength={7}
                pattern="[0-9]{7}"
                placeholder="Enter 7-digit pairing code"
                value={lookupCode}
                onChange={(event) => setLookupCode(event.target.value.replace(/\D/g, '').slice(0, 7))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void runLookup();
                }}
              />
              <button className="btn-primary flex w-full items-center justify-center gap-2" type="button" disabled={lookupLoading || lookupCode.length !== 7} onClick={() => void runLookup()}>
                {lookupLoading ? <LoadingSpinner size="sm" /> : null}
                Look Up
              </button>
            </div>
          </section>

          {lookupError ? <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{lookupError}</div> : null}

          {lookupResult?.found === false ? (
            <EmptyState icon={SearchX} title="Pairing code not found" subtitle="No code matching this value exists in the system." />
          ) : null}

          {lookupResult?.found === true ? (
            <section className="glass-panel p-5">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Status</span>
                  <Badge variant={pairingStatusVariant(lookupResult.status)}>{lookupResult.status ?? 'unknown'}</Badge>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Family</span>
                  <span className="text-slate-200">{lookupResult.family?.name ?? '-'}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Profile</span>
                  <span className="text-slate-200">{lookupResult.profile?.name ?? '-'}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">App Type</span>
                  <span className="text-right text-slate-200">
                    {lookupResult.appCatalog?.displayName ?? '-'} <span className="font-mono text-slate-500">{lookupResult.appCatalog?.slug ?? ''}</span>
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Created</span>
                  <span className="text-slate-200">{lookupResult.createdAt ? new Date(lookupResult.createdAt).toLocaleString() : '-'}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Expires</span>
                  <span className="text-slate-200">{lookupResult.expiresAt ? new Date(lookupResult.expiresAt).toLocaleString() : '-'}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Used At</span>
                  <span className="text-slate-200">{lookupResult.usedAt ? new Date(lookupResult.usedAt).toLocaleString() : 'Not used'}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Used by Device</span>
                  <span className="text-slate-200">{lookupResult.usedByDevice?.deviceName ?? '-'}</span>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
