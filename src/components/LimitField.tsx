type LimitFieldProps = {
  label: string;
  value?: number | null;
};

export function LimitField({ label, value }: LimitFieldProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1">
        {value == null ? (
          <span className="font-semibold text-green-400">Unlimited</span>
        ) : (
          <span className="font-bold text-slate-100">{value}</span>
        )}
      </p>
    </div>
  );
}
