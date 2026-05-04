import type { LucideIcon } from 'lucide-react';

type EmptyStateProps = { icon: LucideIcon; title: string; subtitle?: string };

export function EmptyState({ icon: Icon, title, subtitle }: EmptyStateProps) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 p-8 text-center">
      <div className="rounded-full bg-white/5 p-4 text-violet-400">
        <Icon className="h-8 w-8" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-100">{title}</h2>
      {subtitle ? <p className="mt-1 max-w-md text-sm text-slate-400">{subtitle}</p> : null}
    </div>
  );
}
