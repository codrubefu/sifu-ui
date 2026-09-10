import React from 'react';
import { Eye, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input, SectionCard, Select, StatusBadge, SuccessMessage, Textarea } from '../../primitives';
import { PageShell } from '../shared/PageShell';
import type { AnnouncementFormPageProps } from '../shared/types';

export function AnnouncementFormPage({ mode, data, onChange, onBack, onSave, onSaveAndClose, successMessage }: AnnouncementFormPageProps) {
  const { t } = useTranslation();

  return (
    <PageShell title={mode === 'edit' ? t('announcements.edit') : t('announcements.add')} subtitle={t('announcements.formSubtitle')} backLabel={t('announcements.backToList')} onBack={onBack}>
      <SectionCard title={t('announcements.details')} action={<StatusBadge status={data.status} />}>
        {successMessage ? <SuccessMessage fixed>{successMessage}</SuccessMessage> : null}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input label={t('announcements.id')} value={data.id} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('id', e.target.value)} placeholder="ANN-004" />
          <Select label={t('common.status')} value={data.status} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange('status', e.target.value)}>{['Draft', 'Programat', 'Publicat'].map((item) => <option key={item}>{item}</option>)}</Select>
          <div className="md:col-span-2"><Input label={t('common.title')} value={data.title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('title', e.target.value)} placeholder={t('announcements.titlePlaceholder')} /></div>
          <Input label={t('announcements.audience')} value={data.audience} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('audience', e.target.value)} placeholder={t('announcements.audiencePlaceholder')} />
          <Input label={t('announcements.scheduleDate')} value={data.scheduled} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('scheduled', e.target.value)} placeholder="2026-04-15 10:00" />
          <div className="md:col-span-2"><Textarea label={t('announcements.content')} value={data.content} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange('content', e.target.value)} placeholder={t('announcements.contentPlaceholder')} /></div>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button onClick={onBack} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">{t('common.cancel')}</button>
          <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"><Eye className="mr-2 inline h-4 w-4" />{t('common.preview')}</button>
          <button onClick={onSave} className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"><Save className="h-4 w-4" />{t('announcements.save')}</button>
          <button onClick={onSaveAndClose ?? onSave} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"><Save className="h-4 w-4" />{t('common.saveAndClose')}</button>
        </div>
      </SectionCard>
    </PageShell>
  );
}
