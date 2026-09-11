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
    <div className="stat-card">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">{title}</p>
        <Icon className="h-4 w-4 text-slate-500" />
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="stat-value">{value}</p>
        <p className="text-[11px] text-indigo-600">{change}</p>
      </div>
      <p className="mt-5 text-xs leading-5 text-slate-500">{helper}</p>
    </div>
  );
}
