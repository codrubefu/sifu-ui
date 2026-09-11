import { Edit3, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { erpApiService, type ApiLocationGroup } from '../../../services/ErpApiService';
import { DataTable, EmptyTableRow, Input, SectionCard, SuccessMessage, TableCell, TableHeadCell, TableRow, TableShell } from '../../primitives';
import { PageShell } from '../shared/PageShell';
import { formatDeviceDate } from '../../../utils/erp/formatters';

type LocationGroupForm = {
  name: string;
  description: string;
};

const emptyForm: LocationGroupForm = {
  name: '',
  description: '',
};

function buildPayload(form: LocationGroupForm) {
  return {
    name: form.name,
    description: form.description || null,
  };
}

function formFromLocationGroup(group: ApiLocationGroup): LocationGroupForm {
  return {
    name: group.name ?? '',
    description: group.description ?? '',
  };
}

export function LocationGroupsView() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<ApiLocationGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState<ApiLocationGroup | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<LocationGroupForm>(emptyForm);

  const fetchGroups = useCallback(async (search: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await erpApiService.list<ApiLocationGroup>('location-groups', { search, per_page: 100 });
      setGroups(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('locationGroups.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadGroups = useCallback(() => fetchGroups(searchTerm), [fetchGroups, searchTerm]);

  useEffect(() => {
    void fetchGroups('');
  }, [fetchGroups]);

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setSuccess('');
    setFormOpen(true);
  };

  const startEdit = (group: ApiLocationGroup) => {
    setEditing(group);
    setForm(formFromLocationGroup(group));
    setSuccess('');
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setSuccess('');
  };

  const saveGroup = async (closeAfterSave = false) => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      let savedGroup: ApiLocationGroup;
      if (editing) {
        savedGroup = await erpApiService.update<ApiLocationGroup>('location-groups', editing.id, buildPayload(form));
      } else {
        savedGroup = await erpApiService.create<ApiLocationGroup>('location-groups', buildPayload(form));
      }
      setEditing(savedGroup);
      setForm(formFromLocationGroup(savedGroup));
      setSuccess(t('common.saved'));
      await loadGroups();
      if (closeAfterSave) closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('locationGroups.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const deleteGroup = async (group: ApiLocationGroup) => {
    if (!window.confirm(t('locationGroups.deleteConfirm', { name: group.name }))) return;
    setError('');
    try {
      await erpApiService.remove('location-groups', group.id);
      await loadGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('locationGroups.deleteError'));
    }
  };

  if (formOpen) {
    return (
      <PageShell title={editing ? t('locationGroups.edit') : t('locationGroups.add')} subtitle={t('locationGroups.formSubtitle')} backLabel={t('locationGroups.backToList')} onBack={closeForm}>
        {error ? <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
        {success ? <SuccessMessage fixed>{success}</SuccessMessage> : null}
        <SectionCard
          title={editing ? t('locationGroups.editCardTitle', { id: editing.id }) : t('locationGroups.add')}
          action={<button onClick={closeForm} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"><X className="h-4 w-4" />{t('common.close')}</button>}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label={t('locationGroups.name')} value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="North Region" />
            <Input label={t('locationGroups.description')} value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Locations in the north region" />
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button onClick={closeForm} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">{t('common.cancel')}</button>
            <button onClick={() => void saveGroup()} disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
              <Save className="mr-2 inline h-4 w-4" />{saving ? t('common.saving') : t('locationGroups.save')}
            </button>
            <button onClick={() => void saveGroup(true)} disabled={saving} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
              <Save className="mr-2 inline h-4 w-4" />{saving ? t('common.saving') : t('common.saveAndClose')}
            </button>
          </div>
        </SectionCard>
      </PageShell>
    );
  }

  return (
    <SectionCard
      title={t('locationGroups.title')}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => void loadGroups()} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"><RefreshCw className="mr-2 inline h-4 w-4" />{t('common.refresh')}</button>
          <button onClick={startCreate} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"><Plus className="mr-2 inline h-4 w-4" />{t('locationGroups.add')}</button>
        </div>
      }
    >
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
        <Input label={t('common.search')} value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void loadGroups(); }} placeholder={t('locationGroups.searchPlaceholder')} />
        <div className="flex items-end"><button onClick={() => void loadGroups()} className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white">{t('common.search')}</button></div>
      </div>

      {error ? <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
      <div className="mb-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">{t('locationGroups.showingCount', { count: groups.length })}</div>

      <TableShell>
        <DataTable>
          <thead>
            <tr>
              <TableHeadCell>{t('locationGroups.name')}</TableHeadCell>
              <TableHeadCell>{t('locationGroups.description')}</TableHeadCell>
              <TableHeadCell>{t('locationGroups.locations')}</TableHeadCell>
              <TableHeadCell>{t('locationGroups.updated')}</TableHeadCell>
              <TableHeadCell align="right">{t('common.actions')}</TableHeadCell>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <TableRow key={group.id}>
                <TableCell label={t('locationGroups.name')} className="font-medium text-slate-900">{group.name}</TableCell>
                <TableCell label={t('locationGroups.description')} className="max-w-[420px] text-slate-600">{group.description || t('locationGroups.defaultDescription')}</TableCell>
                <TableCell label={t('locationGroups.locations')} className="text-slate-600">{group.locations?.length ?? 0}</TableCell>
                <TableCell label={t('locationGroups.updated')} className="text-slate-600">{formatDeviceDate(group.updated_at)}</TableCell>
                <TableCell label={t('common.actions')} align="right">
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <button onClick={() => startEdit(group)} className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"><Edit3 className="mr-2 h-4 w-4" />{t('common.edit')}</button>
                    <button onClick={() => void deleteGroup(group)} className="inline-flex items-center rounded-lg border border-red-100 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"><Trash2 className="mr-2 h-4 w-4" />{t('common.delete')}</button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && groups.length === 0 ? <EmptyTableRow colSpan={5}>{t('locationGroups.empty')}</EmptyTableRow> : null}
            {loading ? <EmptyTableRow colSpan={5}>{t('locationGroups.loadingList')}</EmptyTableRow> : null}
          </tbody>
        </DataTable>
      </TableShell>
    </SectionCard>
  );
}
