import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { inviteAdminUser } from '../../api/admin';
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

type InviteAdminUserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function InviteAdminUserModal({ isOpen, onClose, onSuccess }: InviteAdminUserModalProps) {
  if (!isOpen) return null;
  return <InviteAdminUserModalContent onClose={onClose} onSuccess={onSuccess} />;
}

function InviteAdminUserModalContent({ onClose, onSuccess }: Omit<InviteAdminUserModalProps, 'isOpen'>) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [roles, setRoles] = useState<string[]>(['support_admin']);
  const canSubmit = email.trim().length > 0 && roles.length > 0;
  const mutation = useMutation({
    mutationFn: () => inviteAdminUser({ email: email.trim(), displayName: displayName.trim() || undefined, roles }),
    onSuccess: () => {
      toast.success('Invite sent to ' + email.trim());
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
      <div className="glass-panel w-full max-w-md p-6" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-500/10 p-2 text-violet-400">
              <UserPlus className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-100">Invite Admin User</h2>
          </div>
          <button className="btn-secondary px-3 py-2" type="button" disabled={mutation.isPending} onClick={onClose} aria-label="Close invite modal">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-300" htmlFor="invite-email">
              Email
            </label>
            <input className="glass-input mt-2" id="invite-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-300" htmlFor="invite-display-name">
              Display Name
            </label>
            <input className="glass-input mt-2" id="invite-display-name" type="text" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-300">Roles</p>
            <div className="mt-2 space-y-2">
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
          </div>
          <p className="text-sm italic text-slate-500">An invite email will be sent. The invite link expires in 24 hours.</p>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button className="btn-secondary" type="button" disabled={mutation.isPending} onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary inline-flex items-center justify-center gap-2" type="button" disabled={!canSubmit || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? <LoadingSpinner size="sm" /> : null}
            Send Invite
          </button>
        </div>
      </div>
    </div>
  );
}
