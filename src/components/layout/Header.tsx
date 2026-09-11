import { LogOut, Menu, Search, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '../LanguageSelector';

type HeaderProps = {
  onToggleSidebar: () => void;
  onLogout: () => void;
  organizationName: string;
};

export function Header({ onToggleSidebar, onLogout, organizationName }: HeaderProps) {
  const { t } = useTranslation();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="app-header sticky top-0 z-20 border-b border-slate-200 bg-white/95 shadow-none backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1540px] items-center justify-between gap-4 px-4 sm:px-5 lg:px-6 xl:px-7">
      <div className="flex min-w-0 items-center gap-2.5">
        <button onClick={onToggleSidebar} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden" aria-label={t('common.navigation', 'Deschide navigarea')} aria-controls="primary-navigation">
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="hidden text-[0.6875rem] font-medium normal-case tracking-normal text-slate-400 min-[390px]:block">{t('header.clubSpace', 'Spațiul clubului tău')}</p>
          <h1 className="max-w-[9rem] truncate text-sm font-medium text-slate-950 min-[390px]:max-w-[13rem] min-[390px]:text-base sm:max-w-none sm:text-lg">{organizationName}</h1>
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <div className="hidden h-10 items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 transition focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-100/70 md:flex xl:w-80">
          <Search className="h-4 w-4 text-slate-400" />
          <input className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder={t('header.searchPlaceholder')} />
        </div>
        <button
          type="button"
          onClick={() => setMobileSearchOpen((value) => !value)}
          aria-label={mobileSearchOpen ? t('common.close', 'Inchide') : t('header.search', 'Cauta')}
          aria-expanded={mobileSearchOpen}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm md:hidden"
        >
          {mobileSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
        </button>
        <div className="hidden md:block"><LanguageSelector /></div>
        <button onClick={onLogout} aria-label={t('common.logout')} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
          <LogOut className="h-4 w-4" /><span className="hidden xl:inline">{t('common.logout')}</span>
        </button>
      </div>
      </div>
      {mobileSearchOpen ? (
        <div className="border-t border-slate-100 bg-white px-4 py-3 sm:px-5 md:hidden">
          <div className="flex h-11 items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 transition focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-100/70">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              ref={mobileSearchInputRef}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
              placeholder={t('header.searchPlaceholder')}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setMobileSearchOpen(false);
              }}
            />
          </div>
        </div>
      ) : null}
    </header>
  );
}
