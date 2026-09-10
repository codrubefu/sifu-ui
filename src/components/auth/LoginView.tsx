import React from 'react';
import { Lock, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

type Credentials = {
  username: string;
  password: string;
};

type LoginViewProps = {
  credentials: Credentials;
  onChange: (field: keyof Credentials, value: string) => void;
  onSubmit: () => void;
  loading?: boolean;
  error?: string;
};

export function LoginView({ credentials, onChange, onSubmit, loading = false, error }: LoginViewProps) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="grid w-full max-w-6xl grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-white/70">{t('login.brand')}</p>
            <h1 className="mt-5 text-4xl font-bold leading-tight">{t('login.heroTitle')}</h1>
            <p className="mt-4 max-w-xl text-base text-white/80">{t('login.heroDescription')}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              [t('login.cardOrganization'), t('login.cardOrganizationDescription')],
              [t('login.cardServices'), t('login.cardServicesDescription')],
              [t('login.cardPayments'), t('login.cardPaymentsDescription')],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-lg font-semibold">{title}</p>
                <p className="mt-1 text-sm text-white/70">{desc}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="p-8 md:p-12">
          <div className="mx-auto max-w-md">
            <div className="mb-8">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">{t('login.title')}</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900">{t('login.subtitle')}</h2>
              <p className="mt-2 text-sm text-slate-500">{t('login.description')}</p>
            </div>
            <form
              className="space-y-5"
              onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                onSubmit();
              }}
            >
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <User className="h-4 w-4 text-indigo-600" /> {t('login.email')}
                </div>
                <input
                  type="email"
                  value={credentials.username}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('username', e.target.value)}
                  placeholder={t('login.emailPlaceholder')}
                  className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Lock className="h-4 w-4 text-indigo-600" /> {t('login.password')}
                </div>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('password', e.target.value)}
                  placeholder={t('login.passwordPlaceholder')}
                  className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
              <div className="text-right">
                <Link to="/forgot-password" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                  {t('login.forgotPassword')}
                </Link>
              </div>
              {error ? <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
              <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#5b45f0] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#4c38d6] disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? t('login.loading') : t('login.submit')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
