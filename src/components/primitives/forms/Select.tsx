import React from 'react';
import { cn } from '../../../utils/ui/cn';

type SelectProps = {
  label: string;
  children: React.ReactNode;
} & React.SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ label, children, className, ...props }: SelectProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-slate-600">{label}</span>
      <select {...props} className={cn('h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition-colors hover:border-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500', className)}>
        {children}
      </select>
    </label>
  );
}
