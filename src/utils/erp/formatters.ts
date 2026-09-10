import type { ApiPayment } from '../../services/ErpApiService';

export function formatCurrency(amount: string | number, currency = 'RON', locale = 'ro-RO') {
  const numeric = Number(amount);
  if (Number.isNaN(numeric)) return String(amount);
  return new Intl.NumberFormat(locale, { style: 'currency', currency: currency || 'RON' }).format(numeric);
}

export function deviceLocale() {
  return typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'ro-RO';
}

export function formatApiDate(value?: string | null, locale = deviceLocale()) {
  if (!value) return '-';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: value.includes('T') || value.includes(' ') ? 'short' : undefined }).format(date);
}

export function formatDeviceDate(value?: string | null) {
  if (!value) return '-';

  const dateValue = value.slice(0, 10);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
    ? new Date(`${dateValue}T00:00:00`)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return dateValue;
  return new Intl.DateTimeFormat(deviceLocale(), { dateStyle: 'medium' }).format(date);
}

export function formatDeviceDateTime(value?: string | null) {
  return formatApiDate(value);
}

export function paymentMethodLabel(payment: Pick<ApiPayment, 'payment_type_id' | 'payment_type'>) {
  if (payment.payment_type_id === 1) return 'Cash';
  if (payment.payment_type_id === 2) return 'Card';
  if (payment.payment_type_id === 3) return 'Bank transfer';
  return payment.payment_type ?? '-';
}

export function currentDateTimeLocal() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export function dateTimeLocalToApi(value: string) {
  return value ? value.replace('T', ' ') : value;
}
