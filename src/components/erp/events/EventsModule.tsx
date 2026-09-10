import { AlertTriangle, CalendarClock, ChevronLeft, ChevronRight, CreditCard, Download, Edit3, Eye, Plus, RefreshCw, Save, Search, Tags, Trash2, Users, X } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { eventService, type ApiValidationError, type EventCategory, type EventCategoryPayload, type EventItem, type EventOccurrence, type EventParticipant, type EventPayload, type EventStatus, type EventService, type EventUser, type OccurrenceStatus, type ParticipantStatus, type RecurrenceType, type Weekday } from '../../../services/eventService';
import type { ApiPayment } from '../../../services/ErpApiService';
import { paymentService } from '../../../services/paymentService';
import { ButtonLink, Modal, SectionCard, Toast } from '../../primitives';
import { useEvent, useEventOccurrences, useEventParticipants, useEvents } from './hooks';
import { useAuth } from '../../../context/useAuth';
import { deviceLocale, formatApiDate, formatCurrency, formatDeviceDate, paymentMethodLabel } from '../../../utils/erp/formatters';
import { ParticipantPaymentModal } from './ParticipantPaymentModal';
import { ProtectedRoute } from '../../ProtectedRoute';

const weekdays: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const weekdayLabelKeys: Record<Weekday, string> = { monday: 'events.weekdays.monday', tuesday: 'events.weekdays.tuesday', wednesday: 'events.weekdays.wednesday', thursday: 'events.weekdays.thursday', friday: 'events.weekdays.friday', saturday: 'events.weekdays.saturday', sunday: 'events.weekdays.sunday' };
const eventStatuses: EventStatus[] = ['active', 'inactive', 'cancelled'];
const occurrenceStatuses: OccurrenceStatus[] = ['scheduled', 'cancelled', 'completed'];
const participantStatuses: ParticipantStatus[] = ['registered', 'attended', 'cancelled', 'no_show'];
type CalendarMode = 'month' | 'week';

function usePermissions() {
  const { hasAnyRight } = useAuth();
  return {
    canViewEvents: hasAnyRight(['events.view', 'events.manage']),
    canManageEvents: hasAnyRight(['events.manage']),
    canViewParticipants: hasAnyRight(['event_participants.view', 'event_participants.manage']),
    canManageParticipants: hasAnyRight(['event_participants.manage']),
  };
}

function fieldError(errors?: Record<string, string[]>, name?: string) {
  if (!errors || !name) return '';
  return errors[name]?.[0] ?? '';
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function timeToHourMinute(value?: string | null) {
  if (!value) return '';
  const timePart = value.includes('T') ? value.split('T')[1] : value;
  return timePart.slice(0, 5);
}

function dateToDateInput(value?: string | null) {
  return value ? value.slice(0, 10) : null;
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay() || 7;
  next.setDate(next.getDate() - day + 1);
  return next;
}

function startOfMonthGrid(date: Date) {
  return startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1));
}

function calendarRange(anchor: Date, mode: CalendarMode) {
  if (mode === 'week') {
    const start = startOfWeek(anchor);
    return { start, end: addDays(start, 6) };
  }

  const start = startOfMonthGrid(anchor);
  return { start, end: addDays(start, 41) };
}

function calendarFetchRange(anchor: Date, mode: CalendarMode) {
  if (mode === 'week') return calendarRange(anchor, mode);

  return {
    start: new Date(anchor.getFullYear(), anchor.getMonth(), 1),
    end: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0),
  };
}

function TextField({ label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input {...props} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
      {error ? <span className="mt-1 block text-xs font-medium text-red-600">{error}</span> : null}
    </label>
  );
}

function SelectField({ label, error, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string; children: React.ReactNode }) {
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
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{status}</span>;
}

export function RecurrenceBadge({ type }: { type: RecurrenceType }) {
  return <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{type}</span>;
}

function CategoryBadge({ category }: { category?: EventCategory | null }) {
  if (!category) return <span className="text-xs text-slate-400">-</span>;
  return <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.color ?? '#64748b' }} />{category.name}</span>;
}

export function ServiceRequirementBadge({ event }: { event: Pick<EventItem, 'requires_active_service' | 'required_service'> }) {
  const { t } = useTranslation();
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${event.requires_active_service ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>{event.requires_active_service ? t('events.requiresService', { name: event.required_service?.name ? `: ${event.required_service.name}` : '' }) : t('events.noRequiredService')}</span>;
}

function DeleteConfirmModal({ label, loading, onCancel, onConfirm }: { label: string; loading?: boolean; onCancel: () => void; onConfirm: () => void }) {
  const { t } = useTranslation();
  return (
    <Modal open onClose={onCancel} title={t('events.deleteConfirmTitle')} maxWidthClassName="max-w-md">
      <p className="text-sm text-slate-600">{t('events.deleteConfirm', { label })}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold">{t('common.cancel')}</button>
        <button onClick={onConfirm} disabled={loading} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{t('common.delete')}</button>
      </div>
    </Modal>
  );
}

function Pagination({ page, lastPage, onPage }: { page: number; lastPage: number; onPage: (page: number) => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-end gap-2">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
      <span className="text-sm text-slate-600">{t('events.pageOf', { page, lastPage })}</span>
      <button disabled={page >= lastPage} onClick={() => onPage(page + 1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
    </div>
  );
}

function EventsPage() {
  const { t } = useTranslation();
  const permissions = usePermissions();
  const [filters, setFilters] = useState({ page: 1, per_page: 15, search: '', category_id: '', status: '', recurrence_type: '', requires_active_service: '', requires_payment: '', sort: 'created_at' as const, direction: 'desc' as const });
  const query = useMemo(() => filters, [filters]);
  const { events, meta, loading, error, reload } = useEvents(query);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deleting, setDeleting] = useState<EventItem | null>(null);

  useEffect(() => {
    eventService.getCategories({ per_page: 100, is_active: '1' }).then((payload) => setCategories(payload.data ?? [])).catch(() => setCategories([]));
  }, []);

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
          <TextField label={t('events.searchTitle')} value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value, page: 1 }))} />
          <SelectField label="Categorie" value={filters.category_id} onChange={(e) => setFilters((p) => ({ ...p, category_id: e.target.value, page: 1 }))}><option value="">{t('common.all')}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</SelectField>
          <SelectField label={t('common.status')} value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value, page: 1 }))}><option value="">{t('common.all')}</option>{eventStatuses.map((s) => <option key={s}>{s}</option>)}</SelectField>
          <SelectField label={t('events.recurrence')} value={filters.recurrence_type} onChange={(e) => setFilters((p) => ({ ...p, recurrence_type: e.target.value, page: 1 }))}><option value="">{t('common.all')}</option><option value="once">once</option><option value="weekly">weekly</option><option value="monthly">monthly</option></SelectField>
          <SelectField label={t('services.service')} value={filters.requires_active_service} onChange={(e) => setFilters((p) => ({ ...p, requires_active_service: e.target.value, page: 1 }))}><option value="">{t('common.all')}</option><option value="1">{t('common.yes')}</option><option value="0">{t('common.no')}</option></SelectField>
          <SelectField label="Paid event" value={filters.requires_payment} onChange={(e) => setFilters((p) => ({ ...p, requires_payment: e.target.value, page: 1 }))}><option value="">{t('common.all')}</option><option value="1">{t('common.yes')}</option><option value="0">{t('common.no')}</option></SelectField>
          <SelectField label={t('events.sort')} value={filters.sort} onChange={(e) => setFilters((p) => ({ ...p, sort: e.target.value as typeof p.sort }))}><option value="created_at">created_at</option><option value="start_date">start_date</option><option value="title">title</option></SelectField>
          <SelectField label="direction" value={filters.direction} onChange={(e) => setFilters((p) => ({ ...p, direction: e.target.value as typeof p.direction }))}><option value="desc">desc</option><option value="asc">asc</option></SelectField>
          <button onClick={() => void reload()} className="mt-7 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white"><Search className="h-4 w-4" />{t('common.search')}</button>
        </div>
        {error ? <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead><tr className="border-b text-slate-500"><th className="pb-3">{t('common.title')}</th><th className="pb-3">Categorie</th><th className="pb-3">{t('events.date')}</th><th className="pb-3">{t('events.recurrence')}</th><th className="pb-3">{t('services.service')}</th><th className="pb-3">Paid</th><th className="pb-3">{t('common.status')}</th><th className="pb-3 text-right">{t('common.actions')}</th></tr></thead>
            <tbody>{events.length ? events.map((event) => (
              <tr key={event.id} className="border-b border-slate-100 align-top">
                <td className="py-4 font-semibold text-slate-900">{event.title}<p className="text-xs font-normal text-slate-500">{event.location || '-'}</p></td>
                <td className="py-4"><CategoryBadge category={event.category} /></td>
                <td className="py-4 text-slate-600">{formatDeviceDate(event.start_date)} {event.start_time}-{event.end_time}</td>
                <td className="py-4"><RecurrenceBadge type={event.recurrence_type} /></td>
                <td className="py-4"><ServiceRequirementBadge event={event} /></td>
                <td className="py-4">{event.requires_payment ? <span className="font-semibold text-slate-900">{event.payment_amount ?? '-'} {event.payment_type ?? ''}</span> : '-'}</td>
                <td className="py-4"><StatusBadge status={event.status} /></td>
                <td className="py-4"><div className="flex flex-wrap justify-end gap-2">
                  <Link to={`${event.id}`} className="rounded-lg border px-3 py-2"><Eye className="h-4 w-4" /></Link>
                  {permissions.canManageEvents ? <Link to={`${event.id}/edit`} className="rounded-lg border px-3 py-2"><Edit3 className="h-4 w-4" /></Link> : null}
                  <Link to={`${event.id}/occurrences`} className="rounded-lg border px-3 py-2"><CalendarClock className="h-4 w-4" /></Link>
                  {permissions.canManageEvents ? <button onClick={() => setDeleting(event)} className="rounded-lg border border-red-100 px-3 py-2 text-red-600"><Trash2 className="h-4 w-4" /></button> : null}
                </div></td>
              </tr>
            )) : <tr><td colSpan={8} className="py-10 text-center text-slate-500">{loading ? t('events.loadingList') : t('events.empty')}</td></tr>}</tbody>
          </table>
        </div>
        <div className="mt-4"><Pagination page={meta.current_page} lastPage={meta.last_page} onPage={(page) => setFilters((p) => ({ ...p, page }))} /></div>
      </SectionCard>
      {deleting ? <DeleteConfirmModal label={deleting.title} onCancel={() => setDeleting(null)} onConfirm={() => void deleteEvent()} /> : null}
    </div>
  );
}

type FormValues = EventPayload;

const emptyEventForm: FormValues = {
  category_id: null,
  title: '',
  description: '',
  location: '',
  start_time: '',
  end_time: '',
  recurrence_type: 'once',
  recurrence_days: [],
  monthly_day: null,
  start_date: '',
  end_date: null,
  requires_active_service: false,
  required_service_id: null,
  requires_payment: false,
  payment_amount: null,
  payment_type: 'RON',
  max_participants: null,
  status: 'active',
};

function EventForm({ mode }: { mode: 'create' | 'edit' }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { eventId } = useParams();
  const id = Number(eventId);
  const { event, loading } = useEvent(mode === 'edit' ? id : undefined);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [services, setServices] = useState<EventService[]>([]);
  const [serverErrors, setServerErrors] = useState<Record<string, string[]> | undefined>();
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [form, setForm] = useState<FormValues>(emptyEventForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [closeAfterSave, setCloseAfterSave] = useState(false);
  const recurrenceType = form.recurrence_type;
  const needsService = form.requires_active_service;
  const needsPayment = form.requires_payment;

  useEffect(() => {
    eventService.getCategories({ per_page: 100, is_active: '1' }).then((payload) => setCategories(payload.data ?? [])).catch(() => setCategories([]));
    eventService.getServices().then((payload) => setServices(Array.isArray(payload) ? payload : payload.data)).catch(() => setServices([]));
  }, []);

  useEffect(() => {
    if (event) setForm({
      category_id: event.category_id ?? null,
      title: event.title,
      description: event.description ?? '',
      location: event.location ?? '',
      start_time: timeToHourMinute(event.start_time),
      end_time: timeToHourMinute(event.end_time),
      recurrence_type: event.recurrence_type,
      recurrence_days: event.recurrence_days ?? [],
      monthly_day: event.monthly_day,
      start_date: dateToDateInput(event.start_date) ?? '',
      end_date: dateToDateInput(event.end_date),
      requires_active_service: event.requires_active_service,
      required_service_id: event.required_service_id,
      requires_payment: event.requires_payment,
      payment_amount: event.payment_amount ?? null,
      payment_type: event.payment_type ?? 'RON',
      max_participants: event.max_participants,
      status: event.status,
    });
  }, [event]);

  useEffect(() => {
    if (recurrenceType === 'once') {
      setForm((prev) => ({ ...prev, recurrence_days: [], monthly_day: null }));
    }
    if (recurrenceType === 'weekly') setForm((prev) => ({ ...prev, monthly_day: null }));
    if (recurrenceType === 'monthly') setForm((prev) => ({ ...prev, recurrence_days: [] }));
  }, [recurrenceType]);

  useEffect(() => {
    if (!needsService) setForm((prev) => ({ ...prev, required_service_id: null }));
  }, [needsService]);

  useEffect(() => {
    if (!needsPayment) setForm((prev) => ({ ...prev, payment_amount: null, payment_type: 'RON' }));
  }, [needsPayment]);

  const updateField = <K extends keyof FormValues>(field: K, value: FormValues[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.title.trim()) nextErrors.title = t('events.titleRequired');
    if (!form.start_time) nextErrors.start_time = t('events.startTimeRequired');
    if (!form.end_time) nextErrors.end_time = t('events.endTimeRequired');
    if (!form.start_date) nextErrors.start_date = t('events.startDateRequired');
    if (form.requires_active_service && !form.required_service_id) nextErrors.required_service_id = t('events.requiredServiceRequired');
    if (form.requires_payment && !form.payment_amount) nextErrors.payment_amount = 'Payment amount is required.';
    if (form.requires_payment && !form.payment_type) nextErrors.payment_type = 'Currency is required.';
    setClientErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async (eventSubmit: React.FormEvent<HTMLFormElement>) => {
    eventSubmit.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    setServerErrors(undefined);
    const payload: EventPayload = {
      category_id: form.category_id ? Number(form.category_id) : null,
      title: form.title,
      description: form.description || null,
      location: form.location || null,
      start_time: timeToHourMinute(form.start_time),
      end_time: timeToHourMinute(form.end_time),
      recurrence_type: form.recurrence_type,
      recurrence_days: form.recurrence_days ?? [],
      monthly_day: form.monthly_day ? Number(form.monthly_day) : null,
      start_date: dateToDateInput(form.start_date) ?? '',
      end_date: dateToDateInput(form.end_date),
      requires_active_service: form.requires_active_service,
      required_service_id: form.requires_active_service ? Number(form.required_service_id) : null,
      requires_payment: form.requires_payment,
      payment_amount: form.requires_payment ? Number(form.payment_amount) : null,
      payment_type: form.requires_payment ? form.payment_type : null,
      max_participants: form.max_participants ? Number(form.max_participants) : null,
      status: form.status,
    };
    try {
      const savedEvent = mode === 'edit' ? await eventService.updateEvent(id, payload) : await eventService.createEvent(payload);
      setForm({
        category_id: savedEvent.category_id ?? null,
        title: savedEvent.title,
        description: savedEvent.description ?? '',
        location: savedEvent.location ?? '',
        start_time: timeToHourMinute(savedEvent.start_time),
        end_time: timeToHourMinute(savedEvent.end_time),
        recurrence_type: savedEvent.recurrence_type,
        recurrence_days: savedEvent.recurrence_days ?? [],
        monthly_day: savedEvent.monthly_day,
        start_date: dateToDateInput(savedEvent.start_date) ?? '',
        end_date: dateToDateInput(savedEvent.end_date),
        requires_active_service: savedEvent.requires_active_service,
        required_service_id: savedEvent.required_service_id,
        requires_payment: savedEvent.requires_payment,
        payment_amount: savedEvent.payment_amount ?? null,
        payment_type: savedEvent.payment_type ?? 'RON',
        max_participants: savedEvent.max_participants,
        status: savedEvent.status,
      });
      setToast({ type: 'success', message: t('events.saved') });
      if (closeAfterSave) navigate('/erp/events');
    } catch (err) {
      const apiError = err as ApiValidationError;
      setServerErrors(apiError.errors);
      setToast({ type: 'error', message: apiError.message });
    } finally {
      setIsSubmitting(false);
      setCloseAfterSave(false);
    }
  };

  if (loading) return <SectionCard title={t('events.event')}><p className="text-sm text-slate-500">{t('common.loading')}</p></SectionCard>;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
      <SectionCard title={mode === 'create' ? t('events.createEvent') : t('events.editEvent')} action={<ButtonLink to="/erp/events" variant="secondary">{t('common.back')}</ButtonLink>}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField label={t('common.title')} value={form.title} onChange={(e) => updateField('title', e.target.value)} error={clientErrors.title || fieldError(serverErrors, 'title')} />
          <SelectField label="Categorie" value={form.category_id ?? ''} onChange={(e) => updateField('category_id', e.target.value ? Number(e.target.value) : null)} error={fieldError(serverErrors, 'category_id')}><option value="">Fara categorie</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</SelectField>
          <TextField label={t('articles.locations')} value={form.location ?? ''} onChange={(e) => updateField('location', e.target.value)} error={fieldError(serverErrors, 'location')} />
          <TextField label="start_time" type="time" value={form.start_time} onChange={(e) => updateField('start_time', e.target.value)} error={clientErrors.start_time || fieldError(serverErrors, 'start_time')} />
          <TextField label="end_time" type="time" value={form.end_time} onChange={(e) => updateField('end_time', e.target.value)} error={clientErrors.end_time || fieldError(serverErrors, 'end_time')} />
          <TextField label="start_date" type="date" value={form.start_date} onChange={(e) => updateField('start_date', e.target.value)} error={clientErrors.start_date || fieldError(serverErrors, 'start_date')} />
          <TextField label="end_date" type="date" value={form.end_date ?? ''} onChange={(e) => updateField('end_date', e.target.value || null)} error={fieldError(serverErrors, 'end_date')} />
          <SelectField label="recurrence_type" value={form.recurrence_type} onChange={(e) => updateField('recurrence_type', e.target.value as RecurrenceType)} error={fieldError(serverErrors, 'recurrence_type')}><option value="once">once</option><option value="weekly">weekly</option><option value="monthly">monthly</option></SelectField>
          {recurrenceType === 'monthly' ? <TextField label="monthly_day" type="number" min={1} max={31} value={form.monthly_day ?? ''} onChange={(e) => updateField('monthly_day', e.target.value ? Number(e.target.value) : null)} error={fieldError(serverErrors, 'monthly_day')} /> : null}
          {recurrenceType === 'weekly' ? <div><span className="mb-2 block text-sm font-medium text-slate-700">{t('events.recurrenceDays')}</span><div className="grid grid-cols-2 gap-2">{weekdays.map((day) => <label key={day} className="rounded-lg border px-3 py-2 text-sm"><input type="checkbox" checked={(form.recurrence_days ?? []).includes(day)} onChange={(e) => updateField('recurrence_days', e.target.checked ? [...(form.recurrence_days ?? []), day] : (form.recurrence_days ?? []).filter((item) => item !== day))} className="mr-2 accent-indigo-600" />{t(weekdayLabelKeys[day])}</label>)}</div>{fieldError(serverErrors, 'recurrence_days') ? <span className="mt-1 block text-xs text-red-600">{fieldError(serverErrors, 'recurrence_days')}</span> : null}</div> : null}
          <TextField label="max_participants" type="number" min={1} value={form.max_participants ?? ''} onChange={(e) => updateField('max_participants', e.target.value ? Number(e.target.value) : null)} error={fieldError(serverErrors, 'max_participants')} />
          <SelectField label="status" value={form.status} onChange={(e) => updateField('status', e.target.value as EventStatus)} error={fieldError(serverErrors, 'status')}>{eventStatuses.map((status) => <option key={status}>{status}</option>)}</SelectField>
          <label className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium text-slate-700"><input type="checkbox" checked={form.requires_active_service} onChange={(e) => updateField('requires_active_service', e.target.checked)} className="accent-indigo-600" />requires_active_service</label>
          {needsService ? <SelectField label={t('events.requiredService')} value={form.required_service_id ?? ''} onChange={(e) => updateField('required_service_id', e.target.value ? Number(e.target.value) : null)} error={clientErrors.required_service_id || fieldError(serverErrors, 'required_service_id')}><option value="">{t('common.select')}</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</SelectField> : null}
          <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <label className="flex items-center gap-3 text-sm font-semibold text-slate-800"><input type="checkbox" checked={form.requires_payment} onChange={(e) => updateField('requires_payment', e.target.checked)} className="accent-indigo-600" />Paid Event</label>
            {needsPayment ? <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2"><TextField label="payment_amount" type="number" min={0} step="0.01" value={form.payment_amount ?? ''} onChange={(e) => updateField('payment_amount', e.target.value ? Number(e.target.value) : null)} error={clientErrors.payment_amount || fieldError(serverErrors, 'payment_amount')} /><TextField label="currency" value={form.payment_type ?? 'RON'} onChange={(e) => updateField('payment_type', e.target.value)} error={clientErrors.payment_type || fieldError(serverErrors, 'payment_type')} /></div> : <p className="mt-2 text-sm text-slate-500">Payment fields are cleared while this event is free.</p>}
          </div>
          <label className="md:col-span-2"><span className="mb-2 block text-sm font-medium text-slate-700">description</span><textarea value={form.description ?? ''} onChange={(e) => updateField('description', e.target.value)} rows={4} className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none" />{fieldError(serverErrors, 'description') ? <span className="text-xs text-red-600">{fieldError(serverErrors, 'description')}</span> : null}</label>
        </div>
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => navigate('/erp/events')} className="rounded-lg border px-4 py-2 text-sm font-semibold">{t('common.cancel')}</button><button type="submit" onClick={() => setCloseAfterSave(false)} disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"><Save className="h-4 w-4" />{t('common.save')}</button><button type="submit" onClick={() => setCloseAfterSave(true)} disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"><Save className="h-4 w-4" />{t('common.saveAndClose')}</button></div>
      </SectionCard>
    </form>
  );
}

function EventDetailsPage() {
  const { t } = useTranslation();
  const { eventId } = useParams();
  const { event, loading, error } = useEvent(Number(eventId));
  const permissions = usePermissions();
  if (loading) return <SectionCard title={t('events.eventDetailsTitle')}><p>{t('common.loading')}</p></SectionCard>;
  if (error || !event) return <SectionCard title={t('events.eventDetailsTitle')}><p className="text-red-600">{error || t('events.notFound')}</p></SectionCard>;
  return (
    <SectionCard title={event.title} action={<div className="flex gap-2">{permissions.canManageEvents ? <ButtonLink to="edit" variant="secondary">{t('common.edit')}</ButtonLink> : null}<ButtonLink to="occurrences" variant="dark">{t('events.viewOccurrences')}</ButtonLink></div>}>
      <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
        <p><b>descriere:</b> {event.description || '-'}</p><p><b>locatie:</b> {event.location || '-'}</p><p><b>categorie:</b> <CategoryBadge category={event.category} /></p>
        <p><b>interval orar:</b> {event.start_date} {event.start_time}-{event.end_time}</p><p><b>tip recurență:</b> <RecurrenceBadge type={event.recurrence_type} /></p>
        <p><b>zile/zi lunara:</b> {event.recurrence_type === 'weekly' ? event.recurrence_days?.map((d) => t(weekdayLabelKeys[d])).join(', ') : event.recurrence_type === 'monthly' ? event.monthly_day : '-'}</p>
        <p><b>conditie participare:</b> <ServiceRequirementBadge event={event} /></p><p><b>status:</b> <StatusBadge status={event.status} /></p><p><b>max participanti:</b> {event.max_participants ?? 'nelimitat'}</p>
        <p><b>paid event:</b> {event.requires_payment ? `${event.payment_amount ?? '-'} ${event.payment_type ?? ''}` : 'nu'}</p><p><b>occurrences_count:</b> {event.occurrences_count ?? event.occurrences?.length ?? '-'}</p>
      </div>
      {event.occurrences?.length ? <div className="mt-6 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="pb-3">occurrence_date</th><th className="pb-3">start_datetime</th><th className="pb-3">end_datetime</th><th className="pb-3">status</th><th className="pb-3">participants</th></tr></thead><tbody>{event.occurrences.map((occurrence) => <tr key={occurrence.id} className="border-b border-slate-100"><td className="py-3">{occurrence.occurrence_date}</td><td>{occurrence.start_datetime}</td><td>{occurrence.end_datetime}</td><td><StatusBadge status={occurrence.status} /></td><td>{occurrence.participants_count}</td></tr>)}</tbody></table></div> : null}
    </SectionCard>
  );
}

const emptyCategoryForm: EventCategoryPayload = {
  name: '',
  color: '#2563eb',
  description: '',
  is_active: true,
};

function EventCategoriesPage() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({ page: 1, per_page: 15, search: '', is_active: '' });
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<EventCategory | null>(null);
  const [deleting, setDeleting] = useState<EventCategory | null>(null);
  const [form, setForm] = useState<EventCategoryPayload>(emptyCategoryForm);
  const [serverErrors, setServerErrors] = useState<Record<string, string[]> | undefined>();
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await eventService.getCategories(filters);
      setCategories(payload.data ?? []);
      setMeta(payload.meta ?? { current_page: payload.current_page ?? 1, last_page: payload.last_page ?? 1, per_page: payload.per_page ?? 15, total: payload.total ?? payload.data?.length ?? 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu am putut incarca categoriile.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const resetForm = () => {
    setEditing(null);
    setForm(emptyCategoryForm);
    setServerErrors(undefined);
    setClientErrors({});
  };

  const startEdit = (category: EventCategory) => {
    setEditing(category);
    setForm({ name: category.name, color: category.color ?? '#2563eb', description: category.description ?? '', is_active: category.is_active });
    setServerErrors(undefined);
    setClientErrors({});
  };

  const save = async () => {
    if (saving) return;
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = 'Numele categoriei este obligatoriu.';
    setClientErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setServerErrors(undefined);
    setError('');
    try {
      const payload = { ...form, name: form.name.trim(), color: form.color || null, description: form.description || null };
      if (editing) await eventService.updateCategory(editing.id, payload);
      else await eventService.createCategory(payload);
      setToast({ type: 'success', message: t('events.categorySaved') });
      resetForm();
      await reload();
    } catch (err) {
      const apiError = err as ApiValidationError;
      setServerErrors(apiError.errors);
      setError(apiError.message || t('events.categorySaveError'));
      setToast({ type: 'error', message: apiError.message || t('events.categorySaveError') });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await eventService.deleteCategory(deleting.id);
      setToast({ type: 'success', message: t('events.categoryDeleted') });
      setDeleting(null);
      await reload();
    } catch (err) {
      setToast({ type: 'error', message: err instanceof Error ? err.message : t('events.categoryDeleteError') });
    }
  };

  return (
    <div className="space-y-6">
      {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
      <SectionCard title={t('events.eventCategories')} action={<ButtonLink to="/erp/events" variant="secondary">{t('events.backToEvents')}</ButtonLink>}>
        <form onSubmit={(eventSubmit) => { eventSubmit.preventDefault(); void save(); }} className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_140px_1fr_auto]">
          <TextField label="Nume" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} error={clientErrors.name || fieldError(serverErrors, 'name')} />
          <TextField label="Culoare" type="color" value={form.color ?? '#2563eb'} onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))} error={fieldError(serverErrors, 'color')} />
          <TextField label="Descriere" value={form.description ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} error={fieldError(serverErrors, 'description')} />
          <label className="mt-7 flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"><input type="checkbox" checked={form.is_active ?? true} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} className="accent-indigo-600" />Activa</label>
          <div className="flex gap-2 md:col-span-4">
            <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Se salveaza...' : editing ? 'Actualizeaza' : 'Adauga'}</button>
            {editing ? <button type="button" onClick={resetForm} className="rounded-lg border px-4 py-2 text-sm font-semibold">Anuleaza editarea</button> : null}
          </div>
        </form>
      </SectionCard>
      <SectionCard title="Lista categorii">
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_auto]">
          <TextField label="Cauta" value={filters.search} onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))} />
          <SelectField label="Status" value={filters.is_active} onChange={(e) => setFilters((prev) => ({ ...prev, is_active: e.target.value, page: 1 }))}><option value="">Toate</option><option value="1">Active</option><option value="0">Inactive</option></SelectField>
          <button onClick={() => void reload()} className="mt-7 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white">Cauta</button>
        </div>
        {error ? <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead><tr className="border-b text-slate-500"><th className="pb-3">Categorie</th><th className="pb-3">Descriere</th><th className="pb-3">Evenimente</th><th className="pb-3">Status</th><th className="pb-3 text-right">Actiuni</th></tr></thead>
            <tbody>{categories.length ? categories.map((category) => (
              <tr key={category.id} className="border-b border-slate-100">
                <td className="py-4"><CategoryBadge category={category} /></td>
                <td className="py-4 text-slate-600">{category.description || '-'}</td>
                <td className="py-4">{category.events_count ?? 0}</td>
                <td className="py-4"><StatusBadge status={category.is_active ? 'active' : 'inactive'} /></td>
                <td className="py-4"><div className="flex justify-end gap-2"><button onClick={() => startEdit(category)} className="rounded-lg border px-3 py-2"><Edit3 className="h-4 w-4" /></button><button onClick={() => setDeleting(category)} className="rounded-lg border border-red-100 px-3 py-2 text-red-600"><Trash2 className="h-4 w-4" /></button></div></td>
              </tr>
            )) : <tr><td colSpan={5} className="py-10 text-center text-slate-500">{loading ? t('common.loading') : t('events.noCategories')}</td></tr>}</tbody>
          </table>
        </div>
        <div className="mt-4"><Pagination page={meta.current_page} lastPage={meta.last_page} onPage={(page) => setFilters((prev) => ({ ...prev, page }))} /></div>
      </SectionCard>
      {deleting ? <DeleteConfirmModal label={deleting.name} onCancel={() => setDeleting(null)} onConfirm={() => void remove()} /> : null}
    </div>
  );
}

function EventCalendarPage() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<CalendarMode>('month');
  const [anchor, setAnchor] = useState(() => new Date());
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [categories, setCategories] = useState<EventCategory[]>([]);
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
      setError(err instanceof Error ? err.message : 'Nu am putut incarca evenimentele din calendar.');
    } finally {
      setLoading(false);
    }
  }, [categoryId, fetchRange.end, fetchRange.start, status]);

  useEffect(() => {
    eventService.getCategories({ per_page: 100, is_active: '1' }).then((payload) => setCategories(payload.data ?? [])).catch(() => setCategories([]));
  }, []);

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
          <button type="button" onClick={() => setMode('month')} className={`rounded-md px-3 py-2 text-sm font-semibold ${mode === 'month' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>Lunar</button>
          <button type="button" onClick={() => setMode('week')} className={`rounded-md px-3 py-2 text-sm font-semibold ${mode === 'week' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>Saptamanal</button>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => move(-1)} className="rounded-lg border border-slate-200 p-2"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => setAnchor(new Date())} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold">{t('common.today')}</button>
          <button type="button" onClick={() => move(1)} className="rounded-lg border border-slate-200 p-2"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="flex items-center text-lg font-bold capitalize text-slate-900">{title}</div>
        <SelectField label="Categorie" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Toate</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</SelectField>
        <SelectField label="Status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Toate</option>{occurrenceStatuses.map((item) => <option key={item}>{item}</option>)}</SelectField>
        <button type="button" onClick={() => void reload()} className="mt-7 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white">Refresh</button>
      </div>

      {error ? <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {weekdays.map((day) => <div key={day} className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold uppercase text-slate-500">{day.slice(0, 3)}</div>)}
        {days.map((day) => {
          const key = formatDateKey(day);
          const items = occurrencesByDate.get(key) ?? [];
          const outsideMonth = mode === 'month' && day.getMonth() !== anchor.getMonth();
          return (
            <div key={key} className={`min-h-32 border-b border-r border-slate-100 p-2 ${outsideMonth ? 'bg-slate-50 text-slate-400' : 'bg-white text-slate-900'}`}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold">{day.getDate()}</span>
                {items.length ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] font-semibold text-slate-500">{items.length}</span> : null}
              </div>
              <div className="space-y-1">
                {items.slice(0, mode === 'month' ? 4 : 10).map((occurrence) => (
                  <Link key={occurrence.id} to={`/erp/events/${occurrence.event_id}/occurrences/${occurrence.id}/participants`} className="block rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs hover:border-indigo-200 hover:bg-indigo-50">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-900"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: occurrence.event?.category?.color ?? '#64748b' }} />{timeToHourMinute(occurrence.start_datetime)}</div>
                    <div className="mt-0.5 truncate text-slate-700">{occurrence.event?.title ?? `Event #${occurrence.event_id}`}</div>
                    <div className="mt-0.5 truncate text-slate-500">{occurrence.event?.location ?? '-'}</div>
                  </Link>
                ))}
                {items.length > (mode === 'month' ? 4 : 10) ? <div className="text-xs font-semibold text-slate-500">+{items.length - (mode === 'month' ? 4 : 10)} mai multe</div> : null}
              </div>
            </div>
          );
        })}
      </div>
      {loading ? <p className="mt-4 text-sm font-medium text-slate-500">{t('events.loadingList')}</p> : null}
    </SectionCard>
  );
}

function EventOccurrencesPage() {
  const { t } = useTranslation();
  const { eventId } = useParams();
  const id = Number(eventId);
  const [filters, setFilters] = useState({ date_from: '', date_to: '', status: '' });
  const { event } = useEvent(id);
  const { occurrences, loading, error, reload } = useEventOccurrences(id, filters);
  const permissions = usePermissions();
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const cancelOccurrence = async (occurrenceId: number) => {
    try {
      await eventService.cancelOccurrence(occurrenceId);
      setToast({ type: 'success', message: t('events.occurrenceCancelled') });
      await reload();
    } catch (err) {
      setToast({ type: 'error', message: err instanceof Error ? err.message : t('events.cancelOccurrenceError') });
    }
  };
  return (
    <SectionCard title={t('events.occurrencesFor', { title: event?.title ?? '' })} action={<ButtonLink to="/erp/events" variant="secondary">{t('common.back')}</ButtonLink>}>
      {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4"><TextField label={t('events.dateFrom')} type="date" value={filters.date_from} onChange={(e) => setFilters((p) => ({ ...p, date_from: e.target.value }))} /><TextField label={t('events.dateTo')} type="date" value={filters.date_to} onChange={(e) => setFilters((p) => ({ ...p, date_to: e.target.value }))} /><SelectField label={t('common.status')} value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}><option value="">{t('common.all')}</option>{occurrenceStatuses.map((s) => <option key={s}>{s}</option>)}</SelectField><button onClick={() => void reload()} className="mt-7 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white"><RefreshCw className="mr-2 inline h-4 w-4" />{t('events.filter')}</button></div>
      {error ? <p className="mt-4 text-red-600">{error}</p> : null}
      <div className="mt-6 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="pb-3">{t('events.occurrenceDate')}</th><th className="pb-3">{t('events.startDatetime')}</th><th className="pb-3">{t('events.endDatetime')}</th><th className="pb-3">{t('common.status')}</th><th className="pb-3">{t('events.participants')}</th><th className="pb-3">{t('events.places')}</th><th className="pb-3 text-right">{t('common.actions')}</th></tr></thead><tbody>{occurrences.length ? occurrences.map((o) => <tr key={o.id} className="border-b border-slate-100"><td className="py-4">{o.occurrence_date}</td><td>{o.start_datetime}</td><td>{o.end_datetime}</td><td><StatusBadge status={o.status} /></td><td>{o.participants_count}</td><td>{o.available_places ?? t('events.unlimited')}</td><td><div className="flex justify-end gap-2">{permissions.canViewParticipants ? <Link to={`${o.id}/participants`} className="rounded-lg border px-3 py-2"><Users className="h-4 w-4" /></Link> : null}{permissions.canManageParticipants ? <Link to={`${o.id}/participants?add=1`} className="rounded-lg border px-3 py-2"><Plus className="h-4 w-4" /></Link> : null}{permissions.canManageEvents ? <button onClick={() => void cancelOccurrence(o.id)} className="rounded-lg border px-3 py-2 text-red-600"><X className="h-4 w-4" /></button> : null}</div></td></tr>) : <tr><td colSpan={7} className="py-10 text-center text-slate-500">{loading ? t('common.loading') : t('events.noOccurrences')}</td></tr>}</tbody></table></div>
    </SectionCard>
  );
}

function userLabel(user: EventUser) {
  return user.name || `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email;
}

function participantUserId(participant: { id?: number; user_id?: number }) {
  return participant.user_id ?? participant.id ?? 0;
}

function participantPaymentModelId(participant: EventParticipant) {
  return participant.pivot_id ?? null;
}

function participantName(participant: EventParticipant) {
  return participant.user?.name || `${participant.user?.first_name ?? participant.first_name ?? ''} ${participant.user?.last_name ?? participant.last_name ?? ''}`.trim() || '-';
}

function hasActiveService(user: EventUser) {
  if (typeof user.has_active_service === 'boolean') return user.has_active_service;
  return Boolean(user.active_services?.length);
}

function usersFromPayload(payload: Awaited<ReturnType<typeof eventService.searchUsers>> | Awaited<ReturnType<typeof eventService.getEligibleOccurrenceParticipants>>) {
  return Array.isArray(payload) ? payload : payload.data ?? [];
}

function usersFromCardPayload(payload: Awaited<ReturnType<typeof eventService.searchUsersByCard>>) {
  return Array.isArray(payload) ? payload : payload.data ?? [];
}

function AddParticipantsPanel({ occurrenceId, event, availableSlots, onClose, onSaved }: { occurrenceId: number; event?: EventItem; availableSlots?: number | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<EventUser[]>([]);
  const [usersMeta, setUsersMeta] = useState({ current_page: 1, last_page: 1, per_page: 10, total: 0 });
  const [usersPage, setUsersPage] = useState(1);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [status, setStatus] = useState<ParticipantStatus>('registered');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const blocked = availableSlots !== null && availableSlots !== undefined && availableSlots <= 0;
  const selectableUsers = users;

  useEffect(() => {
    setUsersPage(1);
  }, [search]);

  useEffect(() => {
    const query = search.trim();
    let active = true;
    setLoadingUsers(true);
    const timeout = window.setTimeout(() => {
      eventService.getEligibleOccurrenceParticipants(occurrenceId, { search: query, page: usersPage, per_page: usersMeta.per_page }).then((payload) => {
        if (!active) return;
        setUsers(usersFromPayload(payload));
        if (!Array.isArray(payload)) {
          setUsersMeta({
            current_page: payload.meta?.current_page ?? payload.current_page ?? usersPage,
            last_page: payload.meta?.last_page ?? payload.last_page ?? 1,
            per_page: payload.meta?.per_page ?? payload.per_page ?? usersMeta.per_page,
            total: payload.meta?.total ?? payload.total ?? payload.data?.length ?? 0,
          });
        } else {
          setUsersMeta({ current_page: 1, last_page: 1, per_page: payload.length, total: payload.length });
        }
      }).catch(() => {
        if (active) setUsers([]);
      }).finally(() => {
        if (active) setLoadingUsers(false);
      });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [occurrenceId, search, usersMeta.per_page, usersPage]);

  const toggleUser = (id: number, checked: boolean) => {
    setSelectedUserIds((prev) => checked ? Array.from(new Set([...prev, id])) : prev.filter((item) => item !== id));
  };

  const togglePage = (checked: boolean) => {
    const pageIds = selectableUsers.map((user) => user.id);
    setSelectedUserIds((prev) => checked ? Array.from(new Set([...prev, ...pageIds])) : prev.filter((id) => !pageIds.includes(id)));
  };

  const save = async () => {
    if (blocked || !selectedUserIds.length || saving) return;
    setError('');
    setSaving(true);
    try {
      await eventService.bulkAddOccurrenceParticipants(occurrenceId, { user_ids: selectedUserIds, status, notes: notes || null });
      onSaved();
    } catch (err) {
      const apiError = err as ApiValidationError;
      setError(apiError.status === 422 ? (apiError.errors ? Object.values(apiError.errors)[0]?.[0] : '') || apiError.message || t('events.userNotEligible') : apiError.message);
    } finally {
      setSaving(false);
    }
  };

  const allPageSelected = selectableUsers.length > 0 && selectableUsers.every((user) => selectedUserIds.includes(user.id));

  return <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><h3 className="text-lg font-semibold">{t('events.addParticipant')}</h3><p className="mt-1 text-sm text-slate-500">Selecteaza unul sau mai multi useri eligibili pentru aparitia curenta.</p></div><button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-semibold">{t('common.close')}</button></div>{event?.requires_active_service ? <p className="mt-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800"><AlertTriangle className="mr-2 inline h-4 w-4" />{t('events.eventNeedsActiveService')}</p> : null}{blocked ? <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{t('events.noAvailablePlaces')}</p> : null}{error ? <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}<div className="mt-4 space-y-4"><div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px]"><TextField label={t('events.searchUser')} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('events.searchUserPlaceholder')} autoFocus /><SelectField label={t('common.status')} value={status} onChange={(e) => setStatus(e.target.value as ParticipantStatus)} disabled={blocked}>{participantStatuses.map((s) => <option key={s}>{s}</option>)}</SelectField></div><div className="overflow-hidden rounded-lg border border-slate-200"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="w-12 px-4 py-3"><input type="checkbox" checked={allPageSelected} onChange={(e) => togglePage(e.target.checked)} disabled={!selectableUsers.length || blocked} className="h-4 w-4 accent-indigo-600" /></th><th className="px-4 py-3">{t('users.user')}</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">{t('members.phone')}</th><th className="px-4 py-3">{t('services.service')}</th></tr></thead><tbody>{selectableUsers.length ? selectableUsers.map((u) => <tr key={u.id} className={`border-t border-slate-100 ${selectedUserIds.includes(u.id) ? 'bg-indigo-50/60' : ''}`}><td className="px-4 py-3"><input type="checkbox" checked={selectedUserIds.includes(u.id)} onChange={(e) => toggleUser(u.id, e.target.checked)} disabled={blocked} className="h-4 w-4 accent-indigo-600" /></td><td className="px-4 py-3 font-medium text-slate-900">{userLabel(u)}</td><td className="px-4 py-3 text-slate-600">{u.email}</td><td className="px-4 py-3 text-slate-600">{u.phone || '-'}</td><td className="px-4 py-3">{hasActiveService(u) ? <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{t('users.statusActive')}</span> : <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Eligibil</span>}</td></tr>) : <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">{loadingUsers ? t('events.loadingUsers') : t('events.noUsers')}</td></tr>}</tbody></table></div><div className="flex flex-col gap-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between"><span>{usersMeta.total ? t('events.usersCount', { count: usersMeta.total }) : t('events.noResults')} - {selectedUserIds.length} selectati</span><Pagination page={usersMeta.current_page} lastPage={usersMeta.last_page} onPage={setUsersPage} /></div><label><span className="mb-2 block text-sm font-medium">{t('events.notes')}</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border px-4 py-3 text-sm" /></label></div><div className="mt-6 flex justify-end gap-2"><button onClick={() => setSelectedUserIds([])} disabled={!selectedUserIds.length || saving} className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50">Goleste selectia</button><button onClick={() => void save()} disabled={!selectedUserIds.length || blocked || saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? t('events.adding') : `Adauga ${selectedUserIds.length} participanti`}</button></div></div>;
}

function ScanParticipantPanel({ occurrenceId, availableSlots, existingParticipants, onSaved }: { occurrenceId: number; availableSlots?: number | null; existingParticipants: EventParticipant[]; onSaved: () => void }) {
  const [cardCode, setCardCode] = useState('');
  const [status, setStatus] = useState<ParticipantStatus>('attended');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [scanning, setScanning] = useState(false);
  const blocked = availableSlots !== null && availableSlots !== undefined && availableSlots <= 0;
  const participantIds = useMemo(() => new Set(existingParticipants.map(participantUserId).filter(Boolean)), [existingParticipants]);

  const addByCardCode = async () => {
    const code = cardCode.trim();
    if (!code || scanning || blocked) return;
    setScanning(true);
    setMessage(null);
    try {
      const users = usersFromCardPayload(await eventService.searchUsersByCard(code, 1, 10));
      const exactMatch = users.find((user) => user.user_code?.trim().toLowerCase() === code.toLowerCase());
      const user = exactMatch ?? (users.length === 1 ? users[0] : null);
      if (!user) {
        setMessage({ type: 'error', text: 'Cardul nu a fost gasit sau cautarea a intors mai multi useri.' });
        return;
      }
      if (participantIds.has(user.id)) {
        setMessage({ type: 'error', text: `${userLabel(user)} este deja participant la aceasta aparitie.` });
        return;
      }
      await eventService.addOccurrenceParticipant(occurrenceId, { user_id: user.id, status, notes: `Adaugat prin scanare card: ${code}` });
      setCardCode('');
      setMessage({ type: 'success', text: `${userLabel(user)} a fost adaugat.` });
      onSaved();
    } catch (err) {
      const apiError = err as ApiValidationError;
      setMessage({ type: 'error', text: apiError.status === 422 ? (apiError.errors ? Object.values(apiError.errors)[0]?.[0] : '') || apiError.message || 'Userul nu indeplineste conditiile pentru acest eveniment.' : apiError.message });
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_auto]">
        <TextField label="Scaneaza card" value={cardCode} onChange={(e) => setCardCode(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void addByCardCode(); } }} placeholder="Scannerul completeaza codul si apasa Enter" disabled={blocked || scanning} autoFocus />
        <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value as ParticipantStatus)} disabled={blocked || scanning}>{participantStatuses.map((s) => <option key={s}>{s}</option>)}</SelectField>
        <button type="button" onClick={() => void addByCardCode()} disabled={!cardCode.trim() || blocked || scanning} className="mt-7 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{scanning ? 'Se adauga...' : 'Adauga rapid'}</button>
      </div>
      {blocked ? <p className="mt-3 text-sm font-medium text-red-700">Nu exista locuri disponibile.</p> : null}
      {message ? <p className={`mt-3 text-sm font-medium ${message.type === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>{message.text}</p> : null}
    </div>
  );
}

function EventParticipantsPage() {
  const { t } = useTranslation();
  const { occurrenceId } = useParams();
  const id = Number(occurrenceId);
  const { participants, loading, error, reload } = useEventParticipants(id);
  const [occurrence, setOccurrence] = useState<{ event?: EventItem; available_places?: number | null } | null>(null);
  const [showAdd, setShowAdd] = useState(new URLSearchParams(window.location.search).get('add') === '1');
  const [paymentParticipant, setPaymentParticipant] = useState<EventParticipant | null>(null);
  const [occurrencePayments, setOccurrencePayments] = useState<ApiPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState('');
  const [attendancePdfLoading, setAttendancePdfLoading] = useState(false);
  const [attendancePdfError, setAttendancePdfError] = useState('');
  const [savingParticipantId, setSavingParticipantId] = useState<number | null>(null);
  const [participantDrafts, setParticipantDrafts] = useState<Record<number, { status: ParticipantStatus; notes: string }>>({});
  const permissions = usePermissions();

  useEffect(() => {
    eventService.getOccurrence(id).then(setOccurrence).catch(() => setOccurrence(null));
  }, [id]);

  useEffect(() => {
    setParticipantDrafts((prev) => {
      const next: Record<number, { status: ParticipantStatus; notes: string }> = {};
      participants.forEach((participant) => {
        const userId = participantUserId(participant);
        next[userId] = prev[userId] ?? { status: participant.status, notes: participant.notes ?? '' };
      });
      return next;
    });
  }, [participants]);

  const remove = async (userId: number) => {
    await eventService.removeOccurrenceParticipant(id, userId);
    await reload();
  };

  const updateDraft = (userId: number, patch: Partial<{ status: ParticipantStatus; notes: string }>) => {
    setParticipantDrafts((prev) => ({ ...prev, [userId]: { status: prev[userId]?.status ?? 'registered', notes: prev[userId]?.notes ?? '', ...patch } }));
  };

  const saveParticipant = async (userId: number) => {
    const draft = participantDrafts[userId];
    if (!draft) return;
    setSavingParticipantId(userId);
    try {
      await eventService.updateOccurrenceParticipantStatus(id, userId, { status: draft.status, notes: draft.notes || null });
      await reload();
    } finally {
      setSavingParticipantId(null);
    }
  };

  const loadOccurrencePayments = useCallback(async (items = participants) => {
    const modelIds = items.map(participantPaymentModelId).filter((value): value is number => Boolean(value));
    if (!modelIds.length) {
      setOccurrencePayments([]);
      setPaymentsError('');
      return;
    }
    setPaymentsLoading(true);
    setPaymentsError('');
    try {
      setOccurrencePayments(await paymentService.listForModels('event_occurrence_user', modelIds));
    } catch (err) {
      setOccurrencePayments([]);
      setPaymentsError(err instanceof Error ? err.message : t('events.paymentsLoadError'));
    } finally {
      setPaymentsLoading(false);
    }
  }, [participants, t]);

  useEffect(() => {
    void loadOccurrencePayments(participants);
  }, [loadOccurrencePayments, participants]);

  const paymentsByParticipant = new Map<number, ApiPayment[]>();
  occurrencePayments.forEach((payment) => {
    if (!payment.model_id) return;
    const current = paymentsByParticipant.get(payment.model_id) ?? [];
    paymentsByParticipant.set(payment.model_id, [...current, payment]);
  });

  const downloadAttendancePdf = async () => {
    setAttendancePdfLoading(true);
    setAttendancePdfError('');
    try {
      downloadBlob(await eventService.downloadOccurrenceParticipantsPdf(id), `prezenta-eveniment-${id}.pdf`);
    } catch (err) {
      setAttendancePdfError(err instanceof Error ? err.message : t('events.attendancePdfDownloadError'));
    } finally {
      setAttendancePdfLoading(false);
    }
  };

  return (
    <SectionCard
      title="Occurrence Participants"
      action={(
        <div className="flex flex-wrap justify-end gap-2">
          {permissions.canViewParticipants ? (
            <button onClick={() => void downloadAttendancePdf()} disabled={attendancePdfLoading} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60">
              <Download className="mr-2 inline h-4 w-4" />{attendancePdfLoading ? t('common.loading') : t('events.downloadAttendancePdf')}
            </button>
          ) : null}
          {permissions.canManageParticipants ? (
            <button onClick={() => setShowAdd(true)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
              <Plus className="mr-2 inline h-4 w-4" />Add participant
            </button>
          ) : null}
        </div>
      )}
    >
      {showAdd ? <AddParticipantsPanel occurrenceId={id} event={occurrence?.event} availableSlots={occurrence?.available_places} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); void reload(); }} /> : null}
      {permissions.canManageParticipants ? <ScanParticipantPanel occurrenceId={id} availableSlots={occurrence?.available_places} existingParticipants={participants} onSaved={() => void reload()} /> : null}
      {error ? <p className="text-red-600">{error}</p> : null}
      {attendancePdfError ? <p className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{attendancePdfError}</p> : null}
      {paymentsError ? <p className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{paymentsError}</p> : null}

      <div className="mb-3 flex justify-end">
        <button onClick={() => void loadOccurrencePayments()} disabled={paymentsLoading} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-60">
          <RefreshCw className="mr-2 inline h-4 w-4" />{t('events.refreshPayments')}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b text-slate-500">
              <th className="pb-3">user name</th>
              <th className="pb-3">email</th>
              <th className="pb-3">status</th>
              <th className="pb-3">registered_at</th>
              <th className="pb-3">notes</th>
              <th className="pb-3 text-right">Actiuni</th>
            </tr>
          </thead>
          <tbody>
            {participants.length ? participants.map((participant) => {
              const userId = participantUserId(participant);
              const modelId = participantPaymentModelId(participant);
              const participantPayments = modelId ? paymentsByParticipant.get(modelId) ?? [] : [];
              const draft = participantDrafts[userId] ?? { status: participant.status, notes: participant.notes ?? '' };
              const dirty = draft.status !== participant.status || draft.notes !== (participant.notes ?? '');

              return (
                <tr key={userId} className="border-b border-slate-100 align-top">
                  <td className="py-4">
                    <p className="font-medium text-slate-900">{participantName(participant)}</p>
                    <div className="mt-3 space-y-2">
                      {participantPayments.length ? participantPayments.map((payment) => (
                        <div key={payment.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                          <p className="text-xs font-semibold text-slate-900">Payment #{payment.id} - {formatCurrency(payment.amount)}</p>
                          <p className="text-xs text-slate-500">{paymentMethodLabel(payment)} - {formatApiDate(payment.paid_at)}</p>
                        </div>
                      )) : <p className="text-xs text-slate-400">{paymentsLoading ? t('events.loadingPayments') : t('events.noPayments')}</p>}
                    </div>
                  </td>
                  <td className="py-4">{participant.user?.email ?? participant.email ?? '-'}</td>
                  <td className="py-4">{permissions.canManageParticipants ? <select value={draft.status} onChange={(e) => updateDraft(userId, { status: e.target.value as ParticipantStatus })} className="rounded-lg border px-3 py-2">{participantStatuses.map((status) => <option key={status}>{status}</option>)}</select> : <StatusBadge status={participant.status} />}</td>
                  <td className="py-4">{participant.registered_at}</td>
                  <td className="py-4">{permissions.canManageParticipants ? <textarea value={draft.notes} onChange={(e) => updateDraft(userId, { notes: e.target.value })} rows={2} className="min-w-64 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" /> : participant.notes || '-'}</td>
                  <td className="py-4 text-right">{permissions.canManageParticipants ? <div className="flex justify-end gap-2"><button onClick={() => setPaymentParticipant(participant)} className="rounded-lg border border-slate-200 px-3 py-2 text-slate-700"><CreditCard className="h-4 w-4" /></button><button onClick={() => void saveParticipant(userId)} disabled={!dirty || savingParticipantId === userId} className="rounded-lg border border-slate-200 px-3 py-2 text-slate-700 disabled:opacity-40"><Save className="h-4 w-4" /></button><button onClick={() => void remove(userId)} className="rounded-lg border border-red-100 px-3 py-2 text-red-600"><Trash2 className="h-4 w-4" /></button></div> : null}</td>
                </tr>
              );
            }) : <tr><td colSpan={6} className="py-10 text-center text-slate-500">{loading ? 'Se incarca...' : 'Nu exista participanti.'}</td></tr>}
          </tbody>
        </table>
      </div>

      {paymentParticipant ? <ParticipantPaymentModal participant={paymentParticipant} occurrence={occurrence} onClose={() => setPaymentParticipant(null)} onSaved={() => { setPaymentParticipant(null); void loadOccurrencePayments(); }} /> : null}
    </SectionCard>
  );
}

export function EventsModuleRoutes() {
  return (
    <Routes>
      <Route path="" element={<ProtectedRoute requiredRights={['events.view', 'events.manage']}><EventsPage /></ProtectedRoute>} />
      <Route path="events" element={<ProtectedRoute requiredRights={['events.view', 'events.manage']}><EventsPage /></ProtectedRoute>} />
      <Route path="calendar" element={<ProtectedRoute requiredRights={['events.view', 'events.manage']}><EventCalendarPage /></ProtectedRoute>} />
      <Route path="events/calendar" element={<ProtectedRoute requiredRights={['events.view', 'events.manage']}><EventCalendarPage /></ProtectedRoute>} />
      <Route path="categories" element={<ProtectedRoute requiredRights={['events.manage']}><EventCategoriesPage /></ProtectedRoute>} />
      <Route path="events/categories" element={<ProtectedRoute requiredRights={['events.manage']}><EventCategoriesPage /></ProtectedRoute>} />
      <Route path="new" element={<ProtectedRoute requiredRights={['events.manage']}><EventForm mode="create" /></ProtectedRoute>} />
      <Route path="events/new" element={<ProtectedRoute requiredRights={['events.manage']}><EventForm mode="create" /></ProtectedRoute>} />
      <Route path=":eventId" element={<ProtectedRoute requiredRights={['events.view', 'events.manage']}><EventDetailsPage /></ProtectedRoute>} />
      <Route path="events/:eventId" element={<ProtectedRoute requiredRights={['events.view', 'events.manage']}><EventDetailsPage /></ProtectedRoute>} />
      <Route path=":eventId/edit" element={<ProtectedRoute requiredRights={['events.manage']}><EventForm mode="edit" /></ProtectedRoute>} />
      <Route path="events/:eventId/edit" element={<ProtectedRoute requiredRights={['events.manage']}><EventForm mode="edit" /></ProtectedRoute>} />
      <Route path=":eventId/occurrences" element={<ProtectedRoute requiredRights={['events.view', 'events.manage']}><EventOccurrencesPage /></ProtectedRoute>} />
      <Route path="events/:eventId/occurrences" element={<ProtectedRoute requiredRights={['events.view', 'events.manage']}><EventOccurrencesPage /></ProtectedRoute>} />
      <Route path=":eventId/occurrences/:occurrenceId/participants" element={<ProtectedRoute requiredRights={['event_participants.view', 'event_participants.manage']}><EventParticipantsPage /></ProtectedRoute>} />
      <Route path="events/:eventId/occurrences/:occurrenceId/participants" element={<ProtectedRoute requiredRights={['event_participants.view', 'event_participants.manage']}><EventParticipantsPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/erp/events" replace />} />
    </Routes>
  );
}
