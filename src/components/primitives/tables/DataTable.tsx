import type React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../utils/ui/cn';

export function TableShell({ className, children }: { className?: string; children: React.ReactNode }) {
  const { t } = useTranslation();

  return (
    <div className={cn('sm:overflow-hidden sm:rounded-lg sm:border sm:border-slate-200 sm:bg-white sm:shadow-sm', className)}>
      <p className="hidden border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 sm:block">
        {t('common.mobileTableHint')}
      </p>
      <div className="overflow-x-auto focus:outline-none focus:ring-4 focus:ring-inset focus:ring-indigo-100" role="region" aria-label={t('common.scrollableTable')} tabIndex={0}>
        {children}
      </div>
    </div>
  );
}

// Below `sm`, the table renders as a stack of labelled cards (one per row) instead of
// forcing horizontal scroll on phones. `TableHeadCell` text is hidden and re-shown per
// cell via `TableCell`'s `label` prop. At `sm` and up it's a regular scrollable table.
export function DataTable({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <table
      className={cn(
        'block w-full border-separate border-spacing-0 text-left text-sm text-slate-700',
        '[&_thead]:hidden [&_tbody]:block',
        'sm:table sm:min-w-[920px] sm:[&_thead]:table-header-group sm:[&_tbody]:table-row-group',
        'sm:[&_tbody_tr:nth-child(even)]:bg-slate-50/45',
        className,
      )}
    >
      {children}
    </table>
  );
}

export function TableRow({ className, children, ...props }: React.ComponentPropsWithoutRef<'tr'>) {
  return (
    <tr
      {...props}
      className={cn(
        'group mb-2.5 block overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-colors last:mb-0',
        'sm:mb-0 sm:table-row sm:rounded-none sm:border-0 sm:bg-transparent sm:shadow-none sm:hover:bg-indigo-50/30',
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function TableHeadCell({ align = 'left', className, children }: { align?: 'left' | 'right'; className?: string; children: React.ReactNode }) {
  return <th className={cn('border-b border-slate-200 bg-slate-50 px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.07em] text-slate-500 first:pl-5 last:pr-5', align === 'right' && 'text-right', className)}>{children}</th>;
}

// `label` repeats the column header on mobile, where the row becomes a card and the
// table header itself is hidden.
export function TableCell({ align = 'left', className, children, colSpan, label }: { align?: 'left' | 'right'; className?: string; children: React.ReactNode; colSpan?: number; label?: string }) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        'block border-b border-slate-100 px-3 py-2.5 align-top transition-colors last:border-b-0',
        'sm:table-cell sm:border-b sm:px-4 sm:py-3 sm:first:pl-5 sm:last:border-b sm:last:pr-5 group-hover:bg-indigo-50/30',
        align === 'right' && 'sm:text-right',
        className,
      )}
    >
      {label ? <span className="mb-0.5 block text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-slate-400 sm:hidden">{label}</span> : null}
      {children}
    </td>
  );
}

export function EmptyTableRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-10 text-center text-sm text-slate-500">{children}</TableCell>
    </TableRow>
  );
}
