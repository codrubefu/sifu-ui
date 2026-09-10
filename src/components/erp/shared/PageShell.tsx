import { ArrowLeft } from 'lucide-react';
import type { PageShellProps } from './types';

export function PageShell({ title, subtitle, backLabel, onBack, children }: PageShellProps) {
  const hasHeader = Boolean(title || subtitle || (onBack && backLabel));

  return (
    <div className="space-y-5">
      {hasHeader ? <div className="border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            {onBack && backLabel ? (
              <button onClick={onBack} className="mb-3 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                <ArrowLeft className="h-4 w-4" />
                {backLabel}
              </button>
            ) : null}
            {title ? <h2 className="mt-1 text-xl font-bold text-slate-950">{title}</h2> : null}
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
        </div>
      </div> : null}
      {children}
    </div>
  );
}
