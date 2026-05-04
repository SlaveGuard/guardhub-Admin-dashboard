import { ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../../api/admin';
import { getErrorMessage } from '../../components/ErrorState';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useAdminAuthStore } from '../../store/adminAuthStore';

export function AdminLoginScreen() {
  const navigate = useNavigate();
  const setAuth = useAdminAuthStore((state) => state.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    try {
      const result = await adminLogin(email, password);
      setAuth(result.accessToken, result.refreshToken, result.admin);
      toast.success('Welcome back');
      navigate('/admin/overview');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Login failed'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="glass-panel w-full max-w-md p-8">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-400">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-3xl font-bold text-slate-100">GuardHub Admin</h1>
          <p className="mt-2 text-sm text-slate-400">Operator Access - Restricted</p>
        </div>
        <div className="my-6 border-t border-white/10" />
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input className="glass-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" autoComplete="email" required />
          <input className="glass-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" autoComplete="current-password" required />
          <button className="btn-primary flex w-full items-center justify-center gap-2 py-3" type="submit" disabled={isLoading}>
            {isLoading ? <LoadingSpinner size="sm" /> : null}
            Sign In
          </button>
        </form>
        <p className="mt-6 text-center text-xs leading-5 text-slate-500">
          This portal is for GuardHub operators only. Unauthorized access is monitored and audited.
        </p>
      </div>
    </div>
  );
}
