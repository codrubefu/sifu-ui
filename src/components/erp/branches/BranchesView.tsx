import { Edit3, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable, EmptyTableRow, Input, SectionCard, SuccessMessage, TableCell, TableHeadCell, TableRow, TableShell } from '../../primitives';
import { erpApiService, type ApiLocation, type ApiLocationGroup } from '../../../services/ErpApiService';
import { PageShell } from '../shared/PageShell';
import { formatDeviceDate } from '../../../utils/erp/formatters';

type LocationForm = {
  name: string;
  description: string;
  location_group_id: string;
  user_ids: string;
};

const emptyForm: LocationForm = {
  name: '',
  description: '',
  location_group_id: '',
  user_ids: '',
};

function toIdList(value: string) {
  return value
    .split(',')
    .map((part) => Number(part.trim()))
    .filter(Boolean);
}

function buildPayload(form: LocationForm) {
  return {
    name: form.name,
    description: form.description || null,
    location_group_id: form.location_group_id ? Number(form.location_group_id) : null,
    user_ids: toIdList(form.user_ids),
  };
}

function formFromLocation(location: ApiLocation): LocationForm {
  return {
    name: location.name ?? '',
    description: location.description ?? '',
    location_group_id: String(location.location_group_id ?? location.location_group?.id ?? ''),
    user_ids: '',
  };
}

export function BranchesView() {
  const { t } = useTranslation();
  const [locations, setLocations] = useState<ApiLocation[]>([]);
  const [locationGroups, setLocationGroups] = useState<ApiLocationGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState<ApiLocation | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<LocationForm>(emptyForm);

  const fetchLocations = useCallback(async (search: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await erpApiService.list<ApiLocation>('locations', { search, per_page: 100 });
      setLocations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('branches.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadLocations = useCallback(() => fetchLocations(searchTerm), [fetchLocations, searchTerm]);

  useEffect(() => {
    void fetchLocations('');
  }, [fetchLocations]);

  useEffect(() => {
    erpApiService.list<ApiLocationGroup>('location-groups', { per_page: 100 })
      .then(setLocationGroups)
      .catch(() => setLocationGroups([]));
  }, []);

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setSuccess('');
    setFormOpen(true);
  };

  const startEdit = (location: ApiLocation) => {
    setEditing(location);
    setForm(formFromLocation(location));
    setSuccess('');
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setSuccess('');
  };

  const saveLocation = async (closeAfterSave = false) => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      let savedLocation: ApiLocation;
      if (editing) {
        savedLocation = await erpApiService.update<ApiLocation>('locations', editing.id, buildPayload(form));
      } else {
        savedLocation = await erpApiService.create<ApiLocation>('locations', buildPayload(form));
      }
      setEditing(savedLocation);
      setForm(formFromLocation(savedLocation));
      setSuccess(t('common.saved'));
      await loadLocations();
      if (closeAfterSave) closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('branches.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const deleteLocation = async (location: ApiLocation) => {
    if (!window.confirm(t('branches.deleteConfirm', { name: location.name }))) return;
    setError('');
    try {
      await erpApiService.remove('locations', location.id);
      await loadLocations();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('branches.deleteError'));
    }
  };

  if (formOpen) {
    return (
      <PageShell
        title={editing ? t('branches.edit') : t('branches.add')}
        subtitle={t('branches.formSubtitle')}
        backLabel={t('branches.backToList')}
        onBack={closeForm}
      >
        {error ? <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
        {success ? <SuccessMessage fixed>{success}</SuccessMessage> : null}
        <SectionCard
          title={editing ? t('branches.editCardTitle', { id: editing.id }) : t('branches.add')}
          action={
            <button onClick={closeForm} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
              <X className="h-4 w-4" />{t('common.close')}
            </button>
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label={t('branches.name')} value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Main Office" />
            <Input label={t('branches.description')} value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Headquarters" />
            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-2 block">{t('branches.locationGroup')}</span>
              <select value={form.location_group_id} onChange={(event) => setForm((prev) => ({ ...prev, location_group_id: event.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100">
                <option value="">{t('branches.noLocationGroup')}</option>
                {locationGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select>
            </label>
            <div className="md:col-span-2">
              <Input label={t('branches.userIds')} value={form.user_ids} onChange={(event) => setForm((prev) => ({ ...prev, user_ids: event.target.value }))} placeholder="1, 2" />
              <p className="mt-2 text-xs text-slate-500">{t('branches.userIdsHint')}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button onClick={closeForm} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">{t('common.cancel')}</button>
            <button onClick={() => void saveLocation()} disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
              <Save className="mr-2 inline h-4 w-4" />{saving ? t('common.saving') : t('branches.save')}
            </button>
            <button onClick={() => void saveLocation(true)} disabled={saving} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
              <Save className="mr-2 inline h-4 w-4" />{saving ? t('common.saving') : t('common.saveAndClose')}
            </button>
          </div>
        </SectionCard>
      </PageShell>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title={t('branches.title')}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => void loadLocations()} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
              <RefreshCw className="mr-2 inline h-4 w-4" />{t('common.refresh')}
            </button>
            <button onClick={startCreate} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
              <Plus className="mr-2 inline h-4 w-4" />{t('branches.add')}
            </button>
          </div>
        }
      >
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            label={t('common.search')}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void loadLocations();
            }}
            placeholder={t('branches.searchPlaceholder')}
          />
          <div className="flex items-end">
            <button onClick={() => void loadLocations()} className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white">{t('common.search')}</button>
          </div>
        </div>

        {error ? <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}

        <div className="mb-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {t('branches.showingCount', { count: locations.length })}
        </div>

        <TableShell>
          <DataTable>
            <thead>
              <tr>
                <TableHeadCell>{t('branches.name')}</TableHeadCell>
                <TableHeadCell>{t('branches.description')}</TableHeadCell>
                <TableHeadCell>{t('branches.locationGroup')}</TableHeadCell>
                <TableHeadCell>{t('branches.users')}</TableHeadCell>
                <TableHeadCell>{t('branches.updated')}</TableHeadCell>
                <TableHeadCell align="right">{t('common.actions')}</TableHeadCell>
              </tr>
            </thead>
            <tbody>
              {locations.map((location) => (
                <TableRow key={location.id}>
                  <TableCell label={t('branches.name')} className="font-medium text-slate-900">{location.name}</TableCell>
                  <TableCell label={t('branches.description')} className="max-w-[360px] text-slate-600">{location.description || t('branches.defaultDescription')}</TableCell>
                  <TableCell label={t('branches.locationGroup')} className="text-slate-600">{location.location_group?.name ?? t('branches.noLocationGroup')}</TableCell>
                  <TableCell label={t('branches.users')} className="text-slate-600">{location.users_count ?? 0}</TableCell>
                  <TableCell label={t('branches.updated')} className="text-slate-600">{formatDeviceDate(location.updated_at)}</TableCell>
                  <TableCell label={t('common.actions')} align="right">
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <button onClick={() => startEdit(location)} className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white">
                        <Edit3 className="mr-2 h-4 w-4" />{t('common.edit')}
                      </button>
                      <button onClick={() => void deleteLocation(location)} className="inline-flex items-center rounded-lg border border-red-100 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                        <Trash2 className="mr-2 h-4 w-4" />{t('common.delete')}
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && locations.length === 0 ? <EmptyTableRow colSpan={6}>{t('branches.empty')}</EmptyTableRow> : null}
              {loading ? <EmptyTableRow colSpan={6}>{t('branches.loadingList')}</EmptyTableRow> : null}
            </tbody>
          </DataTable>
        </TableShell>
      </SectionCard>

    </div>
  );
}
