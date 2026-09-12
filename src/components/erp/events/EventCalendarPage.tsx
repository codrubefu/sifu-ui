import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { eventService, type EventOccurrence } from '../../../services/eventService';
import { ButtonLink, SectionCard } from '../../primitives';
import { useEventReferenceData } from './hooks';
import { addDays, calendarFetchRange, calendarRange, type CalendarMode, dateToDateInput, eventLocationLabel, formatDateKey, occurrenceStatuses, timeToHourMinute, weekdayLabelKeys, weekdays } from './helpers';
import { SelectField } from './ui';
import { deviceLocale } from '../../../utils/erp/formatters';

export function EventCalendarPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const mode: CalendarMode = searchParams.get('mode') === 'week' ? 'week' : 'month';
  const anchorParam = searchParams.get('anchor');
  const anchor = useMemo(() => {
    if (!anchorParam) return new Date();
    const parsed = new Date(anchorParam);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [anchorParam]);
  const categoryId = searchParams.get('category_id') ?? '';
  const status = searchParams.get('status') ?? '';
  const setMode = useCallback((next: CalendarMode) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (next === 'month') params.delete('mode');
      else params.set('mode', next);
      return params;
    });
  }, [setSearchParams]);
  const setAnchor = useCallback((updater: Date | ((current: Date) => Date)) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      const current = anchor;
      const next = typeof updater === 'function' ? (updater as (current: Date) => Date)(current) : updater;
      const key = formatDateKey(next);
      if (key === formatDateKey(new Date())) params.delete('anchor');
      else params.set('anchor', key);
      return params;
    });
  }, [anchor, setSearchParams]);
  const setCategoryId = useCallback((value: string) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (value) params.set('category_id', value);
      else params.delete('category_id');
      return params;
    });
  }, [setSearchParams]);
  const setStatus = useCallback((value: string) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (value) params.set('status', value);
      else params.delete('status');
      return params;
    });
  }, [setSearchParams]);
  const { categories } = useEventReferenceData();
  const [occurrences, setOccurrences] = useState<EventOccurrence[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const range = useMemo(() => calendarRange(anchor, mode), [anchor, mode]);
  const fetchRange = useMemo(() => calendarFetchRange(anchor, mode), [anchor, mode]);
  const days = useMemo(() => Array.from({ length: mode === 'month' ? 42 : 7 }, (_, index) => addDays(range.start, index)), [mode, range.start]);
  const occurrencesByDate = useMemo(() => {
    const grouped = new Map<string, EventOccurrence[]>();
    occurrences.forEach((occurrence) => {
      const key = dateToDateInput(occurrence.occurrence_date) ?? dateToDateInput(occurrence.start_datetime);
      if (!key) return;
      grouped.set(key, [...(grouped.get(key) ?? []), occurrence]);
    });
    return grouped;
  }, [occurrences]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await eventService.getAllOccurrences({
        date_from: formatDateKey(fetchRange.start),
        date_to: formatDateKey(fetchRange.end),
        category_id: categoryId,
        status,
        per_page: 500,
      });
      setOccurrences(payload.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('events.loadCalendarError'));
    } finally {
      setLoading(false);
    }
  }, [categoryId, fetchRange.end, fetchRange.start, status, t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const move = (direction: -1 | 1) => {
    setAnchor((current) => {
      const next = new Date(current);
      if (mode === 'month') next.setMonth(next.getMonth() + direction);
      else next.setDate(next.getDate() + direction * 7);
      return next;
    });
  };

  const title = mode === 'month'
    ? anchor.toLocaleDateString(deviceLocale(), { month: 'long', year: 'numeric' })
    : `${formatDateKey(range.start)} - ${formatDateKey(range.end)}`;

  return (
    <SectionCard title={t('events.calendarTitle')} action={<div className="flex flex-wrap gap-2"><ButtonLink to="/erp/events" variant="secondary">{t('events.list')}</ButtonLink><ButtonLink to="/erp/events/new" variant="primary"><Plus className="h-4 w-4" />{t('events.event')}</ButtonLink></div>}>
      <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[auto_auto_1fr_180px_180px_auto]">
        <div className="flex rounded-lg border border-slate-200 bg-white p-1">
          <button type="button" onClick={() => setMode('month')} className={`rounded-md px-3 py-2 text-sm font-medium ${mode === 'month' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>{t('events.monthView')}</button>
          <button type="button" onClick={() => setMode('week')} className={`rounded-md px-3 py-2 text-sm font-medium ${mode === 'week' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>{t('events.weekView')}</button>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => move(-1)} className="rounded-lg border border-slate-200 p-2"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => setAnchor(new Date())} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium">{t('common.today')}</button>
          <button type="button" onClick={() => move(1)} className="rounded-lg border border-slate-200 p-2"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="flex items-center text-lg font-medium capitalize text-slate-900">{title}</div>
        <SelectField label={t('events.category')} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">{t('common.all')}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</SelectField>
        <SelectField label={t('common.status')} value={status} onChange={(event) => setStatus(event.target.value)}><option value="">{t('common.all')}</option>{occurrenceStatuses.map((item) => <option key={item}>{item}</option>)}</SelectField>
        <button type="button" onClick={() => void reload()} className="mt-7 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white">{t('common.refresh')}</button>
      </div>

      {error ? <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
      <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {weekdays.map((day) => <div key={day} className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium normal-case text-slate-500">{t(weekdayLabelKeys[day]).slice(0, 3)}</div>)}
        {days.map((day) => {
          const key = formatDateKey(day);
          const items = occurrencesByDate.get(key) ?? [];
          const outsideMonth = mode === 'month' && day.getMonth() !== anchor.getMonth();
          return (
            <div key={key} className={`min-h-32 border-b border-r border-slate-100 p-2 ${outsideMonth ? 'bg-slate-50 text-slate-400' : 'bg-white text-slate-900'}`}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium">{day.getDate()}</span>
                {items.length ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] font-medium text-slate-500">{items.length}</span> : null}
              </div>
              <div className="space-y-1">
                {items.slice(0, mode === 'month' ? 4 : 10).map((occurrence) => (
                  <Link key={occurrence.id} to={`/erp/events/${occurrence.event_id}?tab=occurrences&occurrence=${occurrence.id}`} className="block rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs hover:border-indigo-200 hover:bg-indigo-50">
                    <div className="flex items-center gap-1.5 font-medium text-slate-900"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: occurrence.event?.category?.color ?? '#64748b' }} />{timeToHourMinute(occurrence.start_datetime)}</div>
                    <div className="mt-0.5 truncate text-slate-700">{occurrence.event?.title ?? t('events.eventFallbackTitle', { id: occurrence.event_id })}</div>
                    <div className="mt-0.5 truncate text-slate-500">{(occurrence.event ? eventLocationLabel(occurrence.event) : '') || '-'}</div>
                  </Link>
                ))}
                {items.length > (mode === 'month' ? 4 : 10) ? <div className="text-xs font-medium text-slate-500">{t('events.moreOccurrences', { count: items.length - (mode === 'month' ? 4 : 10) })}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
      {loading ? <p className="mt-4 text-sm font-medium text-slate-500">{t('events.loadingList')}</p> : null}
    </SectionCard>
  );
}
