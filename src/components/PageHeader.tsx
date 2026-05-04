import type { ReactNode } from 'react';

type PageHeaderProps = { title: string; subtitle?: string; actions?: ReactNode };

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">{title}</h1>
        {subtitle ? <p className="mt-1 text-slate-400">{subtitle}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  );
}
