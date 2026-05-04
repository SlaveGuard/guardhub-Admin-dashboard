import type { ReactNode } from 'react';

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="mb-1 mt-4 px-4 text-xs font-semibold uppercase tracking-widest text-slate-600">{children}</div>;
}
