import { Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Input, Modal, Select, Textarea } from '../../primitives';

export type PaymentPopupValues = {
  first_name: string;
  last_name: string;
  amount: string;
  currency: string;
  payment_type_id: string;
  paid_at: string;
  reference_id?: string;
  reference_label?: string;
  reference_name?: string;
  reference_description?: string;
};

type PaymentPopupProps = {
  title: string;
  subtitle?: string;
  values: PaymentPopupValues;
  maxAmount?: number | null;
  error?: string;
  success?: string;
  saving?: boolean;
  showReferenceFields?: boolean;
  onChange: <K extends keyof PaymentPopupValues>(field: K, value: PaymentPopupValues[K]) => void;
  onClose: () => void;
  onSave: () => void;
};

export function PaymentPopup({ title, subtitle, values, maxAmount, error, success, saving, showReferenceFields = false, onChange, onClose, onSave }: PaymentPopupProps) {
  const { t } = useTranslation();
  const [localValues, setLocalValues] = useState(values);
  const amount = Number(localValues.amount);
  const amountTooHigh = maxAmount !== null
    && maxAmount !== undefined
    && Number.isFinite(amount)
    && amount > maxAmount;
  const maxAmountLabel = maxAmount === null || maxAmount === undefined ? '' : maxAmount.toFixed(2);

  useEffect(() => {
    setLocalValues(values);
  }, [values]);

  const updateField = <K extends keyof PaymentPopupValues>(field: K, value: PaymentPopupValues[K]) => {
    setLocalValues((prev) => ({ ...prev, [field]: value }));
    onChange(field, value);
  };

  return (
    <Modal open onClose={onClose} title={title} subtitle={subtitle}>
        {success ? <Alert tone="success" className="mb-4">{success}</Alert> : null}
        {error ? <Alert tone="error" className="mb-4">{error}</Alert> : null}
        {amountTooHigh ? <Alert tone="error" className="mb-4">Suma platita nu poate depasi suma ramasa pentru serviciu ({maxAmountLabel}).</Alert> : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input label={t('users.firstName')} value={localValues.first_name} onChange={(event) => updateField('first_name', event.target.value)} />
          <Input label={t('users.lastName')} value={localValues.last_name} onChange={(event) => updateField('last_name', event.target.value)} />
          {showReferenceFields ? (
            <>
              <Input label={localValues.reference_label ?? 'Reference ID'} value={localValues.reference_id ?? ''} onChange={(event) => updateField('reference_id', event.target.value)} />
              <Input label={t('services.service')} value={localValues.reference_name ?? ''} onChange={(event) => updateField('reference_name', event.target.value)} />
            </>
          ) : null}
          <Input label={t('payments.amount')} type="number" min="0" max={maxAmount ?? undefined} step="0.01" value={localValues.amount} onChange={(event) => updateField('amount', event.target.value)} />
          <Input label={t('services.currency')} value={localValues.currency} onChange={(event) => updateField('currency', event.target.value)} />
          <Select label={t('payments.paymentMethod')} value={localValues.payment_type_id} onChange={(event) => updateField('payment_type_id', event.target.value)}>
            <option value="">{t('common.select')}</option>
            <option value="1">Cash</option>
            <option value="2">Card</option>
            <option value="3">Bank transfer</option>
          </Select>
          <Input label={t('payments.transactionDate')} type="datetime-local" value={localValues.paid_at} onChange={(event) => updateField('paid_at', event.target.value)} />
          {showReferenceFields ? (
            <div className="md:col-span-2">
              <Textarea label={t('services.description')} value={localValues.reference_description ?? ''} onChange={(event) => updateField('reference_description', event.target.value)} />
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="dark" onClick={onSave} disabled={saving || amountTooHigh}>
            <Save className="h-4 w-4" />{saving ? t('common.saving') : t('payments.save')}
          </Button>
        </div>
    </Modal>
  );
}
