import { getRuntimeConfig } from '../config/runtimeConfig';
import i18n from '../i18n';

export const API_BASE_URL = '/api';
export const TOKEN_KEY = 'master-erp-api-token';

export class ApiClientError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.errors = errors;
  }
}

export type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  user?: T;
  token?: string;
  access_token?: string;
  bearer_token?: string;
  message?: string;
  errors?: Record<string, string[]>;
};

export function endpoint(path: string) {
  const apiBaseUrl = getApiBaseUrl();
  return `${apiBaseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

export function getApiBaseUrl() {
  return getRuntimeConfig().apiBaseUrl || API_BASE_URL;
}

export function clearApiToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export function apiHeaders(options: RequestInit = {}) {
  const token = window.localStorage.getItem(TOKEN_KEY);
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

export function extractErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object') {
    const body = payload as ApiEnvelope<unknown>;
    if (body.message) return translateApiError(body.message);
    const first = body.errors ? Object.values(body.errors)[0]?.[0] : '';
    if (first) return translateApiError(first);
  }
  return fallback;
}

function translateApiError(message: string) {
  const deleteBlockedMatch = message.match(/^Cannot delete (.+) because it still has related (.+)\.$/);
  if (deleteBlockedMatch) {
    return i18n.t('apiErrors.deleteBlockedByRelated', {
      model: deleteBlockedMatch[1],
      relation: deleteBlockedMatch[2],
    });
  }

  const translationKey = `apiErrors.${message}`;
  return i18n.exists(translationKey) ? i18n.t(translationKey) : message;
}

export function unwrapApiPayload<T>(payload: T | ApiEnvelope<T>): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data as T;
  }
  if (payload && typeof payload === 'object' && 'user' in payload) {
    return (payload as ApiEnvelope<T>).user as T;
  }
  return payload as T;
}

export async function parseJsonResponse(response: Response) {
  const text = await response.text();
  const isJson = response.headers.get('Content-Type')?.includes('application/json');
  return text && isJson ? JSON.parse(text) : null;
}
