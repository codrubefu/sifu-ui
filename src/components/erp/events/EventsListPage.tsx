import { CalendarClock, Edit3, Eye, Plus, Search, Tags, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { eventService, type EventFilters, type EventItem } from '../../../services/eventService';
import { ButtonLink, SectionCard, Toast } from '../../primitives';
import { useEventReferenceData, useEvents, usePermissions } from './hooks';
import { eventLocationLabel, eventStatuses } from './helpers';
import { formatDeviceDate } from '../../../utils/erp/formatters';
import { CategoryBadge, DeleteConfirmModal, Pagination, RecurrenceBadge, SelectField, ServiceRequirementBadge, StatusBadge, TextField } from './ui';

const eventsFilterDefaults: Record<string, string> = { page: '1', search: '', category_id: '', status: '', recurrence_type: '', requires_active_service: '', requires_payment: '', sort: 'created_at', direction: 'desc' };

export function EventsListPage() {
  const { t } = useTranslation();
  const permissions = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters: Required<EventFilters> = useMemo(() => ({
    page: Number(searchParams.get('page')) || 1,
    per_page: 15,
    search: searchParams.get('search') ?? '',
    category_id: searchParams.get('category_id') ?? '',
    status: searchParams.get('status') ?? '',
    recurrence_type: searchParams.get('recurrence_type') ?? '',
    requires_active_service: searchParams.get('requires_active_service') ?? '',
    requires_payment: searchParams.get('requires_payment') ?? '',
    sort: (searchParams.get('sort') as EventFilters['sort']) ?? 'created_at',
    direction: (searchParams.get('direction') as EventFilters['direction']) ?? 'desc',
  }), [searchParams]);
  const updateFilters = useCallback((patch: Partial<EventFilters>) => {
    setSearchParams((prev) => {
      const merged = { ...filters, ...patch };
      const next = new URLSearchParams(prev);
      (Object.keys(eventsFilterDefaults) as Array<keyof typeof eventsFilterDefaults>).forEach((key) => {
        const value = String(merged[key as keyof EventFilters] ?? '');
        if (value === eventsFilterDefaults[key]) next.delete(key);
        else next.set(key, value);
      });
      return next;
    });
  }, [filters, setSearchParams]);
  const { events, meta, loading, error, reload } = useEvents(filters);
  const { categories } = useEventReferenceData();
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deleting, setDeleting] = useState<EventItem | null>(null);

  if (!permissions.canViewEvents) return <SectionCard title={t('events.title')}><p className="text-sm text-slate-600">{t('events.missingViewRight')}</p></SectionCard>;

  const deleteEvent = async () => {
    if (!deleting) return;
    try {
      await eventService.deleteEvent(deleting.id);
      setToast({ type: 'success', message: t('events.deleted') });
      setDeleting(null);
      await reload();
    } catch (err) {
      setToast({ type: 'error', message: err instanceof Error ? err.message : t('events.deleteError') });
    }
  };

  return (
    <div className="space-y-6">
      {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
      <SectionCard title={t('events.managementTitle')} action={<div className="flex flex-wrap gap-2"><ButtonLink to="calendar" variant="secondary"><CalendarClock className="h-4 w-4" />{t('events.calendar')}</ButtonLink>{permissions.canManageEvents ? <ButtonLink to="categories" variant="secondary"><Tags className="h-4 w-4" />{t('events.eventCategories')}</ButtonLink> : null}{permissions.canManageEvents ? <ButtonLink to="new" variant="primary"><Plus className="h-4 w-4" />{t('events.create')}</ButtonLink> : null}</div>}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-9">
          <TextField label={t('events.searchTitle')} value={filters.search} onChange={(e) => updateFilters({ search: e.target.value, page: 1 })} />
          <SelectField label={t('events.category')} value={filters.category_id} onChange={(e) => updateFilters({ category_id: e.target.value, page: 1 })}><option value="">{t('common.all')}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</SelectField>
          <SelectField label={t('common.status')} value={filters.status} onChange={(e) => updateFilters({ status: e.target.value, page: 1 })}><option value="">{t('common.all')}</option>{eventStatuses.map((s) => <option key={s}>{s}</option>)}</SelectField>
          <SelectField label={t('events.recurrence')} value={filters.recurrence_type} onChange={(e) => updateFilters({ recurrence_type: e.target.value, page: 1 })}><option value="">{t('common.all')}</option><option value="once">once</option><option value="weekly">weekly</option><option value="monthly">monthly</option></SelectField>
          <SelectField label={t('services.service')} value={filters.requires_active_service} onChange={(e) => updateFilters({ requires_active_service: e.target.value, page: 1 })}><option value="">{t('common.all')}</option><option value="1">{t('common.yes')}</option><option value="0">{t('common.no')}</option></SelectField>
          <SelectField label={t('events.paidEvent')} value={filters.requires_payment} onChange={(e) => updateFilters({ requires_payment: e.target.value, page: 1 })}><option value="">{t('common.all')}</option><option value="1">{t('common.yes')}</option><option value="0">{t('common.no')}</option></SelectField>
          <SelectField label={t('events.sort')} value={filters.sort} onChange={(e) => updateFilters({ sort: e.target.value as EventFilters['sort'] })}><option value="created_at">created_at</option><option value="start_date">start_date</option><option value="title">title</option></SelectField>
          <SelectField label={t('events.direction')} value={filters.direction} onChange={(e) => updateFilters({ direction: e.target.value as EventFilters['direction'] })}><option value="desc">desc</option><option value="asc">asc</option></SelectField>
          <button onClick={() => void reload()} className="mt-7 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white"><Search className="h-4 w-4" />{t('common.search')}</button>
        </div>
        {error ? <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead><tr className="border-b text-slate-500"><th className="pb-3">{t('common.title')}</th><th className="pb-3">{t('events.category')}</th><th className="pb-3">{t('events.date')}</th><th className="pb-3">{t('events.recurrence')}</th><th className="pb-3">{t('services.service')}</th><th className="pb-3">{t('events.paidEvent')}</th><th className="pb-3">{t('common.status')}</th><th className="pb-3 text-right">{t('common.actions')}</th></tr></thead>
            <tbody>{events.length ? events.map((event) => (
              <tr key={event.id} className="border-b border-slate-100 align-top">
                <td className="py-4 font-medium text-slate-900">{event.title}<p className="text-xs font-normal text-slate-500">{eventLocationLabel(event) || '-'}</p></td>
                <td className="py-4"><CategoryBadge category={event.category} /></td>
                <td className="py-4 text-slate-600">{formatDeviceDate(event.start_date)} {event.start_time}-{event.end_time}</td>
                <td className="py-4"><RecurrenceBadge type={event.recurrence_type} /></td>
                <td className="py-4"><ServiceRequirementBadge event={event} /></td>
                <td className="py-4">{event.requires_payment ? <span className="font-medium text-slate-900">{event.payment_amount ?? '-'} {event.payment_type ?? ''}</span> : '-'}</td>
                <td className="py-4"><StatusBadge status={event.status} /></td>
                <td className="py-4"><div className="flex flex-wrap justify-end gap-2">
                  <Link to={`${event.id}`} className="rounded-lg border px-3 py-2"><Eye className="h-4 w-4" /></Link>
                  {permissions.canManageEvents ? <Link to={`${event.id}/edit`} className="rounded-lg border px-3 py-2"><Edit3 className="h-4 w-4" /></Link> : null}
                  <Link to={`${event.id}?tab=occurrences`} className="rounded-lg border px-3 py-2"><CalendarClock className="h-4 w-4" /></Link>
                  {permissions.canManageEvents ? <button onClick={() => setDeleting(event)} className="rounded-lg border border-red-100 px-3 py-2 text-red-600"><Trash2 className="h-4 w-4" /></button> : null}
                </div></td>
              </tr>
            )) : <tr><td colSpan={8} className="py-10 text-center text-slate-500">{loading ? t('events.loadingList') : t('events.empty')}</td></tr>}</tbody>
          </table>
        </div>
        <div className="mt-4"><Pagination page={meta.current_page} lastPage={meta.last_page} onPage={(page) => updateFilters({ page })} /></div>
      </SectionCard>
      {deleting ? <DeleteConfirmModal label={deleting.title} onCancel={() => setDeleting(null)} onConfirm={() => void deleteEvent()} /> : null}
    </div>
  );
}
