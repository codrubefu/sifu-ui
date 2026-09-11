import React from 'react';

type SectionCardProps = {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
};

export function SectionCard({ title, action, children }: SectionCardProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-none">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-white px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between lg:px-5">
        <h3 className="min-w-0 text-sm font-medium normal-case tracking-normal text-slate-800">{title}</h3>
        {action ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{action}</div> : null}
      </div>
      <div className="p-3 sm:p-4 lg:p-5">{children}</div>
    </section>
  );
}
