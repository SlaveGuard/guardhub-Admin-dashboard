import type { LucideIcon } from 'lucide-react';

type StatCardProps = { label: string; value: string | number; icon: LucideIcon; color?: 'violet' | 'green' | 'red' | 'yellow' | 'slate' };

const colorClasses = {
  violet: 'text-violet-400 bg-violet-500/10',
  green: 'text-green-400 bg-green-500/10',
  red: 'text-red-400 bg-red-500/10',
  yellow: 'text-yellow-400 bg-yellow-500/10',
  slate: 'text-slate-400 bg-slate-500/10',
};

export function StatCard({ label, value, icon: Icon, color = 'slate' }: StatCardProps) {
  return (
    <div className="stat-card flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-bold text-slate-100">{value}</p>
      </div>
      <div className={`rounded-xl p-3 ${colorClasses[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}
