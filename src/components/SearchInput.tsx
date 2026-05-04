import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';

type SearchInputProps = { value: string; onChange: (value: string) => void; placeholder?: string };

export function SearchInput({ value, onChange, placeholder = 'Search' }: SearchInputProps) {
  const [draft, setDraft] = useState(value);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setDraft(value), [value]);

  useEffect(() => {
    const handle = window.setTimeout(() => onChange(draft), 300);
    return () => window.clearTimeout(handle);
  }, [draft, onChange]);

  return (
    <div className="relative min-w-64 flex-1">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input className="glass-input pl-11" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={placeholder} />
    </div>
  );
}
