import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { EventItem } from '../../../services/eventService';
import { ButtonLink, SectionCard } from '../../primitives';
import { useEvent, usePermissions } from './hooks';
import { eventLocationLabel, weekdayLabelKeys } from './helpers';
import { CategoryBadge, RecurrenceBadge, ServiceRequirementBadge, StatusBadge } from './ui';
import { EventOccurrencesTab } from './EventOccurrencesTab';

type EventDetailTab = 'overview' | 'occurrences';

function EventOverviewTab({ event }: { event: EventItem }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
      <p><b>{t('events.description')}:</b> {event.description || '-'}</p><p><b>{t('events.location')}:</b> {eventLocationLabel(event) || '-'}</p><p><b>{t('events.category')}:</b> <CategoryBadge category={event.category} /></p>
      <p><b>{t('events.instructor')}:</b> {event.instructor?.name || '-'}</p><p><b>{t('events.group')}:</b> {event.group?.name || '-'}</p>
      <p><b>{t('events.timeRange')}:</b> {event.start_date} {event.start_time}-{event.end_time}</p><p><b>{t('events.recurrence')}:</b> <RecurrenceBadge type={event.recurrence_type} /></p>
      <p><b>{t('events.recurrenceDaysOrMonthlyDay')}:</b> {event.recurrence_type === 'weekly' ? event.recurrence_days?.map((d) => t(weekdayLabelKeys[d])).join(', ') : event.recurrence_type === 'monthly' ? event.monthly_day : '-'}</p>
      <p><b>{t('events.participationCondition')}:</b> <ServiceRequirementBadge event={event} /></p><p><b>{t('common.status')}:</b> <StatusBadge status={event.status} /></p><p><b>{t('events.maxParticipants')}:</b> {event.max_participants ?? t('events.unlimited')}</p>
      <p><b>{t('events.paidEvent')}:</b> {event.requires_payment ? `${event.payment_amount ?? '-'} ${event.payment_type ?? ''}` : t('common.no')}</p><p><b>{t('events.occurrencesCount')}:</b> {event.occurrences_count ?? event.occurrences?.length ?? '-'}</p>
    </div>
  );
}

export function EventDetailsPage() {
  const { t } = useTranslation();
  const { eventId } = useParams();
  const id = Number(eventId);
  const { event, loading, error } = useEvent(id);
  const permissions = usePermissions();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: EventDetailTab = searchParams.get('tab') === 'occurrences' ? 'occurrences' : 'overview';

  const setActiveTab = (tab: EventDetailTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === 'overview') next.delete('tab');
      else next.set('tab', tab);
      if (tab !== 'occurrences') next.delete('occurrence');
      return next;
    }, { replace: true });
  };

  if (loading) return <SectionCard title={t('events.eventDetailsTitle')}><p>{t('common.loading')}</p></SectionCard>;
  if (error || !event) return <SectionCard title={t('events.eventDetailsTitle')}><p className="text-red-600">{error || t('events.notFound')}</p></SectionCard>;

  const tabs: Array<[EventDetailTab, string]> = [
    ['overview', t('events.tabOverview')],
    ['occurrences', t('events.tabOccurrences')],
  ];

  return (
    <SectionCard
      title={event.title}
      action={permissions.canManageEvents ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => navigate('/erp/events/new', { state: { duplicateFromId: event.id } })} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50">
            {t('events.duplicate')}
          </button>
          <ButtonLink to="edit" variant="secondary">{t('common.edit')}</ButtonLink>
        </div>
      ) : undefined}
    >
      <div className="mb-5 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
        {tabs.map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`h-9 rounded-lg px-3 text-sm font-medium transition ${activeTab === tab ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-900'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {activeTab === 'overview' ? <EventOverviewTab event={event} /> : <EventOccurrencesTab eventId={id} />}
    </SectionCard>
  );
}
