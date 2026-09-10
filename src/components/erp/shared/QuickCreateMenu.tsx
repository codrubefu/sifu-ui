import { BadgeEuro, Bell, CreditCard, FileText, Users, type LucideIcon } from 'lucide-react';
import { SectionCard } from '../../primitives';
import type { FormType } from '../../../types/erp';
import type { QuickCreateMenuProps } from './types';
import { useAuth } from '../../../context/useAuth';
import { useTranslation } from 'react-i18next';

type QuickCreateAction = { key: FormType; label: string; icon: LucideIcon; rights?: string[] };

export function QuickCreateMenu({ onNavigate }: QuickCreateMenuProps) {
  const { hasAnyRight } = useAuth();
  const { t } = useTranslation();
  const allActions = [
    { key: 'member', label: t('quick.member'), icon: Users, rights: ['users.manage'] },
    { key: 'service', label: t('quick.service'), icon: BadgeEuro, rights: ['services.create', 'services.manage'] },
    { key: 'article', label: t('quick.article'), icon: Bell, rights: ['articles.create', 'articles.manage'] },
    { key: 'payment', label: t('quick.payment'), icon: CreditCard },
  ] satisfies QuickCreateAction[];
  const actions = allActions.filter((item) => !item.rights || hasAnyRight(item.rights));

  return (
    <SectionCard title={t('quick.title')} action={<FileText className="h-5 w-5 text-indigo-600" />}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {actions.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.key} onClick={() => onNavigate(item.key)} className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-200 hover:bg-slate-50">
              <div className="inline-flex rounded-lg bg-indigo-50 p-2.5 text-indigo-700"><Icon className="h-5 w-5" /></div>
              <p className="mt-4 text-base font-semibold text-slate-900">{item.label}</p>
              <p className="mt-1 text-sm text-slate-500">{t('quick.description')}</p>
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}
