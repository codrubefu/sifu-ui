import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function AboutPage() {
  const { t } = useTranslation();

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold">{t('about.title')}</h1>
        <p className="mt-3 text-slate-600">{t('about.description')}</p>

        <div className="mt-8 flex gap-3">
          <Link to="/" className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">{t('about.backHome')}</Link>
          <Link to="/erp" className="rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white">ERP</Link>
        </div>
      </div>
    </main>
  );
}
