import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { eventService, type ApiValidationError, type EventParticipant, type ParticipantStatus } from '../../../services/eventService';
import { flattenApiErrors, participantStatuses } from './helpers';
import { participantUserId, userLabel, usersFromCardPayload } from './participantHelpers';
import { SelectField, TextField } from './ui';

export function ScanParticipantPanel({ occurrenceId, availableSlots, existingParticipants, onSaved }: { occurrenceId: number; availableSlots?: number | null; existingParticipants: EventParticipant[]; onSaved: () => void }) {
  const { t } = useTranslation();
  const [cardCode, setCardCode] = useState('');
  const [status, setStatus] = useState<ParticipantStatus>('attended');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [scanning, setScanning] = useState(false);
  const blocked = availableSlots !== null && availableSlots !== undefined && availableSlots <= 0;
  const participantIds = useMemo(() => new Set(existingParticipants.map(participantUserId).filter(Boolean)), [existingParticipants]);

  const addByCardCode = async () => {
    const code = cardCode.trim();
    if (!code || scanning || blocked) return;
    setScanning(true);
    setMessage(null);
    try {
      const users = usersFromCardPayload(await eventService.searchUsersByCard(code, 1, 10));
      const exactMatch = users.find((user) => user.user_code?.trim().toLowerCase() === code.toLowerCase());
      const user = exactMatch ?? (users.length === 1 ? users[0] : null);
      if (!user) {
        setMessage({ type: 'error', text: t('events.cardNotFound') });
        return;
      }
      if (participantIds.has(user.id)) {
        setMessage({ type: 'error', text: t('events.userAlreadyParticipant', { name: userLabel(user) }) });
        return;
      }
      await eventService.addOccurrenceParticipant(occurrenceId, { user_id: user.id, status, notes: t('events.addedViaCardScanNote', { code }) });
      setCardCode('');
      setMessage({ type: 'success', text: t('events.userAdded', { name: userLabel(user) }) });
      onSaved();
    } catch (err) {
      const apiError = err as ApiValidationError;
      setMessage({ type: 'error', text: apiError.status === 422 ? flattenApiErrors(apiError.errors) || apiError.message || t('events.userNotEligible') : apiError.message });
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_auto]">
        <TextField label={t('events.scanCard')} value={cardCode} onChange={(e) => setCardCode(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void addByCardCode(); } }} placeholder={t('events.scanCardPlaceholder')} disabled={blocked || scanning} autoFocus />
        <SelectField label={t('common.status')} value={status} onChange={(e) => setStatus(e.target.value as ParticipantStatus)} disabled={blocked || scanning}>{participantStatuses.map((s) => <option key={s}>{s}</option>)}</SelectField>
        <button type="button" onClick={() => void addByCardCode()} disabled={!cardCode.trim() || blocked || scanning} className="mt-7 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-50">{scanning ? t('events.adding') : t('events.addQuick')}</button>
      </div>
      {blocked ? <p className="mt-3 text-sm font-medium text-red-700">{t('events.noAvailablePlaces')}</p> : null}
      {message ? <p className={`mt-3 whitespace-pre-line text-sm font-medium ${message.type === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>{message.text}</p> : null}
    </div>
  );
}
