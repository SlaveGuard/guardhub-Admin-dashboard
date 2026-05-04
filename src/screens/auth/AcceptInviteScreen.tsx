import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { acceptInvite } from '../../api/admin';
import { getErrorMessage } from '../../components/ErrorState';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useAdminAuthStore } from '../../store/adminAuthStore';

function getStatusCode(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    return (error as { response?: { status?: number } }).response?.status;
  }
  return undefined;
}

export function AcceptInviteScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const setAuth = useAdminAuthStore((state) => state.setAuth);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(token ? null : 'Invalid invite link. Please contact your administrator.');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    if (!token || isLoading) return;
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await acceptInvite({ inviteToken: token, password });
      setAuth(result.accessToken, result.refreshToken, result.admin);
      toast.success('Account activated. Welcome, ' + (result.admin.displayName || result.admin.email));
      navigate('/admin/overview');
    } catch (requestError) {
      if (getStatusCode(requestError) === 400) {
        setError('This invite link has expired or is invalid. Please request a new invite.');
      } else {
        toast.error(getErrorMessage(requestError));
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="glass-panel w-full max-w-md p-8">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-400">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-3xl font-bold text-slate-100">Set Your Password</h1>
          <p className="mt-2 text-sm text-slate-400">Complete your GuardHub Admin account setup.</p>
        </div>
        <div className="my-6 border-t border-white/10" />
        <div className="space-y-4">
          <input
            className="glass-input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleSubmit();
            }}
            placeholder="Minimum 8 characters"
            autoComplete="new-password"
            minLength={8}
            required
            disabled={!token}
          />
          <div>
            <input
              className="glass-input"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handleSubmit();
              }}
              placeholder="Confirm password"
              autoComplete="new-password"
              required
              disabled={!token}
            />
            {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
          </div>
          <button className="btn-primary flex w-full items-center justify-center gap-2 py-3" type="button" disabled={!token || isLoading} onClick={() => void handleSubmit()}>
            {isLoading ? <LoadingSpinner size="sm" /> : null}
            Activate Account
          </button>
        </div>
      </div>
    </div>
  );
}
