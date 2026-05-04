import { AlertTriangle } from 'lucide-react';

type ErrorStateProps = { message?: string; onRetry?: () => void };

export function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    if (typeof response?.data?.message === 'string') return response.data.message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="glass-panel flex flex-col items-center justify-center gap-4 border-red-500/20 bg-red-500/5 p-8 text-center">
      <div className="rounded-full bg-red-500/10 p-3 text-red-400">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Unable to load data</h2>
        <p className="mt-1 text-sm text-slate-400">{message ?? 'The admin API returned an error.'}</p>
      </div>
      {onRetry ? (
        <button className="btn-secondary" type="button" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}
