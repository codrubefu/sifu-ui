import { CreditCard, Download, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { eventService, type EventItem, type EventParticipant, type ParticipantStatus } from '../../../services/eventService';
import type { ApiPayment } from '../../../services/ErpApiService';
import { paymentService } from '../../../services/paymentService';
import { formatApiDate, formatCurrency, paymentMethodLabel } from '../../../utils/erp/formatters';
import { useEventParticipants, usePermissions } from './hooks';
import { downloadBlob, participantStatuses } from './helpers';
import { participantName, participantPaymentModelId, participantUserId } from './participantHelpers';
import { StatusBadge } from './ui';
import { AddParticipantsPanel } from './AddParticipantsPanel';
import { ScanParticipantPanel } from './ScanParticipantPanel';
import { ParticipantPaymentModal } from './ParticipantPaymentModal';

export function OccurrenceParticipantsPanel({ occurrenceId, showAdd, onShowAddChange, onClose, onParticipantsChanged, onNotify }: { occurrenceId: number; showAdd: boolean; onShowAddChange: (value: boolean) => void; onClose: () => void; onParticipantsChanged?: () => void; onNotify?: (toast: { type: 'success' | 'error'; message: string }) => void }) {
  const { t } = useTranslation();
  const id = occurrenceId;
  const { participants, loading, error, reload } = useEventParticipants(id);
  const [occurrence, setOccurrence] = useState<{ event?: EventItem; available_places?: number | null; occurrence_date?: string } | null>(null);
  const [paymentParticipant, setPaymentParticipant] = useState<EventParticipant | null>(null);
  const [occurrencePayments, setOccurrencePayments] = useState<ApiPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState('');
  const [attendancePdfLoading, setAttendancePdfLoading] = useState(false);
  const [attendancePdfError, setAttendancePdfError] = useState('');
  const [savingParticipantId, setSavingParticipantId] = useState<number | null>(null);
  const [participantDrafts, setParticipantDrafts] = useState<Record<number, { status: ParticipantStatus; notes: string }>>({});
  const permissions = usePermissions();

  useEffect(() => {
    eventService.getOccurrence(id).then(setOccurrence).catch(() => setOccurrence(null));
  }, [id]);

  useEffect(() => {
    setParticipantDrafts((prev) => {
      const next: Record<number, { status: ParticipantStatus; notes: string }> = {};
      participants.forEach((participant) => {
        const userId = participantUserId(participant);
        next[userId] = prev[userId] ?? { status: participant.status, notes: participant.notes ?? '' };
      });
      return next;
    });
  }, [participants]);

  const remove = async (userId: number) => {
    await eventService.removeOccurrenceParticipant(id, userId);
    await reload();
    onParticipantsChanged?.();
  };

  const updateDraft = (userId: number, patch: Partial<{ status: ParticipantStatus; notes: string }>) => {
    setParticipantDrafts((prev) => ({ ...prev, [userId]: { status: prev[userId]?.status ?? 'registered', notes: prev[userId]?.notes ?? '', ...patch } }));
  };

  const saveParticipant = async (userId: number) => {
    const draft = participantDrafts[userId];
    if (!draft) return;
    setSavingParticipantId(userId);
    try {
      await eventService.updateOccurrenceParticipantStatus(id, userId, { status: draft.status, notes: draft.notes || null });
      await reload();
      onParticipantsChanged?.();
    } finally {
      setSavingParticipantId(null);
    }
  };

  const loadOccurrencePayments = useCallback(async (items = participants) => {
    const modelIds = items.map(participantPaymentModelId).filter((value): value is number => Boolean(value));
    if (!modelIds.length) {
      setOccurrencePayments([]);
      setPaymentsError('');
      return;
    }
    setPaymentsLoading(true);
    setPaymentsError('');
    try {
      setOccurrencePayments(await paymentService.listForModels('event_occurrence_user', modelIds));
    } catch (err) {
      setOccurrencePayments([]);
      setPaymentsError(err instanceof Error ? err.message : t('events.paymentsLoadError'));
    } finally {
      setPaymentsLoading(false);
    }
  }, [participants, t]);

  useEffect(() => {
    void loadOccurrencePayments(participants);
  }, [loadOccurrencePayments, participants]);

  const paymentsByParticipant = new Map<number, ApiPayment[]>();
  occurrencePayments.forEach((payment) => {
    if (!payment.model_id) return;
    const current = paymentsByParticipant.get(payment.model_id) ?? [];
    paymentsByParticipant.set(payment.model_id, [...current, payment]);
  });

  const downloadAttendancePdf = async () => {
    setAttendancePdfLoading(true);
    setAttendancePdfError('');
    try {
      downloadBlob(await eventService.downloadOccurrenceParticipantsPdf(id), `prezenta-eveniment-${id}.pdf`);
    } catch (err) {
      setAttendancePdfError(err instanceof Error ? err.message : t('events.attendancePdfDownloadError'));
    } finally {
      setAttendancePdfLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-medium normal-case tracking-wide text-slate-600">{t('events.occurrenceParticipantsTitle', { date: occurrence?.occurrence_date ?? '' })}</h4>
        <div className="flex flex-wrap justify-end gap-2">
          {permissions.canViewParticipants ? (
            <button onClick={() => void downloadAttendancePdf()} disabled={attendancePdfLoading} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-60">
              <Download className="mr-2 inline h-4 w-4" />{attendancePdfLoading ? t('common.loading') : t('events.downloadAttendancePdf')}
            </button>
          ) : null}
          {permissions.canManageParticipants ? (
            <button onClick={() => onShowAddChange(true)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
              <Plus className="mr-2 inline h-4 w-4" />{t('events.addParticipant')}
            </button>
          ) : null}
          <button onClick={onClose} title={t('common.close')} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"><X className="h-4 w-4" /></button>
        </div>
      </div>
      {showAdd ? <AddParticipantsPanel occurrenceId={id} event={occurrence?.event} availableSlots={occurrence?.available_places} onClose={() => onShowAddChange(false)} onSaved={(summaryMessage) => { onShowAddChange(false); void reload(); onParticipantsChanged?.(); if (summaryMessage) onNotify?.({ type: 'success', message: summaryMessage }); }} /> : null}
      {permissions.canManageParticipants ? <ScanParticipantPanel occurrenceId={id} availableSlots={occurrence?.available_places} existingParticipants={participants} onSaved={() => { void reload(); onParticipantsChanged?.(); }} /> : null}
      {error ? <p className="text-red-600">{error}</p> : null}
      {attendancePdfError ? <p className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{attendancePdfError}</p> : null}
      {paymentsError ? <p className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{paymentsError}</p> : null}

      <div className="mb-3 flex justify-end">
        <button onClick={() => void loadOccurrencePayments()} disabled={paymentsLoading} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-60">
          <RefreshCw className="mr-2 inline h-4 w-4" />{t('events.refreshPayments')}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b text-slate-500">
              <th className="pb-3">{t('users.user')}</th>
              <th className="pb-3">{t('members.email')}</th>
              <th className="pb-3">{t('common.status')}</th>
              <th className="pb-3">{t('users.registeredAt')}</th>
              <th className="pb-3">{t('events.notes')}</th>
              <th className="pb-3 text-right">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {participants.length ? participants.map((participant) => {
              const userId = participantUserId(participant);
              const modelId = participantPaymentModelId(participant);
              const participantPayments = modelId ? paymentsByParticipant.get(modelId) ?? [] : [];
              const draft = participantDrafts[userId] ?? { status: participant.status, notes: participant.notes ?? '' };
              const dirty = draft.status !== participant.status || draft.notes !== (participant.notes ?? '');

              return (
                <tr key={userId} className="border-b border-slate-100 align-top">
                  <td className="py-4">
                    <p className="font-medium text-slate-900">{participantName(participant)}</p>
                    <div className="mt-3 space-y-2">
                      {participantPayments.length ? participantPayments.map((payment) => (
                        <div key={payment.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                          <p className="text-xs font-medium text-slate-900">{t('events.paymentLabel', { id: payment.id })} - {formatCurrency(payment.amount)}</p>
                          <p className="text-xs text-slate-500">{paymentMethodLabel(payment)} - {formatApiDate(payment.paid_at)}</p>
                        </div>
                      )) : <p className="text-xs text-slate-400">{paymentsLoading ? t('events.loadingPayments') : t('events.noPayments')}</p>}
                    </div>
                  </td>
                  <td className="py-4">{participant.user?.email ?? participant.email ?? '-'}</td>
                  <td className="py-4">{permissions.canManageParticipants ? <select value={draft.status} onChange={(e) => updateDraft(userId, { status: e.target.value as ParticipantStatus })} className="rounded-lg border px-3 py-2">{participantStatuses.map((status) => <option key={status}>{status}</option>)}</select> : <StatusBadge status={participant.status} />}</td>
                  <td className="py-4">{participant.registered_at}</td>
                  <td className="py-4">{permissions.canManageParticipants ? <textarea value={draft.notes} onChange={(e) => updateDraft(userId, { notes: e.target.value })} rows={2} className="min-w-64 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" /> : participant.notes || '-'}</td>
                  <td className="py-4 text-right">{permissions.canManageParticipants ? <div className="flex justify-end gap-2"><button onClick={() => setPaymentParticipant(participant)} className="rounded-lg border border-slate-200 px-3 py-2 text-slate-700"><CreditCard className="h-4 w-4" /></button><button onClick={() => void saveParticipant(userId)} disabled={!dirty || savingParticipantId === userId} className="rounded-lg border border-slate-200 px-3 py-2 text-slate-700 disabled:opacity-40"><Save className="h-4 w-4" /></button><button onClick={() => void remove(userId)} className="rounded-lg border border-red-100 px-3 py-2 text-red-600"><Trash2 className="h-4 w-4" /></button></div> : null}</td>
                </tr>
              );
            }) : <tr><td colSpan={6} className="py-10 text-center text-slate-500">{loading ? t('common.loading') : t('events.noParticipants')}</td></tr>}
          </tbody>
        </table>
      </div>

      {paymentParticipant ? <ParticipantPaymentModal participant={paymentParticipant} occurrence={occurrence} onClose={() => setPaymentParticipant(null)} onSaved={() => { setPaymentParticipant(null); void loadOccurrencePayments(); }} /> : null}
    </div>
  );
}
