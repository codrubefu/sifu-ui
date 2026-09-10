import { apiClient } from '../api/apiClient';
import { apiHeaders, endpoint, extractErrorMessage, parseJsonResponse } from '../api/apiCore';
import type { ApiUser } from './ErpApiService';
import type { NotificationChannel } from './notificationService';

export type ConsentRecord = {
  id: number;
  purpose: string;
  channel: NotificationChannel;
  policy_version: string;
  granted: boolean;
  occurred_at: string;
  source: string;
  actor_id?: number | null;
};

export type GdprDataAccess = {
  profile: Partial<ApiUser>;
  consents: ConsentRecord[];
};

export type GdprExport = {
  id: string;
  status: 'pending' | 'ready' | 'failed';
  expires_at?: string | null;
  download_url?: string | null;
};

export type GdprRequest = {
  id: string;
  type: 'export' | 'rectification' | 'erasure';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processed_at?: string | null;
  execution_proof?: Record<string, unknown> | null;
};

export type RectificationPayload = Partial<Pick<ApiUser, 'first_name' | 'last_name' | 'phone' | 'email'>>;

function subjectPath(userId?: number) {
  return userId ? `/users/${userId}/privacy` : '/me/privacy';
}

function selfDataPath(childId?: number) {
  return childId ? `/me/privacy/data?child_id=${childId}` : '/me/privacy/data';
}

export async function downloadFromUrl(url: string) {
  const response = await fetch(url, { headers: apiHeaders() });
  if (!response.ok) {
    const payload = await parseJsonResponse(response);
    throw new Error(extractErrorMessage(payload, `Cererea a esuat (${response.status}).`));
  }
  return response.blob();
}

export const gdprService = {
  access: (userId?: number, childId?: number) => apiClient<GdprDataAccess>(userId ? `${subjectPath(userId)}/data` : selfDataPath(childId)),
  createExport: (userId?: number) => apiClient<GdprExport>(`${subjectPath(userId)}/exports`, { method: 'POST' }),
  exportStatus: (exportId: string) => apiClient<GdprExport>(`/privacy/exports/${exportId}`),
  async downloadExport(exportId: string) {
    const response = await fetch(endpoint(`/privacy/exports/${exportId}/download`), { headers: apiHeaders() });
    if (!response.ok) {
      const payload = await parseJsonResponse(response);
      throw new Error(extractErrorMessage(payload, `Cererea a esuat (${response.status}).`));
    }
    return response.blob();
  },
  rectify: (payload: RectificationPayload, userId?: number) => apiClient<ApiUser>(`${subjectPath(userId)}/rectification`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  consent: (payload: { purpose: string; channel: NotificationChannel; policy_version: string; granted: boolean; source?: string }, userId?: number) => apiClient<ConsentRecord>(`${subjectPath(userId)}/consents`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  requestErasure: (userId?: number) => apiClient<GdprRequest>(`${subjectPath(userId)}/erasure-requests`, { method: 'POST' }),
  processErasure: (requestId: string) => apiClient<GdprRequest>(`/privacy/requests/${requestId}/process`, { method: 'POST' }),
  downloadFromUrl,
};
