import type { ReactNode } from 'react';
import { getErrorMessage } from './ErrorState';
import { LoadingSpinner } from './LoadingSpinner';

export type Column<T> = { key: string; label: string; render?: (row: T) => ReactNode; width?: string };

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  isLoading: boolean;
  error?: unknown;
  emptyMessage?: string;
  getRowClassName?: (row: T) => string;
};

export function DataTable<T>({ columns, data, isLoading, error, emptyMessage = 'No records found.', getRowClassName }: DataTableProps<T>) {
  if (error) {
    return <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">{getErrorMessage(error)}</div>;
  }

  if (!isLoading && data.length === 0) {
    return <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-400">{emptyMessage}</div>;
  }

  return (
    <div className="glass-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/5">
          <thead className="bg-slate-950/50">
            <tr>
              {columns.map((column) => (
                <th className="table-header-cell" key={column.key} style={column.width ? { width: column.width } : undefined}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-4 py-12" colSpan={columns.length}>
                  <div className="flex justify-center">
                    <LoadingSpinner />
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr className={`table-row ${getRowClassName?.(row) ?? ''}`} key={index}>
                  {columns.map((column) => (
                    <td className="table-cell" key={column.key}>
                      {column.render ? column.render(row) : String(row[column.key as keyof T] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
