import { ArrowLeft, Mail } from 'lucide-react';
import type React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

type ForgotPasswordViewProps = {
  email: string;
  onChangeEmail: (value: string) => void;
  onSubmit: () => void;
  loading?: boolean;
  error?: string;
  sent?: boolean;
};

export function ForgotPasswordView({ email, onChangeEmail, onSubmit, loading = false, error, sent = false }: ForgotPasswordViewProps) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/10 md:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">{t('login.brand')}</p>
        <h2 className="mt-3 text-2xl font-bold text-slate-900">{t('passwordReset.forgotTitle')}</h2>
        <p className="mt-2 text-sm text-slate-500">{t('passwordReset.forgotSubtitle')}</p>

        {sent ? (
          <div className="mt-6 space-y-6">
            <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{t('passwordReset.genericSent')}</p>
            <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
              <ArrowLeft className="h-4 w-4" />
              {t('passwordReset.backToLogin')}
            </Link>
          </div>
        ) : (
          <form
            className="mt-6 space-y-5"
            onSubmit={(event: React.FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              onSubmit();
            }}
          >
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Mail className="h-4 w-4 text-indigo-600" /> {t('passwordReset.email')}
              </div>
              <input
                type="email"
                value={email}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChangeEmail(event.target.value)}
                placeholder={t('passwordReset.emailPlaceholder')}
                className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                autoFocus
              />
            </div>
            {error ? <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#5b45f0] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#4c38d6] disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? t('passwordReset.sending') : t('passwordReset.sendLink')}
            </button>
            <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700">
              <ArrowLeft className="h-4 w-4" />
              {t('passwordReset.backToLogin')}
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
