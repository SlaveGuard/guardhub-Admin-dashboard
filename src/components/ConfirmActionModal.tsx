import { AlertTriangle, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

type ConfirmActionModalProps = {
  isOpen: boolean;
  title: string;
  description: string;
  actionLabel: string;
  variant: 'danger' | 'warning' | 'default';
  requireReason: boolean;
  isLoading: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
};

export function ConfirmActionModal({
  isOpen,
  ...props
}: ConfirmActionModalProps) {
  if (!isOpen) return null;
  return <ConfirmActionModalContent {...props} />;
}

function ConfirmActionModalContent({
  title,
  description,
  actionLabel,
  variant,
  requireReason,
  isLoading,
  onConfirm,
  onCancel,
}: Omit<ConfirmActionModalProps, 'isOpen'>) {
  const [reason, setReason] = useState('');
  const trimmedReason = reason.trim();
  const reasonInvalid = requireReason && trimmedReason.length < 4;
  const Icon = variant === 'danger' ? AlertTriangle : Info;
  const confirmClass =
    variant === 'danger'
      ? 'btn-danger'
      : variant === 'warning'
        ? 'rounded-xl bg-amber-600/90 px-4 py-2 font-semibold text-white transition-all hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50'
        : 'btn-primary';

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-action-title"
      onClick={isLoading ? undefined : onCancel}
    >
      <div className="glass-panel w-full max-w-md p-6" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className={variant === 'danger' ? 'rounded-xl bg-red-500/10 p-2 text-red-400' : 'rounded-xl bg-violet-500/10 p-2 text-violet-400'}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-100" id="confirm-action-title">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
          </div>
        </div>

        {requireReason ? (
          <div className="mt-5">
            <label className="text-sm font-medium text-slate-300" htmlFor="confirm-action-reason">
              Reason for this action (required for audit trail)
            </label>
            <textarea
              className="glass-input mt-2 resize-none"
              id="confirm-action-reason"
              maxLength={500}
              rows={3}
              value={reason}
              placeholder="Describe why you are taking this action..."
              onChange={(event) => setReason(event.target.value)}
            />
            {reasonInvalid ? <p className="mt-2 text-sm text-red-400">Reason must be at least 4 characters</p> : null}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button className="btn-secondary" type="button" disabled={isLoading} onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`${confirmClass} inline-flex items-center justify-center gap-2`}
            type="button"
            disabled={isLoading || reasonInvalid}
            onClick={() => onConfirm(trimmedReason)}
          >
            {isLoading ? <LoadingSpinner size="sm" /> : null}
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
