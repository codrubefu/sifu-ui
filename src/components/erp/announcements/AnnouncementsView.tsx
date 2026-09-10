import { Eye, Pencil, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SectionCard, StatusBadge } from '../../primitives';
import type { AnnouncementsViewProps } from '../shared/types';

export function AnnouncementsView({ items, onCreate, onEdit }: AnnouncementsViewProps) {
  const { t } = useTranslation();

  return (
    <SectionCard title={t('announcements.title')} action={<button onClick={onCreate} className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"><Plus className="h-4 w-4" />{t('announcements.new')}</button>}>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-lg font-semibold text-slate-900">{item.title}</h4>
                <p className="mt-1 text-sm text-slate-500">{item.audience}</p>
              </div>
              <StatusBadge status={item.status} />
            </div>
            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{t('announcements.publishAt', { value: item.scheduled })}</div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => onEdit(item)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"><Pencil className="h-4 w-4" />{t('common.edit')}</button>
              <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"><Eye className="h-4 w-4" />{t('common.preview')}</button>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
