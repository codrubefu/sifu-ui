import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { EventItem, EventParticipant } from '../../../services/eventService';
import { paymentService } from '../../../services/paymentService';
import { currentDateTimeLocal, dateTimeLocalToApi } from '../../../utils/erp/formatters';
import { PaymentPopup, type PaymentPopupValues } from '../payments/PaymentPopup';

function participantPaymentModelId(participant: EventParticipant) {
  return participant.pivot_id ?? null;
}

export function ParticipantPaymentModal({ participant, occurrence, onClose, onSaved }: { participant: EventParticipant; occurrence: { event?: EventItem } | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const modelId = participantPaymentModelId(participant);
  const event = occurrence?.event;
  const [values, setValues] = useState<PaymentPopupValues>({
    first_name: participant.user?.first_name ?? participant.first_name ?? '',
    last_name: participant.user?.last_name ?? participant.last_name ?? '',
    amount: event?.payment_amount ? String(event.payment_amount) : '',
    currency: event?.payment_type ?? 'RON',
    payment_type_id: '',
    paid_at: currentDateTimeLocal(),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateField = <K extends keyof PaymentPopupValues>(field: K, value: PaymentPopupValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const savePayment = async () => {
    const numericAmount = Number(values.amount);
    const numericPaymentTypeId = Number(values.payment_type_id);
    setError('');

    if (!modelId) {
      setError(t('events.missingParticipantModelId'));
      return;
    }
    if (!values.first_name.trim() || !values.last_name.trim() || !values.paid_at) {
      setError(t('events.participantPaymentRequired'));
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError(t('events.paymentAmountPositive'));
      return;
    }
    if (![1, 2, 3].includes(numericPaymentTypeId)) {
      setError(t('events.selectPaymentMethod'));
      return;
    }

    setSaving(true);
    try {
      await paymentService.create({
        model_type: 'event_occurrence_user',
        model_id: modelId,
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        amount: numericAmount,
        payment_type_id: numericPaymentTypeId as 1 | 2 | 3,
        paid_at: dateTimeLocalToApi(values.paid_at),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('events.paymentSaveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PaymentPopup
      title={t('events.addParticipantPayment')}
      subtitle={t('events.linkedEventOccurrenceUser', { id: modelId ?? '-' })}
      values={values}
      error={error}
      saving={saving}
      onChange={updateField}
      onClose={onClose}
      onSave={() => void savePayment()}
    />
  );
}
