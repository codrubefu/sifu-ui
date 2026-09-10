import type React from 'react';
import { cn } from '../../../utils/ui/cn';

type AlertTone = 'error' | 'success' | 'info' | 'warning';

const toneClasses: Record<AlertTone, string> = {
  error: 'border-red-100 bg-red-50 text-red-700',
  success: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  info: 'border-slate-100 bg-slate-50 text-slate-600',
  warning: 'border-amber-100 bg-amber-50 text-amber-800',
};

export function Alert({ tone = 'info', className, children }: { tone?: AlertTone; className?: string; children: React.ReactNode }) {
  return <p className={cn('rounded-lg border px-4 py-3 text-sm font-medium', toneClasses[tone], className)}>{children}</p>;
}
