import { apiClient } from '../api/apiClient';
import type { ApiServiceAssignment } from './ErpApiService';

export type SuspendServiceAssignmentPayload = {
  reason: string;
  resume_at?: string | null;
};

export const serviceLifecycleService = {
  activate: (assignmentId: number, paymentId?: number | null) => apiClient<ApiServiceAssignment>(`/service-assignments/${assignmentId}/activate`, {
    method: 'POST',
    body: JSON.stringify(paymentId ? { payment_id: paymentId } : {}),
  }),
  suspend: (assignmentId: number, payload: SuspendServiceAssignmentPayload) => apiClient<ApiServiceAssignment>(`/service-assignments/${assignmentId}/suspend`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  resume: (assignmentId: number) => apiClient<ApiServiceAssignment>(`/service-assignments/${assignmentId}/resume`, { method: 'POST' }),
  consume: (assignmentId: number) => apiClient<ApiServiceAssignment>(`/service-assignments/${assignmentId}/consume`, { method: 'POST' }),
  generateInvoice: (assignmentId: number) => apiClient<ApiServiceAssignment>(`/service-assignments/${assignmentId}/invoice`, { method: 'POST' }),
};
