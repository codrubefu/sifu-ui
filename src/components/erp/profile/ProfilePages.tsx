import { Award, Bell, CalendarDays, Check, KeyRound, Mail, Phone, ScanLine, UserCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiClientError } from '../../../api/apiClient';
import {
  getAuthenticatedUser,
  getAuthenticatedUserCustomFields,
  getAuthenticatedUserEvents,
  getAuthenticatedUserGrades,
  getAuthenticatedUserServices,
  updateAuthenticatedUserPassword,
  type AuthenticatedUserEvent,
} from '../../../api/authApi';
import { useAuth } from '../../../context/useAuth';
import type { ApiCustomFieldValue, ApiPaginated, ApiService, ApiUserGrade, AuthenticatedUser } from '../../../services/ErpApiService';
import { articlesService, type Article } from '../../../services/articlesService';
import { Alert, Button, Input, SectionCard, StatusBadge } from '../../primitives';
import { PrivacyPanel } from './PrivacyPanel';
import { formatDeviceDate } from '../../../utils/erp/formatters';

type PasswordForm = {
  current_password: string;
  password: string;
  password_confirmation: string;
};

const initialPasswordForm: PasswordForm = {
  current_password: '',
  password: '',
  password_confirmation: '',
};

function userDisplayName(user: ReturnType<typeof useAuth>['user'], fallback: string) {
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  if (user && 'name' in user && user.name) return user.name;
  return user?.email || fallback;
}

function unwrapList<T>(payload: ApiPaginated<T> | T[]) {
  return Array.isArray(payload) ? payload : payload.data ?? [];
}

function formatDate(value?: string | null) {
  return formatDeviceDate(value);
}

function serviceStatus(service: ApiService) {
  return service.status ?? service.pivot?.status ?? (service.is_currently_active ?? service.is_active ? 'active' : 'expired');
}

function serviceAccesses(service: ApiService) {
  const used = service.accesses_used ?? service.pivot?.accesses_used ?? 0;
  return service.max_accesses ? `${used} / ${service.max_accesses}` : '-';
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value)) return value.map(formatValue).join(', ');
  if (typeof value === 'boolean') return value ? 'Da' : 'Nu';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function customFieldRowsFromValues(source?: Record<string, unknown> | ApiCustomFieldValue[]) {
  if (!source) return [];
  if (Array.isArray(source)) {
    return source.map((entry: ApiCustomFieldValue, index) => ({
      key: String(entry.custom_field_id ?? entry.field_id ?? entry.slug ?? index),
      label: entry.custom_field?.name ?? entry.slug ?? `#${entry.custom_field_id ?? entry.field_id ?? index + 1}`,
      value: formatValue(entry.value),
    }));
  }
  return Object.entries(source).map(([key, value]) => ({ key, label: key, value: formatValue(value) }));
}

function userCustomFieldRows(user: ReturnType<typeof useAuth>['user']) {
  if (!user) return [];
  const customFieldValues = 'custom_field_values' in user ? user.custom_field_values : undefined;
  const customFields = 'custom_fields' in user ? user.custom_fields : undefined;
  return customFieldRowsFromValues(customFieldValues ?? customFields);
}

function eventTitle(event: AuthenticatedUserEvent) {
  return event.title || event.name || event.event?.title || event.event?.name || `#${event.id}`;
}

function eventStart(event: AuthenticatedUserEvent) {
  return event.starts_at || event.start_at || event.start_time || null;
}

function eventEnd(event: AuthenticatedUserEvent) {
  return event.ends_at || event.end_at || event.end_time || null;
}

export function ProfileInfoPage({ childId }: { childId?: number } = {}) {
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const [childUser, setChildUser] = useState<AuthenticatedUser | null>(null);
  const [childUserError, setChildUserError] = useState('');
  const user = childId ? childUser : authUser;
  const fallbackRows = useMemo(() => userCustomFieldRows(user), [user]);
  const [customFieldValues, setCustomFieldValues] = useState<ApiCustomFieldValue[]>([]);
  const [customFieldsLoading, setCustomFieldsLoading] = useState(false);
  const [customFieldsLoaded, setCustomFieldsLoaded] = useState(false);
  const [customFieldsError, setCustomFieldsError] = useState('');
  const rows = useMemo(() => {
    const endpointRows = customFieldRowsFromValues(customFieldValues);
    return customFieldsLoaded ? endpointRows : fallbackRows;
  }, [customFieldValues, customFieldsLoaded, fallbackRows]);
  const groups = user && 'groups' in user && Array.isArray(user.groups) ? user.groups : [];
  const locations = user && 'locations' in user && Array.isArray(user.locations) ? user.locations : [];
  const displayName = userDisplayName(user, t('profile.unknownUser'));
  const phone = user && 'phone' in user ? user.phone : null;

  useEffect(() => {
    if (!childId) return;
    let cancelled = false;
    setChildUserError('');
    getAuthenticatedUser(childId)
      .then((nextUser) => {
        if (!cancelled) setChildUser(nextUser);
      })
      .catch((err) => {
        if (!cancelled) setChildUserError(err instanceof Error ? err.message : t('profile.customFieldsLoadError'));
      });
    return () => {
      cancelled = true;
    };
  }, [childId, t]);

  const loadCustomFields = useCallback(async () => {
    setCustomFieldsLoading(true);
    setCustomFieldsError('');
    try {
      setCustomFieldValues(await getAuthenticatedUserCustomFields(childId));
      setCustomFieldsLoaded(true);
    } catch (err) {
      setCustomFieldsError(err instanceof Error ? err.message : t('profile.customFieldsLoadError'));
    } finally {
      setCustomFieldsLoading(false);
    }
  }, [childId, t]);

  useEffect(() => {
    void loadCustomFields();
  }, [loadCustomFields]);

  return (
    <div className="space-y-6">
      {childUserError ? <Alert tone="error">{childUserError}</Alert> : null}
      <SectionCard title={t('profile.infoTitle')}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-indigo-100 p-3 text-indigo-700"><UserCircle className="h-6 w-6" /></span>
              <div className="min-w-0">
                <p className="truncate text-lg font-bold text-slate-900">{displayName}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
            <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-indigo-600" />{user?.email ?? '-'}</p>
            <p className="mt-2 flex items-center gap-2"><Phone className="h-4 w-4 text-indigo-600" />{phone || '-'}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">{t('profile.groups')}</p>
            <div className="flex flex-wrap gap-2">
              {groups.length ? groups.map((group) => <span key={group.id} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{group.label || group.name}</span>) : <span className="text-sm text-slate-500">-</span>}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">{t('profile.locations')}</p>
            <div className="flex flex-wrap gap-2">
              {locations.length ? locations.map((location) => <span key={location.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{location.name}</span>) : <span className="text-sm text-slate-500">-</span>}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title={t('profile.customFields')} action={<button onClick={() => void loadCustomFields()} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">{t('common.refresh')}</button>}>
        {customFieldsError ? <Alert tone="error" className="mb-4">{customFieldsError}</Alert> : null}
        {rows.length ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {rows.map((row) => (
              <div key={row.key} className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase text-slate-500">{row.label}</p>
                <p className="mt-1 break-words text-sm font-medium text-slate-900">{row.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">{customFieldsLoading ? t('common.loading') : t('profile.noCustomFields')}</p>
        )}
      </SectionCard>
    </div>
  );
}

export function ProfileSecurityPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState<PasswordForm>(initialPasswordForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const setField = (field: keyof PasswordForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
    setSuccess('');
  };

  const submit = async () => {
    if (!form.current_password.trim() || !form.password || !form.password_confirmation) {
      setError(t('profile.passwordRequired'));
      return;
    }
    if (form.password !== form.password_confirmation) {
      setError(t('profile.passwordMismatch'));
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await updateAuthenticatedUserPassword(form);
      setForm(initialPasswordForm);
      setSuccess(t('profile.passwordUpdated'));
    } catch (err) {
      setError(err instanceof ApiClientError || err instanceof Error ? err.message : t('profile.passwordUpdateError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionCard title={t('profile.securityTitle')}>
      <form
        className="max-w-xl space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {error ? <Alert tone="error">{error}</Alert> : null}
        {success ? <Alert tone="success">{success}</Alert> : null}
        <Input label={t('profile.currentPassword')} type="password" value={form.current_password} onChange={(event) => setField('current_password', event.target.value)} />
        <Input label={t('profile.newPassword')} type="password" value={form.password} onChange={(event) => setField('password', event.target.value)} />
        <Input label={t('profile.confirmPassword')} type="password" value={form.password_confirmation} onChange={(event) => setField('password_confirmation', event.target.value)} />
        <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
          <KeyRound className="h-4 w-4" />
          {loading ? t('common.saving') : t('profile.savePassword')}
        </button>
      </form>
    </SectionCard>
  );
}

export function ProfilePrivacyPage({ childId }: { childId?: number } = {}) {
  return <PrivacyPanel childId={childId} />;
}

export function ProfileAnnouncementsPage({ childId }: { childId?: number } = {}) {
  const { t } = useTranslation();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const loadArticles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setArticles(unwrapList(await articlesService.feed({ per_page: 50 })));
    } catch (err) {
      setArticles([]);
      setError(err instanceof Error ? err.message : t('profile.announcementsLoadError', 'Nu am putut incarca anunturile.'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadArticles();
  }, [loadArticles]);

  const markViewed = async (article: Article) => {
    setMarkingId(article.id);
    setError('');
    try {
      const viewed = await articlesService.markViewed(article.id);
      setArticles((prev) => prev.map((item) => (item.id === article.id ? { ...item, viewed_at: viewed.viewed_at ?? new Date().toISOString() } : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile.announcementViewError', 'Nu am putut marca anuntul ca citit.'));
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <SectionCard title={t('profile.announcementsTitle', 'Anunturile mele')} action={<Button type="button" onClick={() => void loadArticles()} disabled={loading}>{t('common.refresh')}</Button>}>
      {error ? <Alert tone="error" className="mb-4">{error}</Alert> : null}
      <div className="space-y-3">
        {articles.length ? articles.map((article) => (
          <article key={article.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Bell className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-base font-semibold text-slate-950">{article.title}</h3>
                  {article.viewed_at ? <StatusBadge status={t('profile.announcementRead', 'Citit')} /> : <StatusBadge status={t('profile.announcementUnread', 'Necitit')} />}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{article.description}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>{t('articles.publishAt', 'Publicat')}: {formatDate(article.publish_at)}</span>
                  {article.expires_at ? <span>{t('articles.expiresAt', 'Expira')}: {formatDate(article.expires_at)}</span> : null}
                  <span>{t('articles.priority', 'Prioritate')}: {article.priority ?? 0}</span>
                </div>
              </div>
              {!article.viewed_at && !childId ? (
                <Button type="button" onClick={() => void markViewed(article)} disabled={markingId === article.id} size="sm" variant="primary">
                  <Check className="h-4 w-4" />
                  {t('profile.markAnnouncementRead', 'Marcheaza citit')}
                </Button>
              ) : null}
            </div>
          </article>
        )) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            {loading ? t('common.loading') : t('profile.noAnnouncements', 'Nu exista anunturi pentru tine.')}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

export function ProfileEventsPage({ childId }: { childId?: number } = {}) {
  const { t } = useTranslation();
  const [events, setEvents] = useState<AuthenticatedUserEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setEvents(unwrapList(await getAuthenticatedUserEvents(childId)));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile.eventsLoadError'));
    } finally {
      setLoading(false);
    }
  }, [childId, t]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  return (
    <SectionCard title={t('profile.eventsTitle')} action={<button onClick={() => void loadEvents()} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">{t('common.refresh')}</button>}>
      {error ? <Alert tone="error" className="mb-4">{error}</Alert> : null}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="pb-3 font-semibold">{t('profile.event')}</th>
              <th className="pb-3 font-semibold">{t('profile.startsAt')}</th>
              <th className="pb-3 font-semibold">{t('profile.endsAt')}</th>
              <th className="pb-3 font-semibold">{t('common.status')}</th>
            </tr>
          </thead>
          <tbody>
            {events.length ? events.map((event) => (
              <tr key={event.id} className="border-b border-slate-100">
                <td className="py-4 font-semibold text-slate-900"><CalendarDays className="mr-2 inline h-4 w-4 text-indigo-600" />{eventTitle(event)}</td>
                <td className="py-4 text-slate-600">{formatDate(eventStart(event))}</td>
                <td className="py-4 text-slate-600">{formatDate(eventEnd(event))}</td>
                <td className="py-4">{event.status ? <StatusBadge status={event.status} /> : '-'}</td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="py-10 text-center text-sm text-slate-500">{loading ? t('common.loading') : t('profile.noEvents')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

export function ProfileServicesPage({ childId }: { childId?: number } = {}) {
  const { t } = useTranslation();
  const [services, setServices] = useState<ApiService[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadServices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setServices(unwrapList(await getAuthenticatedUserServices(childId)));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile.servicesLoadError'));
    } finally {
      setLoading(false);
    }
  }, [childId, t]);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  return (
    <SectionCard title={t('profile.servicesTitle')} action={<button onClick={() => void loadServices()} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">{t('common.refresh')}</button>}>
      {error ? <Alert tone="error" className="mb-4">{error}</Alert> : null}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="pb-3 font-semibold">{t('services.service')}</th>
              <th className="pb-3 font-semibold">{t('services.price')}</th>
              <th className="pb-3 font-semibold">{t('services.duration')}</th>
              <th className="pb-3 font-semibold">{t('users.startDate')}</th>
              <th className="pb-3 font-semibold">{t('users.expires')}</th>
              <th className="pb-3 font-semibold">{t('services.accesses')}</th>
              <th className="pb-3 font-semibold">{t('services.resumeAt')}</th>
              <th className="pb-3 font-semibold">{t('common.status')}</th>
            </tr>
          </thead>
          <tbody>
            {services.length ? services.map((service) => (
              <tr key={service.id} className="border-b border-slate-100 align-top">
                <td className="max-w-[360px] py-4">
                  <p className="font-semibold text-slate-900">{service.name}</p>
                  <p className="mt-1 text-xs text-slate-500">#{service.id}</p>
                  <p className="mt-1 text-sm text-slate-600">{service.description || '-'}</p>
                </td>
                <td className="py-4 font-semibold text-slate-900">{service.price} {service.currency}</td>
                <td className="py-4 text-slate-600">{service.duration_days ? t('services.days', { count: service.duration_days }) : t('services.noAutoExpiry')}</td>
                <td className="py-4 text-slate-600">{formatDate(service.start_date ?? service.pivot?.start_date)}</td>
                <td className="py-4 text-slate-600">{formatDate(service.expires_at ?? service.pivot?.expires_at)}</td>
                <td className="py-4 text-slate-600">{serviceAccesses(service)}</td>
                <td className="py-4 text-slate-600">{formatDate(service.resume_at ?? service.pivot?.resume_at)}</td>
                <td className="py-4">
                  <StatusBadge status={t(`services.assignmentStatuses.${serviceStatus(service)}`)} />
                  {service.status_reason ?? service.pivot?.status_reason ? <p className="mt-1 text-xs text-slate-500">{service.status_reason ?? service.pivot?.status_reason}</p> : null}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={8} className="py-10 text-center text-sm text-slate-500">{loading ? t('common.loading') : t('profile.noServices')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

export function ProfileCodePage({ childId }: { childId?: number } = {}) {
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const [childUser, setChildUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const user = childId ? childUser : authUser;
  const userCode = user && 'user_code' in user ? user.user_code : null;

  const loadChildUser = useCallback(async (cancelledRef: { current: boolean }) => {
    setLoading(true);
    setError('');
    try {
      const nextUser = await getAuthenticatedUser(childId);
      if (!cancelledRef.current) setChildUser(nextUser);
    } catch (err) {
      if (!cancelledRef.current) setError(err instanceof Error ? err.message : t('profile.customFieldsLoadError'));
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, [childId, t]);

  useEffect(() => {
    if (!childId) return;
    const cancelledRef = { current: false };
    void loadChildUser(cancelledRef);
    return () => {
      cancelledRef.current = true;
    };
  }, [childId, loadChildUser]);

  return (
    <SectionCard title={t('profile.codeTitle', 'Cod utilizator')}>
      {error ? <Alert tone="error" className="mb-4">{error}</Alert> : null}
      <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-4">
        <span className="rounded-lg bg-indigo-100 p-3 text-indigo-700"><ScanLine className="h-6 w-6" /></span>
        <p className="text-lg font-bold text-slate-900">{loading ? t('common.loading') : userCode || '-'}</p>
      </div>
    </SectionCard>
  );
}

export function ProfileGradesPage({ childId }: { childId?: number } = {}) {
  const { t } = useTranslation();
  const [gradeHistory, setGradeHistory] = useState<ApiUserGrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadGrades = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setGradeHistory(unwrapList(await getAuthenticatedUserGrades(childId)));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('users.gradesLoadError'));
    } finally {
      setLoading(false);
    }
  }, [childId, t]);

  useEffect(() => {
    void loadGrades();
  }, [loadGrades]);

  return (
    <SectionCard title={t('users.grades')} action={<Button type="button" onClick={() => void loadGrades()} disabled={loading}>{t('common.refresh')}</Button>}>
      {error ? <Alert tone="error" className="mb-4">{error}</Alert> : null}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">{t('users.grade')}</th>
              <th className="px-4 py-3">{t('users.gradeObtainedAt')}</th>
              <th className="px-4 py-3">{t('users.gradeDescription')}</th>
            </tr>
          </thead>
          <tbody>
            {gradeHistory.map((record) => (
              <tr key={record.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-semibold">
                  <Award className="mr-2 inline h-4 w-4 text-indigo-600" />
                  {record.grade?.name ?? record.grade_id}
                  {record.id === gradeHistory[0]?.id ? <span className="ml-2 rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">{t('users.activeGrade')}</span> : null}
                </td>
                <td className="px-4 py-3">{formatDate(record.obtained_at)}</td>
                <td className="px-4 py-3">{record.description || '-'}</td>
              </tr>
            ))}
            {gradeHistory.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-10 text-center text-sm text-slate-500">{loading ? t('common.loading') : t('users.noGrades')}</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
