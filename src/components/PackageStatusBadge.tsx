import { Badge } from './Badge';
import type { PackageStatus } from '../types/admin';

const statusVariants: Record<PackageStatus, 'green' | 'red' | 'yellow' | 'violet'> = {
  draft: 'yellow',
  active: 'green',
  grandfathered: 'violet',
  retired: 'red',
};

type PackageStatusBadgeProps = {
  status: PackageStatus;
};

export function PackageStatusBadge({ status }: PackageStatusBadgeProps) {
  return <Badge variant={statusVariants[status]}>{status}</Badge>;
}
