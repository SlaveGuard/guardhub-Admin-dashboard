type MoneyAmountProps = {
  amountCents: number;
  currency: string;
};

function formatAmount(cents: number, currency: string) {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  });
}

export function MoneyAmount({ amountCents, currency }: MoneyAmountProps) {
  return <span className="font-mono text-slate-200">{formatAmount(amountCents, currency)}</span>;
}
