import { erpApiService, type ApiPayment } from './ErpApiService';

export type PaymentModelType = ApiPayment['model_type'];

export type PaymentPayload = {
  model_type: PaymentModelType;
  model_id: number;
  first_name: string;
  last_name: string;
  amount: number;
  payment_type_id: 1 | 2 | 3;
  paid_at: string;
  external_reference?: string;
  provider?: string;
};

function uniqueById(payments: ApiPayment[]) {
  const unique = new Map<number, ApiPayment>();
  payments.forEach((payment) => unique.set(payment.id, payment));
  return [...unique.values()];
}

export const paymentService = {
  listPaginated: (page: number, perPage: number) => erpApiService.listPaginated<ApiPayment>('payments', { page, per_page: perPage }),
  create: (payload: PaymentPayload) => erpApiService.create<ApiPayment>('payments', payload),
  attachModel: (paymentId: number, payload: { model_type: PaymentModelType; model_id: number }) => erpApiService.attachPaymentModel<ApiPayment>(paymentId, payload),
  downloadReceipt: (paymentId: number) => erpApiService.downloadPaymentReceipt(paymentId),
  listForModels: async (modelType: PaymentModelType, modelIds: number[]) => {
    const ids = Array.from(new Set(modelIds.filter(Boolean)));
    if (!ids.length) return [];

    const paymentGroups = await Promise.all(ids.map((modelId) => erpApiService.list<ApiPayment>('payments', { model_type: modelType, model_id: modelId })));
    return uniqueById(paymentGroups.flat())
      .filter((payment) => payment.model_type === modelType && Boolean(payment.model_id && ids.includes(payment.model_id)))
      .sort((a, b) => String(b.paid_at ?? '').localeCompare(String(a.paid_at ?? '')));
  },
};
