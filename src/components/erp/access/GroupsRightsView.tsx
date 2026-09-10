import { Edit3, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, SectionCard, SuccessMessage } from '../../primitives';
import { erpApiService, type ApiGroup, type ApiRight, type ApiUser } from '../../../services/ErpApiService';
import { PageShell } from '../shared/PageShell';

type ApiRecord = ApiGroup & { id: number };
type FieldKind = 'text' | 'textarea' | 'ids';

type FieldConfig = {
  name: string;
  labelKey: string;
  kind?: FieldKind;
  required?: boolean;
  placeholder?: string;
};

type ResourceConfig = {
  labelKey: string;
  titleKey: string;
  searchPlaceholderKey: string;
  fields: FieldConfig[];
  columns: Array<{ key: string; labelKey: string; render?: (item: ApiRecord, users: ApiUser[]) => string }>;
};

type FormState = Record<string, string | boolean>;

function userName(user: ApiUser) {
  return `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email;
}

function groupUsers(group: ApiRecord, users: ApiUser[]) {
  const names = users
    .filter((user) => user.groups?.some((userGroup) => userGroup.id === group.id))
    .map(userName);

  return names.length ? names.join(', ') : '-';
}

function relationLabels(items?: Array<{ id?: number; label?: string; name?: string }>) {
  if (!items?.length) return '-';
  return items.map((item) => item.label || item.name || `#${item.id}`).join(', ');
}

function relationIds(items?: Array<{ id?: number }>) {
  return items?.map((item) => item.id).filter(Boolean).join(', ') ?? '';
}

function selectedIds(value: string | boolean) {
  return String(value ?? '')
    .split(',')
    .map((part) => Number(part.trim()))
    .filter(Boolean)
    .map(String);
}

function toggleSelectedId(value: string | boolean, id: number, checked: boolean) {
  const ids = new Set(selectedIds(value));
  const normalizedId = String(id);

  if (checked) {
    ids.add(normalizedId);
  } else {
    ids.delete(normalizedId);
  }

  return Array.from(ids).join(', ');
}

function normalizeRightGroup(rawGroup: string) {
  if (rawGroup.endsWith('ies')) return `${rawGroup.slice(0, -3)}y`;
  if (rawGroup.endsWith('ses')) return rawGroup.slice(0, -2);
  if (rawGroup.endsWith('s') && rawGroup.length > 1) return rawGroup.slice(0, -1);
  return rawGroup;
}

function formatRightGroupLabel(rawGroup: string) {
  const normalizedGroup = normalizeRightGroup(rawGroup)
    .replace(/[_-]+/g, ' ')
    .trim();

  if (!normalizedGroup) return 'Other';

  return normalizedGroup.charAt(0).toUpperCase() + normalizedGroup.slice(1);
}

function groupRights(rights: ApiRight[]) {
  const groups = new Map<string, ApiRight[]>();

  rights.forEach((right) => {
    const rawGroup = right.name.split('.')[0] || 'other';
    const groupKey = normalizeRightGroup(rawGroup);
    const currentGroup = groups.get(groupKey) ?? [];
    currentGroup.push(right);
    groups.set(groupKey, currentGroup);
  });

  return Array.from(groups.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([groupKey, items]) => ({
      key: groupKey,
      label: formatRightGroupLabel(groupKey),
      items: [...items].sort((left, right) => left.name.localeCompare(right.name)),
    }));
}

function emptyForm(config: ResourceConfig): FormState {
  return config.fields.reduce<FormState>((acc, field) => {
    acc[field.name] = '';
    return acc;
  }, {});
}

function valueFromItem(item: ApiRecord, field: FieldConfig) {
  if (field.name === 'right_ids' && 'rights' in item) return relationIds(item.rights);
  const raw = (item as unknown as Record<string, unknown>)[field.name];
  if (Array.isArray(raw)) return raw.map((entry) => Number((entry as { id?: number }).id)).filter(Boolean).join(', ');
  return raw == null ? '' : String(raw);
}

function itemToForm(config: ResourceConfig, item: ApiRecord): FormState {
  return config.fields.reduce<FormState>((acc, field) => {
    acc[field.name] = valueFromItem(item, field);
    return acc;
  }, emptyForm(config));
}

function serializeForm(config: ResourceConfig, form: FormState) {
  return config.fields.reduce<Record<string, unknown>>((acc, field) => {
    const value = form[field.name];
    if (field.kind === 'ids') {
      acc[field.name] = String(value ?? '')
        .split(',')
        .map((part) => Number(part.trim()))
        .filter(Boolean);
      return acc;
    }
    if (value !== '' && value !== undefined) acc[field.name] = value;
    return acc;
  }, {});
}

function readValue(item: ApiRecord, key: string) {
  const value = (item as unknown as Record<string, unknown>)[key];
  if (value == null || value === '') return '-';
  return String(value);
}

const config: ResourceConfig = {
  labelKey: 'access.groups',
  titleKey: 'access.groups',
  searchPlaceholderKey: 'access.searchGroups',
  fields: [
    { name: 'name', labelKey: 'access.code', required: true },
    { name: 'label', labelKey: 'access.label', required: true },
    { name: 'description', labelKey: 'access.description', kind: 'textarea' },
    { name: 'right_ids', labelKey: 'access.rights', kind: 'ids' },
  ],
  columns: [
    { key: 'name', labelKey: 'access.code' },
    { key: 'label', labelKey: 'access.label' },
    { key: 'description', labelKey: 'access.description' },
    { key: 'rights', labelKey: 'access.rights', render: (item) => relationLabels(item.rights) },
    { key: 'users', labelKey: 'access.users', render: groupUsers },
  ],
};

export function GroupsRightsView() {
  const { t } = useTranslation();
  const [items, setItems] = useState<ApiRecord[]>([]);
  const [rights, setRights] = useState<ApiRight[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState<ApiRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => emptyForm(config));

  const loadUsers = useCallback(async () => {
    try {
      const data = await erpApiService.list<ApiUser>('users', { per_page: 100 });
      setUsers(data);
    } catch {
      setUsers([]);
    }
  }, []);

  const loadRights = useCallback(async () => {
    try {
      const data = await erpApiService.list<ApiRight>('rights', { per_page: 100 });
      setRights(data);
    } catch {
      setRights([]);
    }
  }, []);

  const loadItems = useCallback(async (currentSearch: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await erpApiService.list<ApiRecord>('groups', { search: currentSearch, per_page: 50 });
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('access.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadUsers();
    void loadRights();
  }, [loadRights, loadUsers]);

  useEffect(() => {
    setEditing(null);
    setFormOpen(false);
    setSearch('');
    setForm(emptyForm(config));
    void loadItems('');
  }, [loadItems]);

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm(config));
    setSuccess('');
    setFormOpen(true);
  };

  const startEdit = (item: ApiRecord) => {
    setEditing(item);
    setForm(itemToForm(config, item));
    setSuccess('');
    setFormOpen(true);
  };

  const closeForm = () => {
    setEditing(null);
    setForm(emptyForm(config));
    setSuccess('');
    setFormOpen(false);
  };

  const save = async (closeAfterSave = false) => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = serializeForm(config, form);
      let savedItem: ApiRecord;
      if (editing) {
        savedItem = await erpApiService.update<ApiRecord>('groups', editing.id, payload);
      } else {
        savedItem = await erpApiService.create<ApiRecord>('groups', payload);
      }
      setEditing(savedItem);
      setForm(itemToForm(config, savedItem));
      setSuccess(t('common.saved'));
      await loadItems(search);
      await loadUsers();
      await loadRights();
      if (closeAfterSave) closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('access.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: ApiRecord) => {
    if (!window.confirm(t('access.deleteConfirm', { id: item.id }))) return;
    setError('');
    try {
      await erpApiService.remove('groups', item.id);
      await loadItems(search);
      await loadUsers();
      await loadRights();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('access.deleteError'));
    }
  };

  if (formOpen) {
    return (
      <PageShell
        title={editing ? t('access.editResource', { resource: t(config.labelKey).toLowerCase() }) : t('access.addResource', { resource: t(config.labelKey).toLowerCase() })}
        subtitle={t('access.formSubtitle')}
        backLabel={t('access.backToResource', { resource: t(config.titleKey).toLowerCase() })}
        onBack={closeForm}
      >
        {error ? <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
        {success ? <SuccessMessage fixed>{success}</SuccessMessage> : null}
        <SectionCard
          title={editing ? t('access.editCardTitle', { id: editing.id }) : t('access.addResource', { resource: t(config.labelKey).toLowerCase() })}
          action={
            <button onClick={closeForm} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
              <X className="h-4 w-4" />{t('common.close')}
            </button>
          }
        >
          <div className="space-y-4">
            {config.fields.map((field) => {
              const value = form[field.name];
              if (field.kind === 'textarea') {
                return (
                  <label key={field.name} className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">{t(field.labelKey)}</span>
                    <textarea
                      value={String(value ?? '')}
                      onChange={(event) => setForm((prev) => ({ ...prev, [field.name]: event.target.value }))}
                      className="min-h-24 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                    />
                  </label>
                );
              }
              if (field.name === 'right_ids') {
                const selectedRightIds = new Set(selectedIds(value));
                const groupedRights = groupRights(rights);
                return (
                  <div key={field.name} className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">{t(field.labelKey)}</span>
                    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
                      {groupedRights.map((group) => (
                        <section key={group.key} className="space-y-2">
                          <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{group.label}</h4>
                          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                            {group.items.map((right) => {
                              const label = right.label || right.name;
                              const isChecked = selectedRightIds.has(String(right.id));

                              return (
                                <label key={right.id} className="flex items-start gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50/50">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(event) => {
                                      const rightIds = toggleSelectedId(value, right.id, event.target.checked);
                                      setForm((prev) => ({ ...prev, [field.name]: rightIds }));
                                    }}
                                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                                  />
                                  <span className="min-w-0">
                                    <span className="block font-medium text-slate-900">{label}</span>
                                    {right.name && right.label && right.name !== right.label ? <span className="block text-xs text-slate-500">{right.name}</span> : null}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </section>
                      ))}
                    </div>
                  </div>
                );
              }
              return (
                <Input
                  key={field.name}
                  label={t(field.labelKey)}
                  required={field.required}
                  value={String(value ?? '')}
                  placeholder={field.placeholder}
                  onChange={(event) => setForm((prev) => ({ ...prev, [field.name]: event.target.value }))}
                />
              );
            })}
            <div className="flex flex-wrap justify-end gap-2">
              <button onClick={closeForm} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">{t('common.cancel')}</button>
              <button onClick={() => void save()} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-100 disabled:cursor-not-allowed disabled:opacity-60">
                <Save className="h-4 w-4" /> {saving ? t('common.saving') : t('common.save')}
              </button>
              <button onClick={() => void save(true)} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                <Save className="h-4 w-4" /> {saving ? t('common.saving') : t('common.saveAndClose')}
              </button>
            </div>
          </div>
        </SectionCard>
      </PageShell>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title={t(config.titleKey)}
        action={
          <div className="flex items-center gap-2">
            <button onClick={() => loadItems(search)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
              <RefreshCw className="h-4 w-4" /> {t('common.refresh')}
            </button>
            <button onClick={startCreate} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
              <Plus className="h-4 w-4" /> {t('access.new')}
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-500">{t('access.formSubtitle')}</p>
      </SectionCard>

      <SectionCard
        title={t(config.titleKey)}
        action={
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void loadItems(search);
              }}
              placeholder={t(config.searchPlaceholderKey)}
              className="w-56 rounded-lg border border-slate-200 px-4 py-2 text-sm outline-none focus:border-indigo-400"
            />
            <button onClick={() => loadItems(search)} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{t('common.search')}</button>
          </div>
        }
      >
          {error ? <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
              <thead>
                <tr className="text-xs uppercase text-slate-500">
                  <th className="px-3 py-3">ID</th>
                  {config.columns.map((column) => <th key={column.key} className="px-3 py-3">{t(column.labelKey)}</th>)}
                  <th className="px-3 py-3 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-3 py-4 font-semibold text-slate-900">{item.id}</td>
                    {config.columns.map((column) => (
                      <td key={column.key} className="max-w-[320px] px-3 py-4 text-slate-600">{column.render ? column.render(item, users) : readValue(item, column.key)}</td>
                    ))}
                    <td className="px-3 py-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => startEdit(item)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700" title={t('common.edit')}>
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button onClick={() => remove(item)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-600" title={t('common.delete')}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && items.length === 0 ? (
                  <tr>
                    <td colSpan={config.columns.length + 2} className="px-3 py-8 text-center text-slate-500">{t('access.empty')}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {loading ? <p className="mt-4 text-sm text-slate-500">{t('common.loading')}</p> : null}
      </SectionCard>
    </div>
  );
}
