import {
  BadgeEuro,
  Award,
  Bell,
  Building2,
  ChevronRight,
  CreditCard,
  CalendarDays,
  FileText,
  Info,
  KeyRound,
  ScanLine,
  Megaphone,
  FileBarChart2,
  FolderTree,
  LayoutDashboard,
  Mail,
  MessageSquare,
  ShieldCheck,
  SlidersHorizontal,
  UserCheck,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { getAuthenticatedUserChildren, type AuthenticatedUserChild } from '../../api/authApi';
import { useAuth } from '../../context/useAuth';
import { useTranslation } from 'react-i18next';
import type { SectionId } from '../../types/erp';

type SidebarProps = {
  organizationName: string;
  current: SectionId;
  setCurrent: (id: SectionId) => void;
  profileChildId: number | null;
  setProfileChildId: (id: number | null) => void;
  open: boolean;
  onClose: () => void;
};

type ProfileSubItem = {
  id: SectionId;
  labelKey: string;
  icon: LucideIcon;
};

const profileSelfSubItems: readonly ProfileSubItem[] = [
  { id: 'profile-info', labelKey: 'profile.info', icon: Info },
  { id: 'profile-security', labelKey: 'profile.security', icon: KeyRound },
  { id: 'profile-privacy', labelKey: 'profile.privacy', icon: ShieldCheck },
  { id: 'profile-announcements', labelKey: 'profile.announcements', icon: Bell },
  { id: 'profile-events', labelKey: 'profile.events', icon: CalendarDays },
  { id: 'profile-services', labelKey: 'profile.services', icon: BadgeEuro },
  { id: 'profile-code', labelKey: 'profile.codeTitle', icon: ScanLine },
  { id: 'profile-grades', labelKey: 'users.grades', icon: Award },
  { id: 'profile-documents', labelKey: 'userDocuments.documents', icon: FileText },
];

const profileChildSubItems: readonly ProfileSubItem[] = profileSelfSubItems.filter((item) => item.id !== 'profile-security');

type NavItem = {
  id: SectionId;
  labelKey: string;
  icon: LucideIcon;
  rights?: string[];
  children?: readonly NavItem[];
};

type NavGroup = {
  id: string;
  labelKey?: string;
  icon?: LucideIcon;
  items: readonly NavItem[];
};

const navGroups: readonly NavGroup[] = [
  {
    id: 'general',
    items: [{ id: 'dashboard', labelKey: 'menu.dashboard', icon: LayoutDashboard }],
  },
  {
    id: 'organization',
    labelKey: 'menu.organization',
    icon: Building2,
    items: [
      { id: 'branches', labelKey: 'menu.branches', icon: Building2, rights: ['locations.view', 'locations.manage'] },
      { id: 'location-groups', labelKey: 'menu.locationGroups', icon: FolderTree, rights: ['location_groups.view', 'location_groups.manage'] },
      { id: 'admins', labelKey: 'menu.admins', icon: UserCheck, rights: ['users.view', 'users.manage'] },
      { id: 'access', labelKey: 'menu.access', icon: ShieldCheck, rights: ['groups.view', 'groups.manage'] },
      { id: 'custom-fields', labelKey: 'menu.customFields', icon: SlidersHorizontal ,rights: ['custom-fields.view', 'custom-fields.manage'] },
      { id: 'grades', labelKey: 'menu.grades', icon: Award, rights: ['grades.view', 'grades.manage'] },
      { id: 'email-templates', labelKey: 'menu.emailTemplates', icon: Mail, rights: ['email_templates.view', 'email_templates.manage'] },
      { id: 'smtp-settings', labelKey: 'menu.smtpSettings', icon: Mail, rights: ['smtp_settings.view', 'smtp_settings.manage'] },
    ],
  },
  {
    id: 'management',
    items: [
      { id: 'check-in', labelKey: 'menu.checkIn', icon: ScanLine, rights: ['event_participants.manage', 'checkins.manage'] },
      { id: 'members', labelKey: 'menu.users', icon: Users, rights: ['users.view', 'users.manage'] },
      { id: 'services', labelKey: 'menu.services', icon: BadgeEuro, rights: ['services.view', 'services.manage'] },
      {
        id: 'events',
        labelKey: 'menu.events',
        icon: CalendarDays,
        rights: ['events.view', 'events.manage'],
      },
      { id: 'articles', labelKey: 'menu.articles', icon: Bell, rights: ['articles.view', 'articles.manage'] },
      { id: 'campaigns', labelKey: 'menu.campaigns', icon: Megaphone, rights: ['campaigns.view', 'campaigns.manage', 'reports.manage', 'users.manage'] },
      { id: 'sms', labelKey: 'menu.sms', icon: MessageSquare, rights: ['sms.view', 'sms.manage'] },
      { id: 'payments', labelKey: 'menu.payments', icon: CreditCard, rights: ['payments.view', 'payments.manage'] },
      { id: 'reports', labelKey: 'menu.reports', icon: FileBarChart2, rights: ['reports.view', 'reports.manage'] },
    ],
  },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function collectIds(item: NavItem): string[] {
  return [item.id, ...(item.children ?? []).flatMap(collectIds)];
}

function itemContainsCurrent(item: NavItem, current: SectionId) {
  return collectIds(item).includes(current);
}

function groupContainsCurrent(group: NavGroup, current: SectionId) {
  return group.items.some((item) => itemContainsCurrent(item, current));
}

export function Sidebar({ organizationName, current, setCurrent, profileChildId, setProfileChildId, open, onClose }: SidebarProps) {
  const [manualOpen, setManualOpen] = useState<Record<string, boolean>>({});
  const [openProfileRow, setOpenProfileRow] = useState<'self' | number | null>(null);
  const [trackedCurrent, setTrackedCurrent] = useState(current);
  if (trackedCurrent !== current) {
    setTrackedCurrent(current);
    setManualOpen({});
    if (!current.startsWith('profile-')) setOpenProfileRow(null);
  }
  const [children, setChildren] = useState<AuthenticatedUserChild[]>([]);
  const { hasAnyRight, user } = useAuth();
  const { t } = useTranslation();
  const showProfileSection = hasAnyRight(['profile.view']);

  useEffect(() => {
    if (!showProfileSection) return;
    let cancelled = false;
    getAuthenticatedUserChildren()
      .then((list) => {
        if (!cancelled) setChildren(list);
      })
      .catch(() => {
        if (!cancelled) setChildren([]);
      });
    return () => {
      cancelled = true;
    };
  }, [showProfileSection]);

  const selfLabel = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() || t('profile.unknownUser');
  const profileRows: Array<{ id: 'self' | number; label: string }> = [
    { id: 'self', label: selfLabel },
    ...children.map((child) => ({ id: child.id, label: [child.first_name, child.last_name].filter(Boolean).join(' ').trim() || `#${child.id}` })),
  ];

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    document.body.classList.add('mobile-navigation-open');
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.body.classList.remove('mobile-navigation-open');
    };
  }, [open, onClose]);

  const isItemAllowed = (item: NavItem) => !item.rights || hasAnyRight(item.rights);
  const visibleChildrenFor = (item: NavItem): NavItem[] => item.children
    ?.map((child) => ({ ...child, children: visibleChildrenFor(child) }))
    .filter((child) => isItemAllowed(child) || (child.children?.length ?? 0) > 0) ?? [];
  const visibleItemsFor = (items: readonly NavItem[]) => items
    .map((item) => ({ ...item, children: visibleChildrenFor(item) }))
    .filter((item) => isItemAllowed(item) || (item.children?.length ?? 0) > 0);

  const renderItems = (items: readonly NavItem[], level = 0) => items.map((item) => {
    const itemAllowed = isItemAllowed(item);
    const visibleChildren = item.children ?? [];
    const hasChildren = visibleChildren.length > 0;
    const autoOpen = itemContainsCurrent(item, current);
    const isOpen = manualOpen[item.id] ?? autoOpen;
    const Icon = item.icon;
    const active = current === item.id;

    return (
      <div key={item.id} className={cn('space-y-1', level > 0 && 'ml-3 border-l border-slate-200 pl-2')}>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (hasChildren) {
                setManualOpen((prev) => ({ ...prev, [item.id]: !isOpen }));
                return;
              }
              if (itemAllowed) {
                setCurrent(item.id);
                onClose();
              }
            }}
            className={cn(
              'flex min-w-0 flex-1 items-center justify-between rounded-lg px-2.5 py-2.5 text-left text-sm transition-colors duration-150',
              active ? 'nav-active border border-indigo-100 bg-indigo-50 text-indigo-700 shadow-sm' : 'border border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950'
            )}
          >
            <span className="flex min-w-0 items-center gap-2.5 font-medium">
              <span className={cn('rounded-md p-1.5 transition', active ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20' : 'bg-slate-100 text-slate-500')}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="truncate">{t(item.labelKey)}</span>
            </span>
            {!hasChildren ? <ChevronRight className="h-4 w-4 opacity-60" /> : null}
          </button>
          {hasChildren ? (
            <button
              aria-label={t(item.labelKey)}
              onClick={() => setManualOpen((prev) => ({ ...prev, [item.id]: !isOpen }))}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            >
              <ChevronRight className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-90')} />
            </button>
          ) : null}
        </div>
        {hasChildren && isOpen ? <div className="space-y-1">{renderItems(visibleChildren, level + 1)}</div> : null}
      </div>
    );
  });

  return (
    <aside id="primary-navigation" aria-label={t('common.navigation', 'Navigare principala')} className={cn('app-sidebar fixed inset-y-0 left-0 z-30 w-[min(88vw,20rem)] border-r border-slate-200 bg-white px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] shadow-none transition-transform duration-300 ease-out lg:sticky lg:top-0 lg:h-screen lg:w-[17rem] lg:translate-x-0', open ? 'translate-x-0 shadow-2xl shadow-slate-900/10' : '-translate-x-full')}>
      <div className="flex h-full flex-col">
        <div className="sidebar-brand">
          <span className="brand-seal" aria-hidden="true">s</span>
          <span className="brand-wordmark">sifu.</span>
          <button type="button" onClick={onClose} className="ml-auto rounded-lg p-2 lg:hidden" aria-label={t('common.close', 'Închide')}><X className="h-5 w-5" /></button>
        </div>
        <div className="sidebar-organization">
          <span className="organization-symbol"><Building2 size={25} strokeWidth={1.25} /></span>
          <div className="min-w-0"><p className="truncate">{organizationName || 'Sifu'}</p><p className="mt-1 text-xs text-white/65">{t('header.clubSpace', 'Spațiul clubului tău')}</p></div>
        </div>

        <nav className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
          {navGroups.map((group) => {
            const visibleItems = visibleItemsFor(group.items);
            if (visibleItems.length === 0) return null;
            const GroupIcon = group.icon ?? Building2;
            const isGrouped = Boolean(group.labelKey);
            const autoOpenGroup = groupContainsCurrent(group, current);
            const isOpen = manualOpen[group.id] ?? autoOpenGroup;
            const groupLabel = group.labelKey ? t(group.labelKey) : '';

            return (
              <div key={group.id} className="space-y-1">
                {isGrouped ? (
                  <button
                    onClick={() => setManualOpen((prev) => ({ ...prev, [group.id]: !isOpen }))}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[0.6875rem] font-medium normal-case tracking-normal text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="rounded-md bg-slate-100 p-1.5 text-slate-600 ring-1 ring-slate-200">
                        <GroupIcon className="h-4 w-4" />
                      </span>
                      <span className="truncate">{groupLabel}</span>
                    </span>
                    <ChevronRight className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-90')} />
                  </button>
                ) : null}

                {(!isGrouped || isOpen) && (
                  <div className={cn('space-y-1', isGrouped && 'ml-3 border-l border-slate-200 pl-2')}>
                    {renderItems(visibleItems)}
                  </div>
                )}
              </div>
            );
          })}

          {showProfileSection ? (
            <div className="space-y-1 border-t border-slate-100 pt-3">
              {profileRows.map((row) => {
                const isOpen = openProfileRow === row.id;
                const subItems = row.id === 'self' ? profileSelfSubItems : profileChildSubItems;

                return (
                  <div key={row.id} className="space-y-1">
                    <button
                      onClick={() => setOpenProfileRow((currentRow) => (currentRow === row.id ? null : row.id))}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg px-2.5 py-2.5 text-left text-sm transition-colors duration-150',
                        isOpen ? 'border border-indigo-100 bg-indigo-50 text-indigo-700 shadow-sm' : 'border border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2.5 font-medium">
                        <span className={cn('rounded-md p-1.5 transition', isOpen ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20' : 'bg-slate-100 text-slate-500')}>
                          <UserCircle className="h-4 w-4" />
                        </span>
                        <span className="truncate">{row.label}</span>
                      </span>
                      <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', isOpen && 'rotate-90')} />
                    </button>
                    {isOpen ? (
                      <div className="ml-3 space-y-1 border-l border-slate-200 pl-2">
                        {subItems.map((item) => {
                          const Icon = item.icon;
                          const active = current === item.id && (row.id === 'self' ? profileChildId === null : profileChildId === row.id);
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                setProfileChildId(row.id === 'self' ? null : row.id);
                                setCurrent(item.id);
                                onClose();
                              }}
                              className={cn(
                                'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-sm font-medium transition-colors duration-150',
                                active ? 'nav-active border border-indigo-100 bg-indigo-50 text-indigo-700 shadow-sm' : 'border border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                              )}
                            >
                              <span className={cn('rounded-md p-1.5 transition', active ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20' : 'bg-slate-100 text-slate-500')}>
                                <Icon className="h-4 w-4" />
                              </span>
                              <span className="truncate">{t(item.labelKey)}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </nav>
        <div className="sidebar-account">
          <span className="account-avatar">{selfLabel.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
          <div className="min-w-0"><p className="truncate text-sm">{selfLabel}</p><p className="mt-1 text-xs text-white/65">{t('common.administrator')}</p></div>
        </div>
      </div>
    </aside>
  );
}
