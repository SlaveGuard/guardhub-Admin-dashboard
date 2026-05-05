import { Badge } from './Badge';

type InvoiceStatusBadgeProps = {
  status: string;
};

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  if (status === 'paid') return <Badge variant="green">paid</Badge>;
  if (status === 'open') return <Badge variant="yellow">open</Badge>;
  if (status === 'uncollectible') return <Badge variant="red">uncollectible</Badge>;
  return <Badge variant="slate">{status}</Badge>;
}
