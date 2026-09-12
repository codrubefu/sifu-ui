import { Plus, RefreshCw, Users, X } from 'lucide-react';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { eventService, type EventOccurrence, type OccurrenceFilters } from '../../../services/eventService';
import { Toast } from '../../primitives';
import { useEventOccurrences, usePermissions } from './hooks';
import { occurrenceStatuses } from './helpers';
import { CancelOccurrenceConfirmModal, SelectField, StatusBadge, TextField } from './ui';
import { OccurrenceParticipantsPanel } from './OccurrenceParticipantsPanel';

export function EventOccurrencesTab({ eventId }: { eventId: number }) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => ({
    date_from: searchParams.get('date_from') ?? '',
    date_to: searchParams.get('date_to') ?? '',
    status: searchParams.get('status') ?? '',
  }), [searchParams]);
  const updateFilters = useCallback((patch: Partial<OccurrenceFilters>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      const merged = { ...filters, ...patch };
      (Object.keys(merged) as Array<keyof typeof merged>).forEach((key) => {
        const value = merged[key];
        if (value) next.set(key, String(value));
        else next.delete(key);
      });
      return next;
    });
  }, [filters, setSearchParams]);
  const { occurrences, loading, error, reload } = useEventOccurrences(eventId, filters);
  const permissions = usePermissions();
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [cancelling, setCancelling] = useState<EventOccurrence | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const focusedOccurrenceParam = searchParams.get('occurrence');
  const [expandedOccurrenceId, setExpandedOccurrenceId] = useState<number | null>(focusedOccurrenceParam ? Number(focusedOccurrenceParam) : null);
  const [showAddForOccurrence, setShowAddForOccurrence] = useState<number | null>(null);

  // Consume the deep-link "occurrence" query param once so collapsing the row does not keep re-expanding it.
  useEffect(() => {
    if (!focusedOccurrenceParam) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('occurrence');
      return next;
    }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmCancelOccurrence = async () => {
    if (!cancelling) return;
    setCancelLoading(true);
    try {
      await eventService.cancelOccurrence(cancelling.id);
      setToast({ type: 'success', message: t('events.occurrenceCancelled') });
      setCancelling(null);
      await reload();
    } catch (err) {
      setToast({ type: 'error', message: err instanceof Error ? err.message : t('events.cancelOccurrenceError') });
    } finally {
      setCancelLoading(false);
    }
  };

  const toggleParticipants = (occurrence: EventOccurrence) => {
    setExpandedOccurrenceId((prev) => {
      if (prev === occurrence.id) {
        setShowAddForOccurrence(null);
        return null;
      }
      setShowAddForOccurrence(null);
      return occurrence.id;
    });
  };

  const openQuickAdd = (occurrence: EventOccurrence) => {
    setExpandedOccurrenceId(occurrence.id);
    setShowAddForOccurrence(occurrence.id);
  };

  const closeParticipants = () => {
    setExpandedOccurrenceId(null);
    setShowAddForOccurrence(null);
  };

  return (
    <div>
      {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
      {cancelling ? <CancelOccurrenceConfirmModal occurrence={cancelling} loading={cancelLoading} onCancel={() => setCancelling(null)} onConfirm={() => void confirmCancelOccurrence()} /> : null}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4"><TextField label={t('events.dateFrom')} type="date" value={filters.date_from} onChange={(e) => updateFilters({ date_from: e.target.value })} /><TextField label={t('events.dateTo')} type="date" value={filters.date_to} onChange={(e) => updateFilters({ date_to: e.target.value })} /><SelectField label={t('common.status')} value={filters.status} onChange={(e) => updateFilters({ status: e.target.value })}><option value="">{t('common.all')}</option>{occurrenceStatuses.map((s) => <option key={s}>{s}</option>)}</SelectField><button onClick={() => void reload()} className="mt-7 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white"><RefreshCw className="mr-2 inline h-4 w-4" />{t('events.filter')}</button></div>
      {error ? <p className="mt-4 text-red-600">{error}</p> : null}
      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead><tr className="border-b text-slate-500"><th className="pb-3">{t('events.occurrenceDate')}</th><th className="pb-3">{t('events.startDatetime')}</th><th className="pb-3">{t('events.endDatetime')}</th><th className="pb-3">{t('common.status')}</th><th className="pb-3">{t('events.participants')}</th><th className="pb-3">{t('events.places')}</th><th className="pb-3 text-right">{t('common.actions')}</th></tr></thead>
          <tbody>
            {occurrences.length ? occurrences.map((o) => (
              <Fragment key={o.id}>
                <tr className="border-b border-slate-100">
                  <td className="py-4">{o.occurrence_date}</td><td>{o.start_datetime}</td><td>{o.end_datetime}</td><td><StatusBadge status={o.status} /></td><td>{o.participants_count}</td><td>{o.available_places ?? t('events.unlimited')}</td>
                  <td>
                    <div className="flex justify-end gap-2">
                      {permissions.canViewParticipants ? <button type="button" onClick={() => toggleParticipants(o)} aria-expanded={expandedOccurrenceId === o.id} title={t('events.viewParticipants')} className={`rounded-lg border px-3 py-2 ${expandedOccurrenceId === o.id ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : ''}`}><Users className="h-4 w-4" /></button> : null}
                      {permissions.canManageParticipants ? <button type="button" onClick={() => openQuickAdd(o)} title={t('events.addParticipant')} className="rounded-lg border px-3 py-2"><Plus className="h-4 w-4" /></button> : null}
                      {permissions.canManageEvents ? <button onClick={() => setCancelling(o)} disabled={o.status === 'cancelled' || o.status === 'completed'} title={t('events.cancelOccurrence')} className="rounded-lg border px-3 py-2 text-red-600 disabled:cursor-not-allowed disabled:opacity-40"><X className="h-4 w-4" /></button> : null}
                    </div>
                  </td>
                </tr>
                {expandedOccurrenceId === o.id ? (
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <td colSpan={7} className="p-0">
                      <div className="p-4">
                        <OccurrenceParticipantsPanel
                          occurrenceId={o.id}
                          showAdd={showAddForOccurrence === o.id}
                          onShowAddChange={(value) => setShowAddForOccurrence(value ? o.id : null)}
                          onClose={closeParticipants}
                          onParticipantsChanged={() => void reload()}
                          onNotify={setToast}
                        />
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            )) : <tr><td colSpan={7} className="py-10 text-center text-slate-500">{loading ? t('common.loading') : t('events.noOccurrences')}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
