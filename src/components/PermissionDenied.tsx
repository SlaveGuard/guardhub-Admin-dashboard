import { ShieldOff } from 'lucide-react';

type PermissionDeniedProps = { description: string; note?: string };

export function PermissionDenied({ description, note }: PermissionDeniedProps) {
  return (
    <div className="glass-panel flex min-h-96 flex-col items-center justify-center p-8 text-center">
      <div className="rounded-full bg-red-500/10 p-4 text-red-400">
        <ShieldOff className="h-10 w-10" />
      </div>
      <h2 className="mt-5 text-2xl font-bold text-slate-100">Access Restricted</h2>
      <p className="mt-2 max-w-lg text-slate-400">{description}</p>
      {note ? <p className="mt-2 text-sm text-slate-500">{note}</p> : null}
    </div>
  );
}
