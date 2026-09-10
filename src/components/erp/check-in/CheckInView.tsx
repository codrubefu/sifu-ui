import { AlertTriangle, CheckCircle2, CreditCard, Loader2, Search, ShieldAlert, UserCheck, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/useAuth';
import { checkInService, type CheckInResult } from '../../../services/checkInService';
import type { EventOccurrence } from '../../../services/eventService';
import { formatApiDate } from '../../../utils/erp/formatters';
import { PageShell } from '../shared/PageShell';

function statusStyles(verdict?: string | null) {
  if (verdict === 'allowed' || verdict === 'override_allowed') return { icon: CheckCircle2, className: 'border-emerald-200 bg-emerald-50 text-emerald-800' };
  if (verdict === 'already_present') return { icon: UserCheck, className: 'border-sky-200 bg-sky-50 text-sky-800' };
  if (verdict === 'requires_payment') return { icon: CreditCard, className: 'border-amber-200 bg-amber-50 text-amber-800' };
  if (verdict === 'document_expired') return { icon: ShieldAlert, className: 'border-orange-200 bg-orange-50 text-orange-800' };
  if (verdict === 'not_found') return { icon: Search, className: 'border-slate-200 bg-slate-50 text-slate-700' };
  return { icon: XCircle, className: 'border-red-200 bg-red-50 text-red-800' };
}

export function CheckInView() {
  const { t } = useTranslation();
  const { hasRight } = useAuth();
  const [occurrences, setOccurrences] = useState<EventOccurrence[]>([]);
  const [occurrenceId, setOccurrenceId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const canOverride = hasRight('checkins.override');

  const selectedOccurrence = useMemo(() => occurrences.find((item) => item.id === occurrenceId) ?? null, [occurrenceId, occurrences]);

  const loadOccurrences = useCallback(async () => {
    setError('');
    try {
      const rows = await checkInService.currentOccurrences();
      setOccurrences(rows);
      setOccurrenceId((current) => current ?? rows[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('checkIn.loadError'));
    }
  }, [t]);

  useEffect(() => {
    void loadOccurrences();
    inputRef.current?.focus();
  }, [loadOccurrences]);

  const search = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    try {
      setResult(await checkInService.search(trimmed, occurrenceId));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('checkIn.searchError'));
    } finally {
      setLoading(false);
    }
  }, [occurrenceId, query, t]);

  const confirm = useCallback(async (allowOverride = false) => {
    if (!result?.member?.id || !occurrenceId) return;
    setConfirming(true);
    setError('');
    try {
      setResult(await checkInService.confirm(result.member.id, occurrenceId, allowOverride));
      setQuery('');
      inputRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('checkIn.confirmError'));
    } finally {
      setConfirming(false);
    }
  }, [occurrenceId, result?.member?.id, t]);

  const styles = statusStyles(result?.verdict);
  const StatusIcon = styles.icon;
  const canConfirm = Boolean(result?.member?.id && occurrenceId && result.access_allowed && result.verdict !== 'already_present');
  const canConfirmOverride = Boolean(result?.member?.id && occurrenceId && !result.access_allowed && canOverride && result.verdict !== 'already_present' && result.verdict !== 'not_found');

  return (
    <PageShell title={t('checkIn.title')} subtitle={t('checkIn.subtitle')}>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(22rem,0.7fr)]">
        <section className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <label className="text-sm font-semibold text-slate-700" htmlFor="check-in-occurrence">{t('checkIn.currentClass')}</label>
            <select
              id="check-in-occurrence"
              value={occurrenceId ?? ''}
              onChange={(event) => setOccurrenceId(event.target.value ? Number(event.target.value) : null)}
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              {occurrences.length === 0 ? <option value="">{t('checkIn.noOccurrences')}</option> : null}
              {occurrences.map((occurrence) => (
                <option key={occurrence.id} value={occurrence.id}>
                  {occurrence.event?.title ?? t('checkIn.untitledClass')} · {formatApiDate(occurrence.start_datetime)}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <label className="text-sm font-semibold text-slate-700" htmlFor="check-in-search">{t('checkIn.searchLabel')}</label>
            <div className="mt-2 flex gap-2">
              <input
                ref={inputRef}
                id="check-in-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') void search(); }}
                placeholder={t('checkIn.searchPlaceholder')}
                className="h-14 min-w-0 flex-1 rounded-lg border border-slate-200 px-4 text-lg font-semibold text-slate-950 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              <button onClick={() => void search()} disabled={loading || !query.trim()} className="inline-flex h-14 items-center gap-2 rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                {t('checkIn.search')}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">{t('checkIn.scannerHint')}</p>
          </div>

          {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"><AlertTriangle className="mr-2 inline h-4 w-4" />{error}</div> : null}

          <div className={`min-h-[13rem] rounded-lg border p-6 shadow-sm ${styles.className}`}>
            {loading ? (
              <div className="flex h-40 items-center justify-center gap-3 text-lg font-semibold"><Loader2 className="h-6 w-6 animate-spin" />{t('checkIn.loading')}</div>
            ) : result ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-4">
                  <StatusIcon className="h-14 w-14 shrink-0" />
                  <div>
                    <p className="text-3xl font-black">{t(`checkIn.verdicts.${result.verdict}`)}</p>
                    <p className="mt-1 text-sm font-medium opacity-80">{result.reason ? t(`checkIn.reasons.${result.reason}`, { defaultValue: result.reason }) : t('checkIn.accessReady')}</p>
                  </div>
                </div>
                {result.member ? (
                  <div className="grid gap-3 rounded-lg bg-white/70 p-4 text-slate-800 md:grid-cols-3">
                    <div><p className="text-xs font-semibold uppercase text-slate-500">{t('checkIn.member')}</p><p className="text-lg font-bold">{result.member.first_name} {result.member.last_name}</p></div>
                    <div><p className="text-xs font-semibold uppercase text-slate-500">{t('checkIn.code')}</p><p className="font-semibold">{result.member.user_code ?? '-'}</p></div>
                    <div><p className="text-xs font-semibold uppercase text-slate-500">{t('checkIn.subscription')}</p><p className="font-semibold">{result.active_subscription ? t('checkIn.active') : t('checkIn.inactive')}</p></div>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {canConfirm ? <button onClick={() => void confirm(false)} disabled={confirming} className="inline-flex h-12 items-center gap-2 rounded-lg bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"><UserCheck className="h-5 w-5" />{confirming ? t('checkIn.confirming') : t('checkIn.confirm')}</button> : null}
                  {canConfirmOverride ? <button onClick={() => void confirm(true)} disabled={confirming} className="inline-flex h-12 items-center gap-2 rounded-lg bg-amber-600 px-5 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50"><ShieldAlert className="h-5 w-5" />{t('checkIn.override')}</button> : null}
                </div>
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center text-center text-sm font-medium text-slate-500">{t('checkIn.empty')}</div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-bold text-slate-950">{t('checkIn.classDetails')}</h3>
            <p className="mt-2 text-sm text-slate-600">{selectedOccurrence?.event?.title ?? t('checkIn.noClassSelected')}</p>
            <p className="mt-1 text-sm text-slate-500">{selectedOccurrence ? formatApiDate(selectedOccurrence.start_datetime) : '-'}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-bold text-slate-950">{t('checkIn.lastCheckIn')}</h3>
            <p className="mt-2 text-sm text-slate-600">{result?.last_check_in?.event_title ?? t('checkIn.noLastCheckIn')}</p>
            <p className="mt-1 text-sm text-slate-500">{result?.last_check_in?.registered_at ? formatApiDate(result.last_check_in.registered_at) : '-'}</p>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
