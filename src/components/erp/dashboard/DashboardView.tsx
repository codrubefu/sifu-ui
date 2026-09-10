import { BadgeEuro, Bell, Building2, CalendarClock, Check, ChevronLeft, ChevronRight, RefreshCw, UserCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { dashboardService, type DashboardAutomation, type DashboardPayload } from '../../../services/dashboardService';
import { articlesService, type Article } from '../../../services/articlesService';
import { eventService, type EventOccurrence } from '../../../services/eventService';
import { Alert, Button, Modal, SectionCard, StatCard } from '../../primitives';
import { useAuth } from '../../../context/useAuth';
import type { DashboardViewProps } from '../shared/types';
import { deviceLocale } from '../../../utils/erp/formatters';

const statusColors: Record<string, string> = {
  active: '#4f46e5',
  inactive: '#64748b',
  expired: '#f59e0b',
  suspended: '#dc2626',
  pending: '#7c3aed',
  reserved: '#0891b2',
  consumed: '#16a34a',
};

function money(value: number) {
  return new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(value);
}

function compactMoney(value: number) {
  return new Intl.NumberFormat('ro-RO', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function automationTitle(automation: DashboardAutomation, t: ReturnType<typeof useTranslation>['t']) {
  const values = { count: automation.count ?? 0 };
  const translated = t(`dashboard.automationLabels.${automation.key}`, values);
  return translated === `dashboard.automationLabels.${automation.key}` ? automation.label : translated;
}

function automationHelper(automation: DashboardAutomation, t: ReturnType<typeof useTranslation>['t']) {
  const translated = t(`dashboard.automationHelpers.${automation.key}`);
  return translated === `dashboard.automationHelpers.${automation.key}` ? automation.helper : translated;
}

function statusLabel(status: string, t: ReturnType<typeof useTranslation>['t']) {
  const key = `dashboard.statuses.${status}`;
  const translated = t(key);
  return translated === key ? status : translated;
}

function shortText(value: string, max = 180) {
  return value.length > max ? `${value.slice(0, max).trim()}...` : value;
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

function timeToHourMinute(value?: string | null) {
  if (!value) return '';
  const timePart = value.includes('T') ? value.split('T')[1] : value;
  return timePart.slice(0, 5);
}

function dateToDateInput(value?: string | null) {
  return value ? value.slice(0, 10) : null;
}

export function DashboardView(props: DashboardViewProps) {
  void props;
  const { t } = useTranslation();
  const { hasAnyRight } = useAuth();
  const canViewDashboard = hasAnyRight(['dashboard.view', 'dashboard.manage', 'reports.view', 'reports.manage']);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [announcements, setAnnouncements] = useState<Article[]>([]);
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [weekOccurrences, setWeekOccurrences] = useState<EventOccurrence[]>([]);
  const [selectedOccurrence, setSelectedOccurrence] = useState<EventOccurrence | null>(null);
  const [loading, setLoading] = useState(false);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [weekLoading, setWeekLoading] = useState(false);
  const [markingAnnouncementId, setMarkingAnnouncementId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [announcementsError, setAnnouncementsError] = useState('');
  const [weekError, setWeekError] = useState('');

  const loadDashboard = useCallback(async () => {
    if (!canViewDashboard) return;
    setLoading(true);
    setError('');
    try {
      setDashboard(await dashboardService.getDashboard({ group_by: 'month' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboard.loadError'));
    } finally {
      setLoading(false);
    }
  }, [canViewDashboard, t]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const loadAnnouncements = useCallback(async () => {
    setAnnouncementsLoading(true);
    setAnnouncementsError('');
    try {
      const payload = await articlesService.feed({ per_page: 5 });
      setAnnouncements(Array.isArray(payload) ? payload : payload.data ?? []);
    } catch (err) {
      setAnnouncements([]);
      setAnnouncementsError(err instanceof Error ? err.message : t('profile.announcementsLoadError', 'Nu am putut incarca anunturile.'));
    } finally {
      setAnnouncementsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadAnnouncements();
  }, [loadAnnouncements]);

  const weekRange = useMemo(() => {
    const start = startOfWeek(weekAnchor);
    return { start, end: addDays(start, 6) };
  }, [weekAnchor]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekRange.start, index)), [weekRange.start]);

  const weekOccurrencesByDate = useMemo(() => {
    const grouped = new Map<string, EventOccurrence[]>();
    weekOccurrences.forEach((occurrence) => {
      const key = dateToDateInput(occurrence.occurrence_date) ?? dateToDateInput(occurrence.start_datetime);
      if (!key) return;
      grouped.set(key, [...(grouped.get(key) ?? []), occurrence]);
    });
    return grouped;
  }, [weekOccurrences]);

  const loadWeekOccurrences = useCallback(async () => {
    setWeekLoading(true);
    setWeekError('');
    try {
      const payload = await eventService.getAllOccurrences({
        date_from: formatDateKey(weekRange.start),
        date_to: formatDateKey(weekRange.end),
        per_page: 200,
      });
      setWeekOccurrences(payload.data ?? []);
    } catch (err) {
      setWeekOccurrences([]);
      setWeekError(err instanceof Error ? err.message : 'Nu am putut incarca evenimentele saptamanii.');
    } finally {
      setWeekLoading(false);
    }
  }, [weekRange.end, weekRange.start]);

  useEffect(() => {
    void loadWeekOccurrences();
  }, [loadWeekOccurrences]);

  const markAnnouncementViewed = async (article: Article) => {
    setMarkingAnnouncementId(article.id);
    setAnnouncementsError('');
    try {
      const viewed = await articlesService.markViewed(article.id);
      setAnnouncements((prev) => prev.map((item) => (item.id === article.id ? { ...item, viewed_at: viewed.viewed_at ?? new Date().toISOString() } : item)));
    } catch (err) {
      setAnnouncementsError(err instanceof Error ? err.message : t('profile.announcementViewError', 'Nu am putut marca anuntul ca citit.'));
    } finally {
      setMarkingAnnouncementId(null);
    }
  };

  const statusCounts = useMemo(() => {
    const points = dashboard?.member_status ?? [];
    return points.map((item) => ({
      name: statusLabel(item.status, t),
      value: item.count,
      color: statusColors[item.status] ?? '#475569',
    }));
  }, [dashboard, t]);

  const revenueData = useMemo(() => {
    return (dashboard?.revenue_by_period ?? []).map((item) => ({ period: item.period, revenue: item.revenue }));
  }, [dashboard]);

  const activityData = useMemo(() => {
    return (dashboard?.activity ?? []).map((item) => ({ period: item.period, active: item.active, messages: item.messages }));
  }, [dashboard]);

  const announcementsPanel = (
    <SectionCard title={t('profile.announcementsTitle', 'Anunturile mele')} action={<Button type="button" size="sm" onClick={() => void loadAnnouncements()} disabled={announcementsLoading}><RefreshCw size={16} />{t('common.refresh')}</Button>}>
      {announcementsError ? <Alert tone="error" className="mb-3">{announcementsError}</Alert> : null}
      <div className="space-y-2.5">
        {announcements.length ? announcements.map((article) => (
          <div key={article.id} className="rounded-md border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex items-start gap-2.5">
              <Bell className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{article.title}</p>
                  <span className={`rounded-md px-2 py-1 text-[0.6875rem] font-semibold leading-none ${article.viewed_at ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'}`}>
                    {article.viewed_at ? t('profile.announcementRead', 'Citit') : t('profile.announcementUnread', 'Necitit')}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-600">{shortText(article.description)}</p>
                {!article.viewed_at ? (
                  <Button type="button" size="sm" variant="ghost" className="mt-2 h-8 px-2" onClick={() => void markAnnouncementViewed(article)} disabled={markingAnnouncementId === article.id}>
                    <Check className="h-4 w-4" />
                    {t('profile.markAnnouncementRead', 'Marcheaza citit')}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        )) : (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">{announcementsLoading ? t('common.loading') : t('profile.noAnnouncements', 'Nu exista anunturi pentru tine.')}</div>
        )}
      </div>
    </SectionCard>
  );

  const weekCalendarPanel = (
    <>
    <SectionCard
      title="Calendarul saptamanii"
      action={(
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setWeekAnchor((current) => addDays(current, -7))} className="rounded-lg border border-slate-200 p-2 text-slate-700"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => setWeekAnchor(new Date())} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">Azi</button>
          <button type="button" onClick={() => setWeekAnchor((current) => addDays(current, 7))} className="rounded-lg border border-slate-200 p-2 text-slate-700"><ChevronRight className="h-4 w-4" /></button>
          <Button type="button" size="sm" onClick={() => void loadWeekOccurrences()} disabled={weekLoading}><RefreshCw size={16} />{t('common.refresh')}</Button>
        </div>
      )}
    >
      <div className="mb-3 text-sm font-semibold text-slate-700">{formatDateKey(weekRange.start)} - {formatDateKey(weekRange.end)}</div>
      {weekError ? <Alert tone="error" className="mb-3">{weekError}</Alert> : null}
      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 lg:mx-0 lg:grid lg:grid-cols-7 lg:gap-3 lg:overflow-visible lg:px-0 lg:pb-0">
        {weekDays.map((day) => {
          const key = formatDateKey(day);
          const items = weekOccurrencesByDate.get(key) ?? [];
          const isToday = key === formatDateKey(new Date());

          return (
            <div key={key} className={`min-h-40 w-[78%] shrink-0 snap-start rounded-lg border p-3 min-[480px]:w-[45%] sm:w-[30%] lg:w-auto lg:shrink lg:snap-none ${isToday ? 'border-indigo-200 bg-indigo-50/40' : 'border-slate-200 bg-slate-50/70'}`}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-500">{day.toLocaleDateString(deviceLocale(), { weekday: 'short' })}</span>
                <span className="text-sm font-bold text-slate-900">{day.getDate()}</span>
              </div>
              <div className="space-y-2">
                {items.length ? items.slice(0, 5).map((occurrence) => (
                  <button key={occurrence.id} type="button" onClick={() => setSelectedOccurrence(occurrence)} className="block w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-left text-xs shadow-sm hover:border-indigo-200 hover:bg-indigo-50">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: occurrence.event?.category?.color ?? '#64748b' }} />
                      {timeToHourMinute(occurrence.start_datetime)}
                    </div>
                    <div className="mt-1 truncate text-slate-700">{occurrence.event?.title ?? `Event #${occurrence.event_id}`}</div>
                    <div className="mt-0.5 truncate text-slate-500">{occurrence.event?.location ?? '-'}</div>
                  </button>
                )) : <p className="text-xs text-slate-400">{weekLoading ? 'Se incarca...' : 'Fara evenimente'}</p>}
                {items.length > 5 ? <p className="text-xs font-semibold text-indigo-700">+{items.length - 5} mai multe</p> : null}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-slate-400 lg:hidden">{t('common.swipeHint', 'Glisează pentru a vedea toate zilele saptamanii')}</p>
    </SectionCard>
    <Modal
      open={Boolean(selectedOccurrence)}
      onClose={() => setSelectedOccurrence(null)}
      title={selectedOccurrence?.event?.title ?? 'Detalii eveniment'}
      subtitle={selectedOccurrence ? `${formatDateKey(new Date(selectedOccurrence.occurrence_date))} ${timeToHourMinute(selectedOccurrence.start_datetime)}-${timeToHourMinute(selectedOccurrence.end_datetime)}` : undefined}
    >
      {selectedOccurrence ? (
        <div className="space-y-4 text-sm text-slate-700">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase text-slate-500">Locatie</p>
              <p className="mt-1 font-medium text-slate-900">{selectedOccurrence.event?.location || '-'}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase text-slate-500">Categorie</p>
              <p className="mt-1 font-medium text-slate-900">{selectedOccurrence.event?.category?.name || '-'}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase text-slate-500">Status</p>
              <p className="mt-1 font-medium text-slate-900">{selectedOccurrence.status}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase text-slate-500">Locuri disponibile</p>
              <p className="mt-1 font-medium text-slate-900">{selectedOccurrence.available_places ?? 'Nelimitat'}</p>
            </div>
          </div>
          {selectedOccurrence.event?.description ? <p className="leading-6">{selectedOccurrence.event.description}</p> : null}
          {selectedOccurrence.event?.requires_active_service ? (
            <Alert tone="info">Necesita serviciu activ{selectedOccurrence.event.required_service?.name ? `: ${selectedOccurrence.event.required_service.name}` : ''}.</Alert>
          ) : null}
          {selectedOccurrence.event?.requires_payment ? (
            <Alert tone="info">Eveniment cu plata{selectedOccurrence.event.payment_amount ? `: ${selectedOccurrence.event.payment_amount} ${selectedOccurrence.event.payment_type ?? ''}` : ''}.</Alert>
          ) : null}
        </div>
      ) : null}
    </Modal>
    </>
  );

  if (!canViewDashboard) {
    return (
      <div className="space-y-5">
        {weekCalendarPanel}
        {announcementsPanel}
      </div>
    );
  }

  if (loading && !dashboard) {
    return (
      <SectionCard title={t('nav.dashboard')}>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">{t('dashboard.loading')}</div>
      </SectionCard>
    );
  }

  const stats = dashboard?.stats ?? { active_members: 0, flagged_services: 0, total_revenue: 0, active_locations: 0 };
  const automations = dashboard?.automations ?? [];

  return (
    <div className="space-y-5">
      {error && (
        <Alert tone="error">
          <span className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <Button type="button" size="sm" onClick={() => void loadDashboard()}>
              <RefreshCw size={16} />
              {t('common.refresh')}
            </Button>
          </span>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title={t('dashboard.activeMembers')} value={String(stats.active_members)} change={t('dashboard.liveUpdated')} helper={t('dashboard.activeMembersHelper')} icon={UserCheck} />
        <StatCard title={t('dashboard.flaggedServices')} value={String(stats.flagged_services)} change={t('dashboard.expiredOrSuspended')} helper={t('dashboard.needsFollowUp')} icon={CalendarClock} />
        <StatCard title={t('dashboard.totalRevenue')} value={`${money(stats.total_revenue)} RON`} change={t('dashboard.paymentsCalculated')} helper={t('dashboard.persistentData')} icon={BadgeEuro} />
        <StatCard title={t('dashboard.activeBranches')} value={String(stats.active_locations)} change={t('dashboard.membersByLocation')} helper={t('dashboard.branchesDefined')} icon={Building2} />
      </div>

      {weekCalendarPanel}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SectionCard title={t('dashboard.savedTransactionsRevenue')} action={<Button type="button" size="sm" onClick={() => void loadDashboard()} disabled={loading}><RefreshCw size={16} />{t('common.refresh')}</Button>}>
            <div className="h-72 w-full xl:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData.length ? revenueData : [{ period: t('dashboard.noData'), revenue: 0 }]} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} interval="preserveStartEnd" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} width={40} tickFormatter={compactMoney} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]} fill="#4f46e5" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>
        <div>
          <SectionCard title={t('dashboard.memberStatus')}>
            <div className="h-72 w-full xl:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusCounts.length ? statusCounts : [{ name: t('dashboard.noData'), value: 1, color: '#e2e8f0' }]} dataKey="value" nameKey="name" innerRadius={64} outerRadius={100} paddingAngle={4}>
                    {(statusCounts.length ? statusCounts : [{ name: t('dashboard.noData'), value: 1, color: '#e2e8f0' }]).map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {(statusCounts.length ? statusCounts : [{ name: t('dashboard.noData'), value: 0, color: '#e2e8f0' }]).map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm font-medium text-slate-700">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SectionCard title={t('dashboard.weeklyActivity')}>
            <div className="h-64 w-full xl:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityData.length ? activityData : [{ period: t('dashboard.noData'), active: 0, messages: 0 }]} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} interval="preserveStartEnd" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} width={32} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="active" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="messages" stroke="#0891b2" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>
        <div>
          {announcementsPanel}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div>
          <SectionCard title={t('dashboard.activeAutomations')}>
            <div className="space-y-2.5">
              {automations.length ? automations.map((item) => (
                <div key={item.key} className="flex items-start gap-3 rounded-md border border-slate-100 bg-slate-50/80 p-3">
                  <div className={`mt-1 h-2.5 w-2.5 rounded-full ${item.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{automationTitle(item, t)}</p>
                    <p className="text-xs text-slate-500">{automationHelper(item, t)}</p>
                  </div>
                </div>
              )) : (
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">{t('dashboard.noData')}</div>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
