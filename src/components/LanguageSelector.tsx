import { useTranslation } from 'react-i18next';

export function LanguageSelector() {
  const { i18n, t } = useTranslation();

  return (
    <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
      <span className="sr-only">{t('common.language')}</span>
      <select
        value={i18n.language}
        onChange={(event) => void i18n.changeLanguage(event.target.value)}
        className="bg-transparent text-sm font-semibold outline-none"
        aria-label={t('common.language')}
      >
        <option value="ro">RO</option>
        <option value="en">EN</option>
        <option value="uk">UK</option>
      </select>
    </label>
  );
}
