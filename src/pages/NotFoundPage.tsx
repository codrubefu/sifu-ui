import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12 text-slate-900">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-600">404</p>
        <h1 className="mt-2 text-3xl font-bold">{t('notFound.title')}</h1>
        <p className="mt-3 text-slate-600">{t('notFound.description')}</p>
        <Link to="/" className="mt-6 inline-block rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white">{t('notFound.goHome')}</Link>
      </div>
    </main>
  );
}
