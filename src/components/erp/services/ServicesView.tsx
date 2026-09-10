import { Edit3, Filter, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Input, SectionCard, StatusBadge, SuccessMessage, Textarea } from '../../primitives';
import { erpApiService, type ApiService, type ApiServiceUser, type ServiceExpirationRule, type ServiceType } from '../../../services/ErpApiService';
import { PageShell } from '../shared/PageShell';
import { formatDeviceDate } from '../../../utils/erp/formatters';
import { Can } from '../../Can';
import { useAuth } from '../../../context/useAuth';
import { apiClient } from '../../../api/apiClient';

type ServiceForm = {
  name: string;
  description: string;
  type: ServiceType;
  price: string;
  currency: string;
  duration_days: string;
  expiration_rule: ServiceExpirationRule;
  fixed_expires_at: string;
  grace_period_days: string;
  max_accesses: string;
  max_users: string;
  is_active: boolean;
};

type ServicesViewProps = {
  openOnMount?: boolean;
};

const emptyForm: ServiceForm = {
  name: '',
  description: '',
  type: 'membership',
  price: '',
  currency: 'EUR',
  duration_days: '',
  expiration_rule: 'duration',
  fixed_expires_at: '',
  grace_period_days: '0',
  max_accesses: '',
  max_users: '',
  is_active: true,
};

function optionalNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function buildPayload(form: ServiceForm) {
  return {
    name: form.name,
    description: form.description || null,
    type: form.type,
    price: Number(form.price) || 0,
    currency: form.currency.trim().toUpperCase() || 'EUR',
    duration_days: optionalNumber(form.duration_days),
    expiration_rule: form.expiration_rule,
    fixed_expires_at: form.expiration_rule === 'fixed_date' ? form.fixed_expires_at || null : null,
    grace_period_days: Number(form.grace_period_days) || 0,
    max_accesses: optionalNumber(form.max_accesses),
    max_users: optionalNumber(form.max_users),
    is_active: form.is_active,
  };
}

function formFromService(service: ApiService): ServiceForm {
  return {
    name: service.name ?? '',
    description: service.description ?? '',
    type: service.type ?? 'membership',
    price: String(service.price ?? ''),
    currency: service.currency ?? 'EUR',
    duration_days: service.duration_days ? String(service.duration_days) : '',
    expiration_rule: service.expiration_rule ?? 'duration',
    fixed_expires_at: service.fixed_expires_at ? service.fixed_expires_at.slice(0, 16) : '',
    grace_period_days: String(service.grace_period_days ?? 0),
    max_accesses: service.max_accesses ? String(service.max_accesses) : '',
    max_users: service.max_users ? String(service.max_users) : '',
    is_active: Boolean(service.is_active),
  };
}

function userName(user: ApiServiceUser) {
  return `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email;
}

function serviceTypeLabel(type: ServiceType | undefined, t: ReturnType<typeof useTranslation>['t']) {
  return t(`services.types.${type ?? 'membership'}`);
}

function expirationRuleLabel(rule: ServiceExpirationRule | undefined, t: ReturnType<typeof useTranslation>['t']) {
  return t(`services.expirationRules.${rule ?? 'duration'}`);
}

export function ServicesView({ openOnMount = false }: ServicesViewProps = {}) {
  const { t } = useTranslation();
  const { hasAnyRight } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const membersMatch = location.pathname.match(/^\/erp\/(?:services|services)\/(\d+)\/members$/);
  const membersServiceId = membersMatch ? Number(membersMatch[1]) : null;
  const [services, setServices] = useState<ApiService[]>([]);
  const [serviceMembers, setServiceMembers] = useState<ApiServiceUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [perPage, setPerPage] = useState(15);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState<ApiService | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [selectedService, setSelectedService] = useState<ApiService | null>(null);
  const [serviceUsersLoading, setServiceUsersLoading] = useState(false);

  const loadServiceUsers = useCallback(async (serviceId: number) => {
    setServiceUsersLoading(true);
    try {
      const data = await erpApiService.get<ApiService>('services', serviceId);
      setServiceMembers(data.users ?? []);
    } catch {
      setServiceMembers([]);
    } finally {
      setServiceUsersLoading(false);
    }
  }, []);

  const fetchServices = useCallback(async (search: string, limit: number, active: typeof activeFilter) => {
    setLoading(true);
    setError('');
    try {
      const data = await erpApiService.list<ApiService>('services', {
        search,
        per_page: limit,
        is_active: active === 'all' ? undefined : active === 'active' ? '1' : '0',
      });
      setServices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('services.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadServices = useCallback(() => fetchServices(searchTerm, perPage, activeFilter), [activeFilter, fetchServices, perPage, searchTerm]);

  useEffect(() => {
    void fetchServices('', 15, 'all');
  }, [fetchServices]);

  useEffect(() => {
    if ((openOnMount || ['/erp/services/new', '/erp/services/new'].includes(location.pathname)) && hasAnyRight(['services.create', 'services.manage'])) {
      setEditing(null);
      setForm(emptyForm);
      setFormOpen(true);
    }
  }, [hasAnyRight, location.pathname, openOnMount]);

  useEffect(() => {
    if (!selectedService) return;
    void loadServiceUsers(selectedService.id);
  }, [loadServiceUsers, selectedService]);

  useEffect(() => {
    if (!membersServiceId) return;
    setSelectedService((prev) => (prev?.id === membersServiceId ? prev : null));

    const loadServiceForMembersPage = async () => {
      setServiceUsersLoading(true);
      try {
        const service = await erpApiService.get<ApiService>('services', membersServiceId);
        setSelectedService(service);
        setServiceMembers(service.users ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('services.loadOneError'));
      } finally {
        setServiceUsersLoading(false);
      }
    };

    void loadServiceForMembersPage();
  }, [membersServiceId, t]);

  const usersForSelectedService = useMemo(() => {
    return serviceMembers;
  }, [serviceMembers]);

  const resetFilters = () => {
    setSearchTerm('');
    setPerPage(15);
    setActiveFilter('all');
    void fetchServices('', 15, 'all');
  };

  const startCreate = () => {
    if (!hasAnyRight(['services.create', 'services.manage'])) return;
    setEditing(null);
    setForm(emptyForm);
    setSuccess('');
    setFormOpen(true);
    if (location.pathname !== '/erp/services/new') {
      navigate('/erp/services/new');
    }
  };

  const startEdit = (service: ApiService) => {
    if (!hasAnyRight(['services.update', 'services.manage'])) return;
    setEditing(service);
    setForm(formFromService(service));
    setSuccess('');
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setSuccess('');
    if (location.pathname !== '/erp/services') {
      navigate('/erp/services');
    }
  };

  const saveService = async (closeAfterSave = false) => {
    if (editing && !hasAnyRight(['services.update', 'services.manage'])) return;
    if (!editing && !hasAnyRight(['services.create', 'services.manage'])) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      let savedService: ApiService;
      if (editing) {
        savedService = await erpApiService.update<ApiService>('services', editing.id, buildPayload(form));
      } else {
        savedService = await erpApiService.create<ApiService>('services', buildPayload(form));
      }
      setEditing(savedService);
      setForm(formFromService(savedService));
      setSuccess(t('common.saved'));
      await loadServices();
      if (closeAfterSave) closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('services.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const deleteService = async (service: ApiService) => {
    if (!hasAnyRight(['services.delete', 'services.manage'])) return;
    if (!window.confirm(t('services.deleteConfirm', { name: service.name }))) return;
    setError('');
    try {
      await erpApiService.remove('services', service.id);
      await loadServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('services.deleteError'));
    }
  };

  const restoreService = async (service: ApiService) => {
    if (!hasAnyRight(['services.restore', 'services.manage'])) return;
    setError('');
    try {
      await apiClient<ApiService>(`/services/${service.id}/restore`, { method: 'POST' });
      await loadServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('services.restoreError'));
    }
  };

  const openUsersPanel = (service: ApiService) => {
    setSelectedService(service);
    navigate(`/erp/services/${service.id}/members`);
  };

  const closeUsersPanel = () => {
    setSelectedService(null);
    navigate('/erp/services');
  };

  if (!hasAnyRight(['services.view', 'services.manage'])) {
    return <SectionCard title={t('services.title')}><p className="text-sm text-slate-600">{t('services.missingViewRight')}</p></SectionCard>;
  }

  if (formOpen) {
    return (
      <PageShell
        title={editing ? t('services.edit') : t('services.add')}
        subtitle={t('services.formSubtitle')}
        backLabel={t('services.backToList')}
        onBack={closeForm}
      >
        {error ? <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
        {success ? <SuccessMessage fixed>{success}</SuccessMessage> : null}
        <SectionCard
          title={editing ? t('services.editCardTitle', { id: editing.id }) : t('services.add')}
          action={
            <button onClick={closeForm} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm">
              <X className="h-4 w-4" />{t('common.close')}
            </button>
          }
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Input label={t('services.name')} value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Enterprise" />
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">{t('services.type')}</span>
              <select value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as ServiceType }))} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100">
                <option value="membership">{t('services.types.membership')}</option>
                <option value="access_pass">{t('services.types.access_pass')}</option>
              </select>
            </label>
            <Input label={t('services.price')} type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))} placeholder="99.99" />
            <Input label={t('services.currency')} maxLength={3} value={form.currency} onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))} placeholder="EUR" />
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">{t('services.expirationRule')}</span>
              <select value={form.expiration_rule} onChange={(event) => setForm((prev) => ({ ...prev, expiration_rule: event.target.value as ServiceExpirationRule }))} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100">
                <option value="duration">{t('services.expirationRules.duration')}</option>
                <option value="fixed_date">{t('services.expirationRules.fixed_date')}</option>
                <option value="none">{t('services.expirationRules.none')}</option>
              </select>
            </label>
            <Input label={t('services.durationDays')} type="number" min="1" value={form.duration_days} onChange={(event) => setForm((prev) => ({ ...prev, duration_days: event.target.value }))} placeholder="365" />
            {form.expiration_rule === 'fixed_date' ? <Input label={t('services.fixedExpiresAt')} type="datetime-local" value={form.fixed_expires_at} onChange={(event) => setForm((prev) => ({ ...prev, fixed_expires_at: event.target.value }))} /> : null}
            <Input label={t('services.gracePeriodDays')} type="number" min="0" value={form.grace_period_days} onChange={(event) => setForm((prev) => ({ ...prev, grace_period_days: event.target.value }))} placeholder="0" />
            <Input label={t('services.maxAccesses')} type="number" min="1" value={form.max_accesses} onChange={(event) => setForm((prev) => ({ ...prev, max_accesses: event.target.value }))} placeholder="30" />
            <Input label={t('services.maxUsers')} type="number" min="1" value={form.max_users} onChange={(event) => setForm((prev) => ({ ...prev, max_users: event.target.value }))} placeholder="25" />
            <label className="flex h-10 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={form.is_active} onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))} className="h-4 w-4 accent-indigo-600" />
              {t('services.activeService')}
            </label>
            <div className="md:col-span-2">
              <Textarea label={t('services.description')} value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Enterprise service" />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button onClick={closeForm} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm">{t('common.cancel')}</button>
            <Can anyOf={editing ? ['services.update', 'services.manage'] : ['services.create', 'services.manage']}>
              <button onClick={() => void saveService()} disabled={saving} className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
                <Save className="mr-2 inline h-4 w-4" />{saving ? t('common.saving') : t('services.save')}
              </button>
              <button onClick={() => void saveService(true)} disabled={saving} className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                <Save className="mr-2 inline h-4 w-4" />{saving ? t('common.saving') : t('common.saveAndClose')}
              </button>
            </Can>
          </div>
        </SectionCard>
      </PageShell>
    );
  }

  if (membersServiceId) {
    return (
      <PageShell
        title={selectedService ? t('services.membersFor', { name: selectedService.name }) : t('services.serviceMembers')}
        subtitle={t('services.membersSubtitle')}
        backLabel={t('services.backToList')}
        onBack={closeUsersPanel}
      >
        {error ? <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
        <SectionCard
          title={t('services.serviceMembers')}
          action={
            <button onClick={closeUsersPanel} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm">
              <X className="h-4 w-4" />{t('common.close')}
            </button>
          }
        >
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {serviceUsersLoading ? t('services.loadingMembers') : t('services.showingMembers', { count: usersForSelectedService.length })}
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-sm text-slate-700 [&_tbody_tr:nth-child(even)]:bg-slate-50/45">
              <thead>
                <tr className="bg-slate-50 text-xs uppercase text-slate-500">
                  <th className="border-b border-slate-200 px-5 py-3 font-semibold">{t('payments.member')}</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-semibold">{t('users.contact')}</th>
                  <th className="border-b border-slate-200 px-5 py-3 font-semibold">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody>
                {usersForSelectedService.length > 0 ? usersForSelectedService.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 align-top transition-colors hover:bg-indigo-50/30">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-900">{userName(user)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <p>{user.email}</p>
                      <p className="text-xs text-slate-500">{user.phone || '-'}</p>
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={user.active ? t('users.statusActive') : t('users.statusInactive')} /></td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="py-10 text-center text-sm text-slate-500">
                      {serviceUsersLoading ? t('services.loadingMembersShort') : t('services.noMembers')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        </SectionCard>
      </PageShell>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title={t('services.managementTitle')}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={resetFilters} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
              <Filter className="mr-2 inline h-4 w-4" />{t('users.resetFilters')}
            </button>
            <button onClick={() => void loadServices()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
              <RefreshCw className="mr-2 inline h-4 w-4" />{t('common.refresh')}
            </button>
            <Can anyOf={['services.create', 'services.manage']}>
              <button onClick={startCreate} className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">
                <Plus className="mr-2 inline h-4 w-4" />{t('services.add')}
              </button>
            </Can>
          </div>
        }
      >
        <div className="mb-5 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[minmax(0,1fr)_150px_150px_auto]">
          <Input
            label={t('common.search')}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void loadServices();
            }}
            placeholder={t('services.searchPlaceholder')}
          />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">{t('common.status')}</span>
            <select value={activeFilter} onChange={(event) => setActiveFilter(event.target.value as typeof activeFilter)} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100">
              <option value="all">{t('common.all')}</option>
              <option value="active">{t('services.active')}</option>
              <option value="inactive">{t('services.inactive')}</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">{t('users.perPage')}</span>
            <select value={perPage} onChange={(event) => setPerPage(Number(event.target.value))} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100">
              {[10, 15, 25, 50].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <div className="flex items-end">
            <button onClick={() => void loadServices()} className="h-10 w-full rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white">{t('common.search')}</button>
          </div>
        </div>

        {error ? <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}

        <div className="mb-4 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {t('services.showingCount', { count: services.length })}
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
          <table className="min-w-[1050px] w-full text-left text-sm text-slate-700 [&_tbody_tr:nth-child(even)]:bg-slate-50/45">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase text-slate-500">
                <th className="border-b border-slate-200 px-5 py-3 font-semibold">{t('services.service')}</th>
                <th className="border-b border-slate-200 px-4 py-3 font-semibold">{t('services.price')}</th>
                <th className="border-b border-slate-200 px-4 py-3 font-semibold">{t('services.limits')}</th>
                <th className="border-b border-slate-200 px-4 py-3 font-semibold">{t('services.members')}</th>
                <th className="border-b border-slate-200 px-4 py-3 font-semibold">{t('common.status')}</th>
                <th className="border-b border-slate-200 px-5 py-3 font-semibold text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {services.length > 0 ? services.map((service) => (
                <tr key={service.id} className="border-b border-slate-100 align-top transition-colors hover:bg-indigo-50/30">
                  <td className="max-w-[320px] px-5 py-3">
                    <p className="font-semibold text-slate-900">{service.name}</p>
                    <p className="text-xs text-slate-500">#{service.id} - {t('branches.updated')} {formatDeviceDate(service.updated_at)}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{serviceTypeLabel(service.type, t)} - {expirationRuleLabel(service.expiration_rule, t)}</p>
                    <p className="mt-1 text-sm text-slate-600">{service.description || '-'}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{service.price} {service.currency}</td>
                  <td className="px-4 py-3 text-slate-600">
                    <p>{t('services.duration')}: {service.duration_days ? t('services.days', { count: service.duration_days }) : t('services.noAutoExpiry')}</p>
                    {service.expiration_rule === 'fixed_date' ? <p>{t('services.fixedExpiresAt')}: {formatDeviceDate(service.fixed_expires_at)}</p> : null}
                    <p>{t('services.gracePeriodDays')}: {service.grace_period_days ?? 0}</p>
                    <p>{t('services.maxAccesses')}: {service.max_accesses ?? '-'}</p>
                    <p>{t('branches.users')}: {service.max_users ?? '-'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{service.users_count ?? service.users?.length ?? '-'}</td>
                  <td className="px-4 py-3"><StatusBadge status={service.is_active ? t('users.statusActive') : t('users.statusInactive')} /></td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openUsersPanel(service)} className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        {t('services.members')}
                      </button>
                      {service.deleted_at ? (
                        <Can anyOf={['services.restore', 'services.manage']}>
                          <button onClick={() => void restoreService(service)} className="inline-flex items-center rounded-lg border border-emerald-100 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50">
                            <RefreshCw className="mr-2 h-4 w-4" />{t('common.restore')}
                          </button>
                        </Can>
                      ) : (
                        <>
                          <Can anyOf={['services.update', 'services.manage']}>
                            <button onClick={() => startEdit(service)} className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                              <Edit3 className="mr-2 h-4 w-4" />{t('common.edit')}
                            </button>
                          </Can>
                          <Can anyOf={['services.delete', 'services.manage']}>
                            <button onClick={() => void deleteService(service)} className="inline-flex items-center rounded-lg border border-red-100 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                              <Trash2 className="mr-2 h-4 w-4" />{t('common.delete')}
                            </button>
                          </Can>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-slate-500">{loading ? t('services.loadingList') : t('services.empty')}</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </SectionCard>

    </div>
  );
}
