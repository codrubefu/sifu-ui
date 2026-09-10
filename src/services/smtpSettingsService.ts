import { apiClient, ApiClientError } from '../api/apiClient';

export type ApiSmtpSetting = {
  id: number;
  organization_id: number;
  host: string;
  port: number;
  username: string | null;
  has_password: boolean;
  encryption: 'tls' | 'ssl' | null;
  from_address: string;
  from_name: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type SmtpSettingPayload = {
  host: string;
  port: number;
  username?: string | null;
  password?: string | null;
  encryption?: 'tls' | 'ssl' | null;
  from_address: string;
  from_name?: string | null;
  active?: boolean;
};

export async function getSmtpSettings() {
  try {
    return await apiClient<ApiSmtpSetting>('/smtp-settings');
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) return null;
    throw error;
  }
}

export function createSmtpSettings(payload: SmtpSettingPayload) {
  return apiClient<ApiSmtpSetting>('/smtp-settings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateSmtpSettings(payload: Partial<SmtpSettingPayload>) {
  return apiClient<ApiSmtpSetting>('/smtp-settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteSmtpSettings() {
  return apiClient<void>('/smtp-settings', { method: 'DELETE' });
}
