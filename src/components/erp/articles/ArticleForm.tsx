import { Save } from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Input, SectionCard, Select, SuccessMessage } from '../../primitives';
import { articlesService, type Article, type ArticleAudienceSegment, type ArticlePayload, type ArticleRelation, type ArticleStatus } from '../../../services/articlesService';

const emptyForm: ArticlePayload = { title: '', description: '', publish_at: '', expires_at: '', priority: 0, status: 'draft', audience_segment: 'all_users', segment_id: null, groups: [], locations: [] };
const statuses: ArticleStatus[] = ['draft', 'scheduled', 'published', 'expired'];
const segments: ArticleAudienceSegment[] = ['all_users', 'active_subscribers', 'expired_users', 'groups', 'locations'];

type ArticleFormProps = {
  mode: 'create' | 'edit';
  initialData?: Article | null;
  onSubmit: (form: ArticlePayload, options?: { closeAfterSave?: boolean }) => void;
  submitting: boolean;
  serverError?: string;
  successMessage?: string;
};

function fieldIds(items: Article['groups'] | Article['locations']): number[] {
  return (items ?? []).map((item) => Number(typeof item === 'object' ? item.id : item)).filter(Boolean);
}

function selectedOptions(event: React.ChangeEvent<HTMLSelectElement>) {
  return Array.from(event.target.selectedOptions).map((option) => Number(option.value));
}

function labelFor(item: ArticleRelation) {
  return item.label || item.name || item.title || `#${item.id}`;
}

function toDateTimeLocal(value?: string | null) {
  return value ? value.replace(' ', 'T').slice(0, 16) : '';
}

export default function ArticleForm({ mode, initialData, onSubmit, submitting, serverError, successMessage }: ArticleFormProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<ArticlePayload>(emptyForm);
  const [groups, setGroups] = useState<ArticleRelation[]>([]);
  const [locations, setLocations] = useState<ArticleRelation[]>([]);
  const [savedSegments, setSavedSegments] = useState<ArticleRelation[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm({
      title: initialData?.title ?? '',
      description: initialData?.description ?? '',
      publish_at: toDateTimeLocal(initialData?.publish_at),
      expires_at: toDateTimeLocal(initialData?.expires_at),
      priority: initialData?.priority ?? 0,
      status: initialData?.status ?? 'draft',
      audience_segment: initialData?.audience_segment ?? 'all_users',
      segment_id: initialData?.segment_id ?? null,
      groups: fieldIds(initialData?.groups),
      locations: fieldIds(initialData?.locations),
    });
  }, [initialData]);

  useEffect(() => {
    let disposed = false;
    async function loadOptions() {
      setLoadingOptions(true);
      setOptionsError('');
      try {
        const [nextGroups, nextLocations, nextSegments] = await Promise.all([articlesService.groups(), articlesService.locations(), articlesService.segments().catch(() => [])]);
        if (disposed) return;
        setGroups(nextGroups);
        setLocations(nextLocations);
        setSavedSegments(nextSegments);
      } catch (error) {
        if (!disposed) setOptionsError(error instanceof Error ? error.message : t('articles.optionsError'));
      } finally {
        if (!disposed) setLoadingOptions(false);
      }
    }
    void loadOptions();
    return () => {
      disposed = true;
    };
  }, [t]);

  const title = useMemo(() => (mode === 'create' ? t('articles.add') : t('articles.edit')), [mode, t]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.title.trim()) nextErrors.title = t('articles.titleRequired');
    if (!form.description.trim()) nextErrors.description = t('articles.descriptionRequired');
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;
    onSubmit(form);
  };

  const submitAndClose = () => {
    if (!validate()) return;
    onSubmit(form, { closeAfterSave: true });
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <SectionCard title={title} action={<Link to="/erp/articles" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">{t('common.back')}</Link>}>
        {serverError ? <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{serverError}</p> : null}
        {successMessage ? <SuccessMessage fixed className="rounded-lg border-none font-semibold">{successMessage}</SuccessMessage> : null}
        {optionsError ? <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{optionsError}</p> : null}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">{t('articles.titleField')}</span>
            <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
            {errors.title ? <span className="mt-1 block text-xs font-medium text-red-600">{errors.title}</span> : null}
          </label>
          <Select label="status" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as ArticleStatus }))}>
            {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </Select>
          <Select label="audience_segment" value={form.audience_segment} onChange={(event) => setForm((prev) => ({ ...prev, audience_segment: event.target.value as ArticleAudienceSegment }))}>
            {segments.map((segment) => <option key={segment} value={segment}>{segment}</option>)}
          </Select>
          <Select label="segment_id" value={form.segment_id ?? ''} onChange={(event) => setForm((prev) => ({ ...prev, segment_id: Number(event.target.value) || null }))}>
            <option value="">Fara segment salvat</option>
            {savedSegments.map((segment) => <option key={segment.id} value={segment.id}>{labelFor(segment)}</option>)}
          </Select>
          <Input label="priority" type="number" min={0} value={String(form.priority ?? 0)} onChange={(event) => setForm((prev) => ({ ...prev, priority: Number(event.target.value) }))} />
          <Input label="publish_at" type="datetime-local" value={form.publish_at ?? ''} onChange={(event) => setForm((prev) => ({ ...prev, publish_at: event.target.value }))} />
          <Input label="expires_at" type="datetime-local" value={form.expires_at ?? ''} onChange={(event) => setForm((prev) => ({ ...prev, expires_at: event.target.value }))} />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">{t('articles.groups')}</span>
            <select multiple value={form.groups.map(String)} disabled={loadingOptions} onChange={(event) => setForm((prev) => ({ ...prev, groups: selectedOptions(event) }))} className="min-h-32 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100">
              {groups.map((group) => <option key={group.id} value={group.id}>{labelFor(group)}</option>)}
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-700">{t('articles.description')}</span>
            <textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} rows={5} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
            {errors.description ? <span className="mt-1 block text-xs font-medium text-red-600">{errors.description}</span> : null}
          </label>
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-700">{t('articles.locations')}</span>
            <select multiple value={form.locations.map(String)} disabled={loadingOptions} onChange={(event) => setForm((prev) => ({ ...prev, locations: selectedOptions(event) }))} className="min-h-32 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100">
              {locations.map((location) => <option key={location.id} value={location.id}>{labelFor(location)}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Link to="/erp/articles" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">{t('common.cancel')}</Link>
          <button disabled={submitting} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            <Save className="h-4 w-4" />
            {t('common.save')}
          </button>
          <button type="button" onClick={submitAndClose} disabled={submitting} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            <Save className="h-4 w-4" />
            {t('common.saveAndClose')}
          </button>
        </div>
      </SectionCard>
    </form>
  );
}
