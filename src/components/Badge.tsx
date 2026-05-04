import type { ReactNode } from 'react';

type BadgeProps = { variant: 'green' | 'red' | 'yellow' | 'violet' | 'slate'; children: ReactNode };

export function Badge({ variant, children }: BadgeProps) {
  return <span className={`badge-${variant}`}>{children}</span>;
}
