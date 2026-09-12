import { Edit3, Save, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { eventService, type ApiValidationError, type EventCategory, type EventCategoryPayload } from '../../../services/eventService';
import { ButtonLink, SectionCard, Toast } from '../../primitives';
import { invalidateEventCategoriesCache } from './hooks';
import { fieldError } from './helpers';
import { CategoryBadge, DeleteConfirmModal, Pagination, SelectField, StatusBadge, TextField } from './ui';

const emptyCategoryForm: EventCategoryPayload = {
  name: '',
  color: '#2563eb',
  description: '',
  is_active: true,
};

export function EventCategoriesPage() {
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
      setError(err instanceof Error ? err.message : t('events.loadCategoriesError'));
    } finally {
      setLoading(false);
    }
  }, [filters, t]);

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
    if (!form.name.trim()) nextErrors.name = t('events.categoryNameRequired');
    setClientErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setServerErrors(undefined);
    setError('');
    try {
      const payload = { ...form, name: form.name.trim(), color: form.color || null, description: form.description || null };
      if (editing) await eventService.updateCategory(editing.id, payload);
      else await eventService.createCategory(payload);
      invalidateEventCategoriesCache();
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
      invalidateEventCategoriesCache();
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
          <TextField label={t('events.categoryName')} value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} error={clientErrors.name || fieldError(serverErrors, 'name')} />
          <TextField label={t('events.categoryColor')} type="color" value={form.color ?? '#2563eb'} onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))} error={fieldError(serverErrors, 'color')} />
          <TextField label={t('events.description')} value={form.description ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} error={fieldError(serverErrors, 'description')} />
          <label className="mt-7 flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"><input type="checkbox" checked={form.is_active ?? true} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} className="accent-indigo-600" />{t('users.statusActive')}</label>
          <div className="flex gap-2 md:col-span-4">
            <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"><Save className="h-4 w-4" />{saving ? t('common.saving') : editing ? t('events.updateCategory') : t('common.add')}</button>
            {editing ? <button type="button" onClick={resetForm} className="rounded-lg border px-4 py-2 text-sm font-medium">{t('events.cancelCategoryEdit')}</button> : null}
          </div>
        </form>
      </SectionCard>
      <SectionCard title={t('events.categoriesListTitle')}>
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_auto]">
          <TextField label={t('common.search')} value={filters.search} onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))} />
          <SelectField label={t('common.status')} value={filters.is_active} onChange={(e) => setFilters((prev) => ({ ...prev, is_active: e.target.value, page: 1 }))}><option value="">{t('common.all')}</option><option value="1">{t('users.statusActive')}</option><option value="0">{t('users.statusInactive')}</option></SelectField>
          <button onClick={() => void reload()} className="mt-7 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white">{t('common.search')}</button>
        </div>
        {error ? <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead><tr className="border-b text-slate-500"><th className="pb-3">{t('events.category')}</th><th className="pb-3">{t('events.description')}</th><th className="pb-3">{t('events.eventsCount')}</th><th className="pb-3">{t('common.status')}</th><th className="pb-3 text-right">{t('common.actions')}</th></tr></thead>
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
