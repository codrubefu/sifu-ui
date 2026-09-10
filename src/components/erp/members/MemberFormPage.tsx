import React from 'react';
import { Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input, SectionCard, Select, StatusBadge, Textarea } from '../../primitives';
import { PageShell } from '../shared/PageShell';
import type { MemberFormPageProps } from '../shared/types';

function MemberFormPage({ mode, data, branchOptions, serviceOptions, onChange, onBack, onSave, onSaveAndClose }: MemberFormPageProps) {
  const { t } = useTranslation();

  return (
    <PageShell title={mode === 'edit' ? t('members.edit') : t('members.add')} subtitle={t('members.formSubtitle')} backLabel={t('members.backToList')} onBack={onBack}>
      <SectionCard title={t('members.details')} action={<StatusBadge status={data.status} />}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input label={t('members.id')} value={data.id} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('id', e.target.value)} placeholder="MBR-006" />
          <Select label={t('common.status')} value={data.status} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange('status', e.target.value)}>{['Activ', 'Expirat', 'Suspendat', 'Rezervat'].map((item) => <option key={item}>{item}</option>)}</Select>
          <Input label={t('members.fullName')} value={data.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('name', e.target.value)} placeholder={t('members.namePlaceholder')} />
          <Input label={t('members.phone')} value={data.phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('phone', e.target.value)} placeholder="+40 7xx xxx xxx" />
          <Input label={t('members.email')} value={data.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('email', e.target.value)} placeholder="email@exemplu.ro" />
          <Select label={t('members.branch')} value={data.branch} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange('branch', e.target.value)}>
            <option value="">{t('members.selectBranch')}</option>
            {branchOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </Select>
          <Select label={t('members.service')} value={data.service} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange('service', e.target.value)}>
            <option value="">{t('members.selectService')}</option>
            {serviceOptions.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
          </Select>
          <div className="md:col-span-2"><Input label={t('members.address')} value={data.address} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('address', e.target.value)} placeholder={t('members.addressPlaceholder')} /></div>
          <div className="md:col-span-2"><Textarea label={t('members.notes')} value={data.notes} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange('notes', e.target.value)} placeholder={t('members.notesPlaceholder')} /></div>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button onClick={onBack} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm">{t('common.cancel')}</button>
          <button onClick={onSave} className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"><Save className="h-4 w-4" />{t('members.save')}</button>
          <button onClick={onSaveAndClose ?? onSave} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"><Save className="h-4 w-4" />{t('common.saveAndClose')}</button>
        </div>
      </SectionCard>
    </PageShell>
  );
}

export { MemberFormPage };
export default MemberFormPage;
