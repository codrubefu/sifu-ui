import { Edit3, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { erpApiService } from '../../../services/ErpApiService';
import { Input, SectionCard, Select, SuccessMessage, Textarea } from '../../primitives';
import { PageShell } from '../shared/PageShell';
import { formatDeviceDate } from '../../../utils/erp/formatters';

type CustomFieldType = 'text' | 'textarea' | 'number' | 'date' | 'datetime' | 'email' | 'phone' | 'select' | 'multi_select' | 'checkbox' | 'boolean' | 'file';

type CustomFieldOption = {
  label: string;
  value: string;
};

type CustomField = {
  id: number;
  entity_type: string;
  name: string;
  slug: string;
  type: CustomFieldType;
  options?: { choices?: CustomFieldOption[] } | null;
  validation_rules?: string[] | null;
  is_required?: boolean;
  sort_order?: number;
  updated_at?: string | null;
};

type CustomFieldForm = {
  entity_type: string;
  name: string;
  slug: string;
  type: CustomFieldType;
  choices: string;
  validation_rules: string;
  is_required: boolean;
  sort_order: string;
};

const fieldTypes: CustomFieldType[] = ['text', 'textarea', 'number', 'date', 'datetime', 'email', 'phone', 'select', 'multi_select', 'checkbox', 'boolean', 'file'];
const choiceTypes: CustomFieldType[] = ['select', 'multi_select', 'checkbox'];

const emptyForm: CustomFieldForm = {
  entity_type: 'users',
  name: '',
  slug: '',
  type: 'text',
  choices: '',
  validation_rules: '',
  is_required: false,
  sort_order: '0',
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseChoices(value: string): CustomFieldOption[] {
  return parseLines(value).map((line) => {
    const [rawLabel, ...rawValue] = line.split(':');
    const label = rawLabel.trim();
    const choiceValue = rawValue.join(':').trim() || slugify(label);
    return { label, value: choiceValue };
  });
}

function choicesToText(choices?: CustomFieldOption[]) {
  return choices?.map((choice) => `${choice.label}:${choice.value}`).join('\n') ?? '';
}

function formFromField(field: CustomField): CustomFieldForm {
  return {
    entity_type: field.entity_type || 'users',
    name: field.name || '',
    slug: field.slug || '',
    type: field.type || 'text',
    choices: choicesToText(field.options?.choices),
    validation_rules: field.validation_rules?.join('\n') ?? '',
    is_required: Boolean(field.is_required),
    sort_order: String(field.sort_order ?? 0),
  };
}

function buildPayload(form: CustomFieldForm) {
  const options = choiceTypes.includes(form.type) ? { choices: parseChoices(form.choices) } : null;
  return {
    entity_type: form.entity_type || 'users',
    name: form.name,
    slug: form.slug || slugify(form.name),
    type: form.type,
    options,
    validation_rules: parseLines(form.validation_rules),
    is_required: form.is_required,
    sort_order: Number(form.sort_order) || 0,
  };
}

export function CustomFieldsView() {
  const { t } = useTranslation();
  const [fields, setFields] = useState<CustomField[]>([]);
  const [entityType, setEntityType] = useState('users');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState<CustomField | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CustomFieldForm>(emptyForm);

  const loadFields = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await erpApiService.list<CustomField>('custom-fields', { entity_type: entityType });
      setFields(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('customFields.loadError'));
    } finally {
      setLoading(false);
    }
  }, [entityType, t]);

  useEffect(() => {
    void loadFields();
  }, [loadFields]);

  const sortedFields = useMemo(() => [...fields].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name)), [fields]);

  const startCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, entity_type: entityType || 'users' });
    setSuccess('');
    setFormOpen(true);
  };

  const startEdit = (field: CustomField) => {
    setEditing(field);
    setForm(formFromField(field));
    setSuccess('');
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setSuccess('');
  };

  const saveField = async (closeAfterSave = false) => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = buildPayload(form);
      let savedField: CustomField;
      if (editing) {
        savedField = await erpApiService.update<CustomField>('custom-fields', editing.id, payload);
      } else {
        savedField = await erpApiService.create<CustomField>('custom-fields', payload);
      }
      setEntityType(payload.entity_type);
      setEditing(savedField);
      setForm(formFromField(savedField));
      setSuccess(t('common.saved'));
      if (payload.entity_type === entityType) {
        await loadFields();
      }
      if (closeAfterSave) closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('customFields.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const deleteField = async (field: CustomField) => {
    if (!window.confirm(t('customFields.deleteConfirm', { name: field.name }))) return;
    setError('');
    try {
      await erpApiService.remove('custom-fields', field.id);
      await loadFields();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('customFields.deleteError'));
    }
  };

  if (formOpen) {
    return (
      <PageShell title={editing ? t('customFields.edit') : t('customFields.add')} subtitle={t('customFields.formSubtitle')} backLabel={t('customFields.backToList')} onBack={closeForm}>
        {error ? <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
        {success ? <SuccessMessage fixed>{success}</SuccessMessage> : null}
        <SectionCard
          title={editing ? t('customFields.editCardTitle', { id: editing.id }) : t('customFields.add')}
          action={<button onClick={closeForm} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"><X className="h-4 w-4" />{t('common.close')}</button>}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label={t('customFields.entityType')} value={form.entity_type} onChange={(event) => setForm((prev) => ({ ...prev, entity_type: event.target.value }))} placeholder="users" />
            <Input label={t('customFields.name')} value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value, slug: prev.slug || slugify(event.target.value) }))} placeholder="Preferred contact time" />
            <Input label={t('customFields.slug')} value={form.slug} onChange={(event) => setForm((prev) => ({ ...prev, slug: slugify(event.target.value) }))} placeholder="preferred_contact_time" />
            <Select label={t('customFields.type')} value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as CustomFieldType }))}>
              {fieldTypes.map((type) => <option key={type} value={type}>{t(`customFields.types.${type}`)}</option>)}
            </Select>
            <Input label={t('customFields.sortOrder')} type="number" min="0" value={form.sort_order} onChange={(event) => setForm((prev) => ({ ...prev, sort_order: event.target.value }))} />
            <label className="flex items-end gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={form.is_required} onChange={(event) => setForm((prev) => ({ ...prev, is_required: event.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              {t('customFields.required')}
            </label>
            {choiceTypes.includes(form.type) ? (
              <div className="md:col-span-2">
                <Textarea label={t('customFields.choices')} value={form.choices} onChange={(event) => setForm((prev) => ({ ...prev, choices: event.target.value }))} placeholder="Website:website&#10;Referral:referral" rows={5} />
                <p className="mt-2 text-xs text-slate-500">{t('customFields.choicesHint')}</p>
              </div>
            ) : null}
            <div className="md:col-span-2">
              <Textarea label={t('customFields.validationRules')} value={form.validation_rules} onChange={(event) => setForm((prev) => ({ ...prev, validation_rules: event.target.value }))} placeholder="max:255" rows={4} />
              <p className="mt-2 text-xs text-slate-500">{t('customFields.validationHint')}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button onClick={closeForm} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">{t('common.cancel')}</button>
            <button onClick={() => void saveField()} disabled={saving || !form.name || !form.slug} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
              <Save className="mr-2 inline h-4 w-4" />{saving ? t('common.saving') : t('customFields.save')}
            </button>
            <button onClick={() => void saveField(true)} disabled={saving || !form.name || !form.slug} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
              <Save className="mr-2 inline h-4 w-4" />{saving ? t('common.saving') : t('common.saveAndClose')}
            </button>
          </div>
        </SectionCard>
      </PageShell>
    );
  }

  return (
    <SectionCard
      title={t('customFields.title')}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => void loadFields()} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"><RefreshCw className="mr-2 inline h-4 w-4" />{t('common.refresh')}</button>
          <button onClick={startCreate} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"><Plus className="mr-2 inline h-4 w-4" />{t('customFields.add')}</button>
        </div>
      }
    >
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
        <Input label={t('customFields.entityType')} value={entityType} onChange={(event) => setEntityType(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void loadFields(); }} placeholder="users" />
        <div className="flex items-end">
          <button onClick={() => void loadFields()} className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white">{t('customFields.loadEntity')}</button>
        </div>
      </div>

      {error ? <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
      <div className="mb-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">{t('customFields.showingCount', { count: sortedFields.length, entity: entityType || 'users' })}</div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="pb-3 font-semibold">{t('customFields.name')}</th>
              <th className="pb-3 font-semibold">{t('customFields.entityType')}</th>
              <th className="pb-3 font-semibold">{t('customFields.type')}</th>
              <th className="pb-3 font-semibold">{t('customFields.required')}</th>
              <th className="pb-3 font-semibold">{t('customFields.sortOrder')}</th>
              <th className="pb-3 font-semibold">{t('customFields.updated')}</th>
              <th className="pb-3 font-semibold text-right">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedFields.length > 0 ? sortedFields.map((field) => (
              <tr key={field.id} className="border-b border-slate-100 align-top">
                <td className="max-w-[320px] py-4">
                  <p className="font-semibold text-slate-900">{field.name}</p>
                  <p className="mt-1 font-mono text-xs text-slate-500">{field.slug}</p>
                  {field.options?.choices?.length ? <p className="mt-2 text-xs text-slate-500">{field.options.choices.length} {t('customFields.options')}</p> : null}
                </td>
                <td className="py-4 text-slate-600">{field.entity_type || '-'}</td>
                <td className="py-4 text-slate-600">
                  <p>{t(`customFields.types.${field.type}`)}</p>
                  <p className="mt-1 text-xs text-slate-500">#{field.id}</p>
                </td>
                <td className="py-4 text-slate-600">{field.is_required ? t('common.yes') : t('common.no')}</td>
                <td className="py-4 text-slate-600">{field.sort_order ?? 0}</td>
                <td className="py-4 text-slate-600">{formatDeviceDate(field.updated_at)}</td>
                <td className="py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => startEdit(field)} className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Edit3 className="mr-2 h-4 w-4" />{t('common.edit')}</button>
                    <button onClick={() => void deleteField(field)} className="inline-flex items-center rounded-lg border border-red-100 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"><Trash2 className="mr-2 h-4 w-4" />{t('common.delete')}</button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-slate-500">{loading ? t('customFields.loadingList') : t('customFields.empty')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
