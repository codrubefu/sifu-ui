import { AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { eventService, type ApiValidationError, type EventItem, type EventUser, type ParticipantStatus } from '../../../services/eventService';
import { flattenApiErrors, participantStatuses } from './helpers';
import { hasActiveService, summarizeFutureOccurrences, userLabel, usersFromPayload } from './participantHelpers';
import { Pagination, SelectField, TextField } from './ui';

export function AddParticipantsPanel({ occurrenceId, event, availableSlots, onClose, onSaved }: { occurrenceId: number; event?: EventItem; availableSlots?: number | null; onClose: () => void; onSaved: (summaryMessage?: string) => void }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<EventUser[]>([]);
  const [usersMeta, setUsersMeta] = useState({ current_page: 1, last_page: 1, per_page: 10, total: 0 });
  const [usersPage, setUsersPage] = useState(1);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [status, setStatus] = useState<ParticipantStatus>('registered');
  const [notes, setNotes] = useState('');
  const [applyToFuture, setApplyToFuture] = useState(false);
  const [error, setError] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const blocked = availableSlots !== null && availableSlots !== undefined && availableSlots <= 0;
  const selectableUsers = users;

  useEffect(() => {
    setUsersPage(1);
  }, [search]);

  useEffect(() => {
    const query = search.trim();
    let active = true;
    setLoadingUsers(true);
    const timeout = window.setTimeout(() => {
      eventService.getEligibleOccurrenceParticipants(occurrenceId, { search: query, page: usersPage, per_page: usersMeta.per_page }).then((payload) => {
        if (!active) return;
        setUsers(usersFromPayload(payload));
        if (!Array.isArray(payload)) {
          setUsersMeta({
            current_page: payload.meta?.current_page ?? payload.current_page ?? usersPage,
            last_page: payload.meta?.last_page ?? payload.last_page ?? 1,
            per_page: payload.meta?.per_page ?? payload.per_page ?? usersMeta.per_page,
            total: payload.meta?.total ?? payload.total ?? payload.data?.length ?? 0,
          });
        } else {
          setUsersMeta({ current_page: 1, last_page: 1, per_page: payload.length, total: payload.length });
        }
      }).catch(() => {
        if (active) setUsers([]);
      }).finally(() => {
        if (active) setLoadingUsers(false);
      });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [occurrenceId, search, usersMeta.per_page, usersPage]);

  const toggleUser = (id: number, checked: boolean) => {
    setSelectedUserIds((prev) => checked ? Array.from(new Set([...prev, id])) : prev.filter((item) => item !== id));
  };

  const togglePage = (checked: boolean) => {
    const pageIds = selectableUsers.map((user) => user.id);
    setSelectedUserIds((prev) => checked ? Array.from(new Set([...prev, ...pageIds])) : prev.filter((id) => !pageIds.includes(id)));
  };

  const save = async () => {
    if (blocked || !selectedUserIds.length || saving) return;
    setError('');
    setSaving(true);
    try {
      const response = await eventService.bulkAddOccurrenceParticipants(occurrenceId, { user_ids: selectedUserIds, status, notes: notes || null, apply_to_future_occurrences: applyToFuture || undefined });
      const futureUpdates = response.future_occurrences_updated;
      const summaryMessage = futureUpdates
        ? (() => {
            const { occurrencesWithAdds, skippedCount } = summarizeFutureOccurrences(futureUpdates);
            return t('events.futureOccurrencesSummary', { count: occurrencesWithAdds, skipped: skippedCount });
          })()
        : undefined;
      onSaved(summaryMessage);
    } catch (err) {
      const apiError = err as ApiValidationError;
      setError(apiError.status === 422 ? flattenApiErrors(apiError.errors) || apiError.message || t('events.userNotEligible') : apiError.message);
    } finally {
      setSaving(false);
    }
  };

  const allPageSelected = selectableUsers.length > 0 && selectableUsers.every((user) => selectedUserIds.includes(user.id));

  return <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><h3 className="text-lg font-medium">{t('events.addParticipant')}</h3><p className="mt-1 text-sm text-slate-500">{t('events.selectEligibleUsersHint')}</p></div><button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-medium">{t('common.close')}</button></div>{event?.requires_active_service ? <p className="mt-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800"><AlertTriangle className="mr-2 inline h-4 w-4" />{t('events.eventNeedsActiveService')}</p> : null}{blocked ? <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{t('events.noAvailablePlaces')}</p> : null}{error ? <p className="mt-3 whitespace-pre-line rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}<div className="mt-4 space-y-4"><div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px]"><TextField label={t('events.searchUser')} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('events.searchUserPlaceholder')} autoFocus /><SelectField label={t('common.status')} value={status} onChange={(e) => setStatus(e.target.value as ParticipantStatus)} disabled={blocked}>{participantStatuses.map((s) => <option key={s}>{s}</option>)}</SelectField></div><label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"><input type="checkbox" checked={applyToFuture} onChange={(e) => setApplyToFuture(e.target.checked)} className="h-4 w-4 accent-indigo-600" />{t('events.applyToFutureOccurrences')}</label><div className="overflow-hidden rounded-lg border border-slate-200"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="w-12 px-4 py-3"><input type="checkbox" checked={allPageSelected} onChange={(e) => togglePage(e.target.checked)} disabled={!selectableUsers.length || blocked} className="h-4 w-4 accent-indigo-600" /></th><th className="px-4 py-3">{t('users.user')}</th><th className="px-4 py-3">{t('members.email')}</th><th className="px-4 py-3">{t('members.phone')}</th><th className="px-4 py-3">{t('services.service')}</th></tr></thead><tbody>{selectableUsers.length ? selectableUsers.map((u) => <tr key={u.id} className={`border-t border-slate-100 ${selectedUserIds.includes(u.id) ? 'bg-indigo-50/60' : ''}`}><td className="px-4 py-3"><input type="checkbox" checked={selectedUserIds.includes(u.id)} onChange={(e) => toggleUser(u.id, e.target.checked)} disabled={blocked} className="h-4 w-4 accent-indigo-600" /></td><td className="px-4 py-3 font-medium text-slate-900">{userLabel(u)}</td><td className="px-4 py-3 text-slate-600">{u.email}</td><td className="px-4 py-3 text-slate-600">{u.phone || '-'}</td><td className="px-4 py-3">{hasActiveService(u) ? <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">{t('users.statusActive')}</span> : <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{t('events.eligible')}</span>}</td></tr>) : <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">{loadingUsers ? t('events.loadingUsers') : t('events.noUsers')}</td></tr>}</tbody></table></div><div className="flex flex-col gap-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between"><span>{usersMeta.total ? t('events.usersCount', { count: usersMeta.total }) : t('events.noResults')} - {t('events.selected', { count: selectedUserIds.length })}</span><Pagination page={usersMeta.current_page} lastPage={usersMeta.last_page} onPage={setUsersPage} /></div><label><span className="mb-2 block text-sm font-medium">{t('events.notes')}</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border px-4 py-3 text-sm" /></label></div><div className="mt-6 flex justify-end gap-2"><button onClick={() => setSelectedUserIds([])} disabled={!selectedUserIds.length || saving} className="rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50">{t('events.clearSelection')}</button><button onClick={() => void save()} disabled={!selectedUserIds.length || blocked || saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? t('events.adding') : t('events.addParticipantsCount', { count: selectedUserIds.length })}</button></div></div>;
}
