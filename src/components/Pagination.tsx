type PaginationProps = { page: number; totalPages: number; onPage: (n: number) => void };

export function Pagination({ page, totalPages, onPage }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <button className="btn-secondary" type="button" disabled={page <= 1} onClick={() => onPage(1)}>
        First
      </button>
      <button className="btn-secondary" type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </button>
      <span className="text-sm text-slate-400">Page {page} of {totalPages}</span>
      <button className="btn-secondary" type="button" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        Next
      </button>
      <button className="btn-secondary" type="button" disabled={page >= totalPages} onClick={() => onPage(totalPages)}>
        Last
      </button>
    </div>
  );
}
