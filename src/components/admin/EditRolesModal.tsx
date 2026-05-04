import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { updateAdminUserRoles } from '../../api/admin';
import type { AdminUserSummary } from '../../types/admin';
import { normalizeAdminRoleCodes } from '../../utils/adminRoles';
import { getErrorMessage } from '../ErrorState';
import { LoadingSpinner } from '../LoadingSpinner';

const ROLE_OPTIONS = [
  { value: 'super_admin', label: 'super_admin', description: 'Full platform administration' },
  { value: 'support_admin', label: 'support_admin', description: 'Account lookup, family view, support actions' },
  { value: 'billing_admin', label: 'billing_admin', description: 'Packages and subscriptions' },
  { value: 'operations_admin', label: 'operations_admin', description: 'App catalog and feature flags' },
  { value: 'trust_safety_admin', label: 'trust_safety_admin', description: 'Alerts and activity review' },
  { value: 'readonly_auditor', label: 'readonly_auditor', description: 'Read-only compliance view' },
];

type EditRolesModalProps = {
  isOpen: boolean;
  user: AdminUserSummary | null;
  isLastSuperAdmin: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function EditRolesModal({ isOpen, user, isLastSuperAdmin, onClose, onSuccess }: EditRolesModalProps) {
  if (!isOpen || !user) return null;
  return <EditRolesModalContent user={user} isLastSuperAdmin={isLastSuperAdmin} onClose={onClose} onSuccess={onSuccess} />;
}

function EditRolesModalContent({ user, isLastSuperAdmin, onClose, onSuccess }: Omit<EditRolesModalProps, 'isOpen'> & { user: AdminUserSummary }) {
  const queryClient = useQueryClient();
  const userRoles = normalizeAdminRoleCodes(user.roles);
  const [roles, setRoles] = useState<string[]>(userRoles);
  const [reason, setReason] = useState('');
  const trimmedReason = reason.trim();
  const removingOnlySuperAdmin = userRoles.includes('super_admin') && !roles.includes('super_admin') && isLastSuperAdmin;
  const canSubmit = roles.length > 0 && trimmedReason.length >= 4;
  const mutation = useMutation({
    mutationFn: () => updateAdminUserRoles(user?.id ?? '', { roles, reason: trimmedReason }),
    onSuccess: () => {
      toast.success('Roles updated for ' + (user?.email ?? 'admin user'));
      void queryClient.invalidateQueries({ queryKey: ['admin', 'admin-users'] });
      onSuccess?.();
      onClose();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function toggleRole(role: string) {
    setRoles((current) => (current.includes(role) ? current.filter((item) => item !== role) : [...current, role]));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={mutation.isPending ? undefined : onClose}>
      <div className="glass-panel max-h-[90vh] w-full max-w-lg overflow-y-auto p-6" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-500/10 p-2 text-violet-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Edit Roles</h2>
              <p className="text-sm text-slate-500">{user.email}</p>
            </div>
          </div>
          <button className="btn-secondary px-3 py-2" type="button" disabled={mutation.isPending} onClick={onClose} aria-label="Close role editor">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            {ROLE_OPTIONS.map((role) => (
              <label className="flex cursor-pointer gap-3 rounded-xl border border-white/10 bg-white/5 p-3" key={role.value}>
                <input className="mt-1 h-4 w-4 accent-violet-500" type="checkbox" checked={roles.includes(role.value)} onChange={() => toggleRole(role.value)} />
                <span>
                  <span className="block text-sm font-semibold text-slate-200">{role.label}</span>
                  <span className="block text-xs text-slate-500">{role.description}</span>
                </span>
              </label>
            ))}
          </div>

          {removingOnlySuperAdmin ? (
            <div className="flex gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm text-yellow-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Warning: removing the only super_admin role may lock you out.
            </div>
          ) : null}

          <div>
            <label className="text-sm font-medium text-slate-300" htmlFor="edit-roles-reason">
              Reason for this action (required for audit trail)
            </label>
            <textarea
              className="glass-input mt-2 resize-none"
              id="edit-roles-reason"
              maxLength={500}
              rows={3}
              value={reason}
              placeholder="Describe why you are taking this action..."
              onChange={(event) => setReason(event.target.value)}
            />
            {trimmedReason.length < 4 ? <p className="mt-2 text-sm text-red-400">Reason must be at least 4 characters</p> : null}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button className="btn-secondary" type="button" disabled={mutation.isPending} onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary inline-flex items-center justify-center gap-2" type="button" disabled={!canSubmit || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? <LoadingSpinner size="sm" /> : null}
            Update Roles
          </button>
        </div>
      </div>
    </div>
  );
}
