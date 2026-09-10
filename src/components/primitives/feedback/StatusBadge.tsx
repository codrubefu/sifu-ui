import { cn } from '../../../utils/ui/cn';

type StatusBadgeProps = {
  status: string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const map: Record<string, string> = {
    Activ: 'bg-emerald-100 text-emerald-700',
    Inactiv: 'bg-slate-200 text-slate-700',
    Expirat: 'bg-amber-100 text-amber-700',
    Suspendat: 'bg-rose-100 text-rose-700',
    Consumat: 'bg-slate-200 text-slate-700',
    Rezervat: 'bg-cyan-100 text-cyan-700',
    Draft: 'bg-slate-100 text-slate-700',
    Programat: 'bg-violet-100 text-violet-700',
    Publicat: 'bg-emerald-100 text-emerald-700',
    Plătit: 'bg-emerald-100 text-emerald-700',
    'În așteptare': 'bg-amber-100 text-amber-700',
    Eșuat: 'bg-rose-100 text-rose-700',
    Active: 'bg-emerald-100 text-emerald-700',
    Inactive: 'bg-slate-200 text-slate-700',
    Expired: 'bg-amber-100 text-amber-700',
    Suspended: 'bg-rose-100 text-rose-700',
    Consumed: 'bg-slate-200 text-slate-700',
    Reserved: 'bg-cyan-100 text-cyan-700',
    Scheduled: 'bg-violet-100 text-violet-700',
    Published: 'bg-emerald-100 text-emerald-700',
    Paid: 'bg-emerald-100 text-emerald-700',
    Pending: 'bg-amber-100 text-amber-700',
    Failed: 'bg-rose-100 text-rose-700',
  };

  const tone = map[status] ?? map[status.trim()] ?? Object.entries(map).find(([key]) => key.toLowerCase() === status.trim().toLowerCase())?.[1];

  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold leading-none', tone ?? 'bg-slate-100 text-slate-700')}>{status}</span>;
}
