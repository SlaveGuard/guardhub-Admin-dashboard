import { Badge } from './Badge';

type BillingStatusBadgeProps = {
  status: string | null | undefined;
};

const statusLabels: Record<string, string> = {
  active: 'Active',
  trialing: 'Trialing',
  past_due: 'Past Due',
  canceled: 'Canceled',
  unpaid: 'Unpaid',
  incomplete: 'Incomplete',
};

export function BillingStatusBadge({ status }: BillingStatusBadgeProps) {
  if (status === 'active') return <Badge variant="green">{statusLabels[status]}</Badge>;
  if (status === 'trialing') return <Badge variant="violet">{statusLabels[status]}</Badge>;
  if (status === 'past_due' || status === 'canceled' || status === 'unpaid') return <Badge variant="red">{statusLabels[status]}</Badge>;
  if (status === 'incomplete') return <Badge variant="yellow">{statusLabels[status]}</Badge>;
  return <Badge variant="slate">{status ? statusLabels[status] ?? status : 'Unknown'}</Badge>;
}
