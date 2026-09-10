import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Unauthorized() {
  const { t } = useTranslation();

  return (
    <main className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">{t('common.restrictedAccess')}</h1>
        <p className="mt-3 text-sm text-slate-600">{t('common.unauthorized')}</p>
        <Link to="/erp/dashboard" className="mt-6 inline-block rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white">{t('common.backToDashboard')}</Link>
      </div>
    </main>
  );
}
