import React from 'react';
import { Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input, SectionCard, StatusBadge, Textarea } from '../../primitives';
import { PageShell } from '../shared/PageShell';
import type { ServiceFormPageProps } from '../shared/types';

export function ServiceFormPage({ mode, data, onChange, onBack, onSave, onSaveAndClose }: ServiceFormPageProps) {
  const { t } = useTranslation();

  return (
    <PageShell title={mode === 'edit' ? t('services.edit') : t('services.add')} subtitle={t('services.formSubtitle')} backLabel={t('services.backToList')} onBack={onBack}>
      <SectionCard title={t('services.details')} action={<StatusBadge status={data.is_active ? 'Activ' : 'Inactiv'} />}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input label={t('services.id')} value={data.id} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('id', e.target.value)} placeholder="5" />
          <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={data.is_active} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('is_active', String(e.target.checked))} className="h-4 w-4 accent-indigo-600" />
            {t('common.status')}
          </label>
          <div className="md:col-span-2"><Input label={t('services.name')} value={data.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('name', e.target.value)} placeholder={t('services.namePlaceholder')} /></div>
          <Input label={t('services.duration')} type="number" value={data.duration_days ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('duration_days', e.target.value)} placeholder={t('services.durationPlaceholder')} />
          <Input label={t('services.price')} value={data.price} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('price', e.target.value)} placeholder="1200 RON" />
          <Input label="Moneda" value={data.currency} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('currency', e.target.value)} placeholder="EUR" />
          <Input label="Numar maxim utilizatori" type="number" value={data.max_users ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('max_users', e.target.value)} placeholder="25" />
          <div className="md:col-span-2"><Textarea label={t('services.description')} value={data.description ?? ''} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange('description', e.target.value)} placeholder={t('services.descriptionPlaceholder')} /></div>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button onClick={onBack} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">{t('common.cancel')}</button>
          <button onClick={onSave} className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"><Save className="h-4 w-4" />{t('services.save')}</button>
          <button onClick={onSaveAndClose ?? onSave} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"><Save className="h-4 w-4" />{t('common.saveAndClose')}</button>
        </div>
      </SectionCard>
    </PageShell>
  );
}
