import React from 'react';

type StatCardProps = {
  title: string;
  value: string;
  change: string;
  icon: React.ComponentType<{ className?: string }>;
  helper: string;
};

export function StatCard({ title, value, change, icon: Icon, helper }: StatCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.035)] transition-colors hover:border-indigo-200 lg:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-slate-500">{title}</p>
          <p className="mt-2 truncate text-2xl font-bold text-slate-950 xl:text-[1.75rem]">{value}</p>
          <p className="mt-2 text-xs font-semibold text-emerald-600">{change}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
        </div>
        <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600 ring-1 ring-indigo-100">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
