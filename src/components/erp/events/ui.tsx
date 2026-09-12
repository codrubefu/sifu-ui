import { ChevronLeft, ChevronRight } from 'lucide-react';
import type React from 'react';
import { useTranslation } from 'react-i18next';
import type { EventCategory, EventItem, EventOccurrence, RecurrenceType } from '../../../services/eventService';
import { Modal } from '../../primitives';

export function TextField({ label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input {...props} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
      {error ? <span className="mt-1 block text-xs font-medium text-red-600">{error}</span> : null}
    </label>
  );
}

export function SelectField({ label, error, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <select {...props} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100">{children}</select>
      {error ? <span className="mt-1 block text-xs font-medium text-red-600">{error}</span> : null}
    </label>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone = status.includes('cancel') || status === 'inactive' ? 'bg-red-50 text-red-700' : status === 'active' || status === 'scheduled' || status === 'registered' || status === 'attended' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700';
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${tone}`}>{status}</span>;
}

export function RecurrenceBadge({ type }: { type: RecurrenceType }) {
  return <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">{type}</span>;
}

export function CategoryBadge({ category }: { category?: EventCategory | null }) {
  if (!category) return <span className="text-xs text-slate-400">-</span>;
  return <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.color ?? '#64748b' }} />{category.name}</span>;
}

export function ServiceRequirementBadge({ event }: { event: Pick<EventItem, 'requires_active_service' | 'required_service'> }) {
  const { t } = useTranslation();
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${event.requires_active_service ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>{event.requires_active_service ? t('events.requiresService', { name: event.required_service?.name ? `: ${event.required_service.name}` : '' }) : t('events.noRequiredService')}</span>;
}

export function DeleteConfirmModal({ label, loading, onCancel, onConfirm }: { label: string; loading?: boolean; onCancel: () => void; onConfirm: () => void }) {
  const { t } = useTranslation();
  return (
    <Modal open onClose={onCancel} title={t('events.deleteConfirmTitle')} maxWidthClassName="max-w-md">
      <p className="text-sm text-slate-600">{t('events.deleteConfirm', { label })}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium">{t('common.cancel')}</button>
        <button onClick={onConfirm} disabled={loading} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{t('common.delete')}</button>
      </div>
    </Modal>
  );
}

export function CancelOccurrenceConfirmModal({ occurrence, loading, onCancel, onConfirm }: { occurrence: EventOccurrence; loading?: boolean; onCancel: () => void; onConfirm: () => void }) {
  const { t } = useTranslation();
  return (
    <Modal open onClose={onCancel} title={t('events.cancelOccurrenceConfirmTitle')} maxWidthClassName="max-w-md">
      <p className="text-sm text-slate-600">{t('events.cancelOccurrenceConfirm', { date: occurrence.occurrence_date })}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium">{t('common.cancel')}</button>
        <button onClick={onConfirm} disabled={loading} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{t('events.cancelOccurrenceConfirmButton')}</button>
      </div>
    </Modal>
  );
}

export function Pagination({ page, lastPage, onPage }: { page: number; lastPage: number; onPage: (page: number) => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-end gap-2">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
      <span className="text-sm text-slate-600">{t('events.pageOf', { page, lastPage })}</span>
      <button disabled={page >= lastPage} onClick={() => onPage(page + 1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
    </div>
  );
}
