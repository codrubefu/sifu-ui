import { apiClient } from './apiClient';
import { apiHeaders, endpoint, extractErrorMessage, parseJsonResponse } from './apiCore';
import type { ApiCustomFieldValue, ApiPaginated, ApiService, ApiUserDocument, ApiUserGrade, AuthenticatedUser } from '../services/ErpApiService';

type MeResponse = AuthenticatedUser | {
  user?: AuthenticatedUser;
};

export type UpdateAuthenticatedUserPasswordPayload = {
  current_password: string;
  password: string;
  password_confirmation: string;
};

function withChildId(path: string, childId?: number) {
  return childId ? `${path}?child_id=${childId}` : path;
}

export function getAuthenticatedUser(childId?: number) {
  return apiClient<MeResponse>(withChildId('/me', childId)).then((payload) => {
    if (payload && typeof payload === 'object' && 'user' in payload && payload.user) {
      return payload.user;
    }
    return payload as AuthenticatedUser;
  });
}

export function updateAuthenticatedUserPassword(payload: UpdateAuthenticatedUserPasswordPayload) {
  return apiClient('/me/password', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export type AuthenticatedUserEvent = {
  id: number;
  event_id?: number;
  title?: string;
  name?: string;
  starts_at?: string | null;
  start_at?: string | null;
  start_time?: string | null;
  ends_at?: string | null;
  end_at?: string | null;
  end_time?: string | null;
  status?: string | null;
  event?: {
    title?: string;
    name?: string;
  } | null;
};

export function getAuthenticatedUserEvents(childId?: number) {
  return apiClient<ApiPaginated<AuthenticatedUserEvent> | AuthenticatedUserEvent[]>(withChildId('/me/events', childId));
}

export function getAuthenticatedUserServices(childId?: number) {
  return apiClient<ApiPaginated<ApiService> | ApiService[]>(withChildId('/me/services', childId));
}

export function getAuthenticatedUserCustomFields(childId?: number) {
  return apiClient<ApiCustomFieldValue[]>(withChildId('/me/custom-fields', childId));
}

export type AuthenticatedUserChild = {
  id: number;
  first_name: string;
  last_name: string;
  active?: boolean;
};

export function getAuthenticatedUserChildren() {
  return apiClient<ApiPaginated<AuthenticatedUserChild> | AuthenticatedUserChild[]>('/me/children').then((payload) =>
    Array.isArray(payload) ? payload : payload.data ?? []
  );
}

export function getAuthenticatedUserGrades(childId?: number) {
  return apiClient<ApiPaginated<ApiUserGrade> | ApiUserGrade[]>(withChildId('/me/grades', childId));
}

export function getAuthenticatedUserDocuments(childId?: number) {
  return apiClient<ApiPaginated<ApiUserDocument> | ApiUserDocument[]>(withChildId('/me/documents', childId));
}

export async function downloadAuthenticatedUserDocument(documentId: number, childId?: number) {
  const response = await fetch(endpoint(withChildId(`/me/documents/${documentId}/download`, childId)), {
    headers: apiHeaders(),
  });
  if (!response.ok) {
    const payload = await parseJsonResponse(response);
    throw new Error(extractErrorMessage(payload, `Cererea a esuat (${response.status}).`));
  }
  return response.blob();
}
