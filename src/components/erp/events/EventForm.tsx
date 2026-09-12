import { Save } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { eventService, type ApiValidationError, type EventPayload, type EventService, type EventStatus, type RecurrenceType } from '../../../services/eventService';
import { ButtonLink, SectionCard, Toast } from '../../primitives';
import { useEvent, useEventReferenceData } from './hooks';
import { dateToDateInput, eventStatuses, fieldError, timeToHourMinute, weekdayLabelKeys, weekdays } from './helpers';
import { SelectField, TextField } from './ui';

type FormValues = EventPayload;

const emptyEventForm: FormValues = {
  category_id: null,
  location_id: null,
  instructor_id: null,
  group_id: null,
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

export function EventForm({ mode }: { mode: 'create' | 'edit' }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { eventId } = useParams();
  const id = Number(eventId);
  const { event, loading } = useEvent(mode === 'edit' ? id : undefined);
  const duplicateFromId = mode === 'create' ? (location.state as { duplicateFromId?: number } | null | undefined)?.duplicateFromId : undefined;
  const [duplicateSourceTitle, setDuplicateSourceTitle] = useState<string | null>(null);
  const [duplicateLoading, setDuplicateLoading] = useState(Boolean(duplicateFromId));
  const [duplicateError, setDuplicateError] = useState('');
  const { categories, locations, instructors, groups } = useEventReferenceData();
  const [services, setServices] = useState<EventService[]>([]);
  const [serverErrors, setServerErrors] = useState<Record<string, string[]> | undefined>();
  const [clientErrors, setClientErrors] = useState<Record<string, string[]>>({});
  const errors = { ...serverErrors, ...clientErrors };
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [form, setForm] = useState<FormValues>(emptyEventForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [closeAfterSave, setCloseAfterSave] = useState(false);
  const recurrenceType = form.recurrence_type;
  const needsService = form.requires_active_service;
  const needsPayment = form.requires_payment;

  useEffect(() => {
    eventService.getServices().then((payload) => setServices(Array.isArray(payload) ? payload : payload.data)).catch(() => setServices([]));
  }, []);

  // Duplicate-event flow: mode is always 'create' here; prefill everything from the
  // source event except id/status-relevant dates, which the operator must pick fresh.
  useEffect(() => {
    if (!duplicateFromId) return;
    let active = true;
    async function loadDuplicateSource() {
      setDuplicateLoading(true);
      setDuplicateError('');
      try {
        const sourceEvent = await eventService.getEvent(duplicateFromId as number);
        if (!active) return;
        setForm({
          category_id: sourceEvent.category_id ?? null,
          location_id: sourceEvent.location_id ?? null,
          instructor_id: sourceEvent.instructor_id ?? null,
          group_id: sourceEvent.group_id ?? null,
          title: `${sourceEvent.title}${t('events.duplicateCopySuffix')}`,
          description: sourceEvent.description ?? '',
          location: sourceEvent.location_text ?? '',
          start_time: timeToHourMinute(sourceEvent.start_time),
          end_time: timeToHourMinute(sourceEvent.end_time),
          recurrence_type: sourceEvent.recurrence_type,
          recurrence_days: sourceEvent.recurrence_days ?? [],
          monthly_day: sourceEvent.monthly_day,
          start_date: '',
          end_date: null,
          requires_active_service: sourceEvent.requires_active_service,
          required_service_id: sourceEvent.required_service_id,
          requires_payment: sourceEvent.requires_payment,
          payment_amount: sourceEvent.payment_amount ?? null,
          payment_type: sourceEvent.payment_type ?? 'RON',
          max_participants: sourceEvent.max_participants,
          status: sourceEvent.status,
        });
        setDuplicateSourceTitle(sourceEvent.title);
      } catch (err) {
        if (active) setDuplicateError(err instanceof Error ? err.message : t('events.duplicateLoadError'));
      } finally {
        if (active) setDuplicateLoading(false);
      }
    }
    void loadDuplicateSource();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duplicateFromId]);

  useEffect(() => {
    if (event) setForm({
      category_id: event.category_id ?? null,
      location_id: event.location_id ?? null,
      instructor_id: event.instructor_id ?? null,
      group_id: event.group_id ?? null,
      title: event.title,
      description: event.description ?? '',
      location: event.location_text ?? '',
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
    const nextErrors: Record<string, string[]> = {};
    if (!form.title.trim()) nextErrors.title = [t('events.titleRequired')];
    if (!form.start_time) nextErrors.start_time = [t('events.startTimeRequired')];
    if (!form.end_time) nextErrors.end_time = [t('events.endTimeRequired')];
    if (!form.start_date) nextErrors.start_date = [t('events.startDateRequired')];
    if (form.requires_active_service && !form.required_service_id) nextErrors.required_service_id = [t('events.requiredServiceRequired')];
    if (form.requires_payment && !form.payment_amount) nextErrors.payment_amount = [t('events.paymentAmountRequired')];
    if (form.requires_payment && !form.payment_type) nextErrors.payment_type = [t('events.paymentTypeRequired')];
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
      location_id: form.location_id ? Number(form.location_id) : null,
      instructor_id: form.instructor_id ? Number(form.instructor_id) : null,
      group_id: form.group_id ? Number(form.group_id) : null,
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
        location_id: savedEvent.location_id ?? null,
        instructor_id: savedEvent.instructor_id ?? null,
        group_id: savedEvent.group_id ?? null,
        title: savedEvent.title,
        description: savedEvent.description ?? '',
        location: savedEvent.location_text ?? '',
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
      if (closeAfterSave) {
        navigate('/erp/events');
      } else if (mode === 'create') {
        navigate(`/erp/events/${savedEvent.id}/edit`, { replace: true });
      }
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
        {duplicateFromId && duplicateLoading ? <p className="mb-4 rounded-lg bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700">{t('common.loading')}</p> : null}
        {duplicateError ? <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{duplicateError}</p> : null}
        {duplicateSourceTitle ? <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">{t('events.duplicatedFromNotice', { title: duplicateSourceTitle })}</p> : null}
        <div className="space-y-8">
          <div>
            <h3 className="mb-4 border-b border-slate-100 pb-2 text-sm font-medium normal-case tracking-normal text-slate-800">{t('events.sectionBasicInfo')}</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <TextField label={t('common.title')} value={form.title} onChange={(e) => updateField('title', e.target.value)} error={fieldError(errors, 'title')} />
              <SelectField label={t('events.category')} value={form.category_id ?? ''} onChange={(e) => updateField('category_id', e.target.value ? Number(e.target.value) : null)} error={fieldError(errors, 'category_id')}><option value="">{t('events.noCategory')}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</SelectField>
              <SelectField label={t('events.location')} value={form.location_id ?? ''} onChange={(e) => updateField('location_id', e.target.value ? Number(e.target.value) : null)} error={fieldError(errors, 'location_id')}><option value="">{t('events.noLocation')}</option>{locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}</SelectField>
              <SelectField label={t('events.instructor')} value={form.instructor_id ?? ''} onChange={(e) => updateField('instructor_id', e.target.value ? Number(e.target.value) : null)} error={fieldError(errors, 'instructor_id')}><option value="">{t('events.noInstructor')}</option>{instructors.map((instructor) => <option key={instructor.id} value={instructor.id}>{instructor.name}</option>)}</SelectField>
              <SelectField label={t('events.group')} value={form.group_id ?? ''} onChange={(e) => updateField('group_id', e.target.value ? Number(e.target.value) : null)} error={fieldError(errors, 'group_id')}><option value="">{t('events.noGroup')}</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</SelectField>
              <TextField label={t('events.locationText')} value={form.location ?? ''} onChange={(e) => updateField('location', e.target.value)} error={fieldError(errors, 'location')} />
              <TextField label={t('events.startTime')} type="time" value={form.start_time} onChange={(e) => updateField('start_time', e.target.value)} error={fieldError(errors, 'start_time')} />
              <TextField label={t('events.endTime')} type="time" value={form.end_time} onChange={(e) => updateField('end_time', e.target.value)} error={fieldError(errors, 'end_time')} />
              <TextField label={t('events.startDate')} type="date" value={form.start_date} onChange={(e) => updateField('start_date', e.target.value)} error={fieldError(errors, 'start_date')} />
              <TextField label={t('events.endDate')} type="date" value={form.end_date ?? ''} onChange={(e) => updateField('end_date', e.target.value || null)} error={fieldError(errors, 'end_date')} />
              <TextField label={t('events.maxParticipants')} type="number" min={1} value={form.max_participants ?? ''} onChange={(e) => updateField('max_participants', e.target.value ? Number(e.target.value) : null)} error={fieldError(errors, 'max_participants')} />
              <SelectField label={t('common.status')} value={form.status} onChange={(e) => updateField('status', e.target.value as EventStatus)} error={fieldError(errors, 'status')}>{eventStatuses.map((status) => <option key={status}>{status}</option>)}</SelectField>
              <label className="md:col-span-2"><span className="mb-2 block text-sm font-medium text-slate-700">{t('events.description')}</span><textarea value={form.description ?? ''} onChange={(e) => updateField('description', e.target.value)} rows={4} className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none" />{fieldError(errors, 'description') ? <span className="text-xs text-red-600">{fieldError(errors, 'description')}</span> : null}</label>
            </div>
          </div>
          <div>
            <h3 className="mb-4 border-b border-slate-100 pb-2 text-sm font-medium normal-case tracking-normal text-slate-800">{t('events.sectionRecurrence')}</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SelectField label={t('events.recurrence')} value={form.recurrence_type} onChange={(e) => updateField('recurrence_type', e.target.value as RecurrenceType)} error={fieldError(errors, 'recurrence_type')}><option value="once">once</option><option value="weekly">weekly</option><option value="monthly">monthly</option></SelectField>
              {recurrenceType === 'monthly' ? <TextField label={t('events.monthlyDay')} type="number" min={1} max={31} value={form.monthly_day ?? ''} onChange={(e) => updateField('monthly_day', e.target.value ? Number(e.target.value) : null)} error={fieldError(errors, 'monthly_day')} /> : null}
              {recurrenceType === 'weekly' ? <div><span className="mb-2 block text-sm font-medium text-slate-700">{t('events.recurrenceDays')}</span><div className="grid grid-cols-2 gap-2">{weekdays.map((day) => <label key={day} className="rounded-lg border px-3 py-2 text-sm"><input type="checkbox" checked={(form.recurrence_days ?? []).includes(day)} onChange={(e) => updateField('recurrence_days', e.target.checked ? [...(form.recurrence_days ?? []), day] : (form.recurrence_days ?? []).filter((item) => item !== day))} className="mr-2 accent-indigo-600" />{t(weekdayLabelKeys[day])}</label>)}</div>{fieldError(errors, 'recurrence_days') ? <span className="mt-1 block text-xs text-red-600">{fieldError(errors, 'recurrence_days')}</span> : null}</div> : null}
            </div>
          </div>
          <div>
            <h3 className="mb-4 border-b border-slate-100 pb-2 text-sm font-medium normal-case tracking-normal text-slate-800">{t('events.sectionEligibilityPayment')}</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium text-slate-700"><input type="checkbox" checked={form.requires_active_service} onChange={(e) => updateField('requires_active_service', e.target.checked)} className="accent-indigo-600" />{t('events.requiresActiveService')}</label>
              {needsService ? <SelectField label={t('events.requiredService')} value={form.required_service_id ?? ''} onChange={(e) => updateField('required_service_id', e.target.value ? Number(e.target.value) : null)} error={fieldError(errors, 'required_service_id')}><option value="">{t('common.select')}</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</SelectField> : null}
              <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <label className="flex items-center gap-3 text-sm font-medium text-slate-800"><input type="checkbox" checked={form.requires_payment} onChange={(e) => updateField('requires_payment', e.target.checked)} className="accent-indigo-600" />{t('events.paidEvent')}</label>
                {needsPayment ? <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2"><TextField label={t('events.paymentAmount')} type="number" min={0} step="0.01" value={form.payment_amount ?? ''} onChange={(e) => updateField('payment_amount', e.target.value ? Number(e.target.value) : null)} error={fieldError(errors, 'payment_amount')} /><TextField label={t('events.currency')} value={form.payment_type ?? 'RON'} onChange={(e) => updateField('payment_type', e.target.value)} error={fieldError(errors, 'payment_type')} /></div> : <p className="mt-2 text-sm text-slate-500">{t('events.paymentFieldsClearedHint')}</p>}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => navigate('/erp/events')} className="rounded-lg border px-4 py-2 text-sm font-medium">{t('common.cancel')}</button><button type="submit" onClick={() => setCloseAfterSave(false)} disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"><Save className="h-4 w-4" />{t('common.save')}</button><button type="submit" onClick={() => setCloseAfterSave(true)} disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"><Save className="h-4 w-4" />{t('common.saveAndClose')}</button></div>
      </SectionCard>
    </form>
  );
}
