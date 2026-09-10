import { apiClient } from './apiClient';

export type RequestPasswordResetPayload = {
  email: string;
  organization_id: string | number;
};

export type ResetPasswordPayload = {
  email: string;
  organization_id: string | number;
  token: string;
  password: string;
  password_confirmation: string;
};

export function requestPasswordReset(payload: RequestPasswordResetPayload) {
  return apiClient<{ message?: string }>('/password/forgot', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function resetPassword(payload: ResetPasswordPayload) {
  return apiClient<{ message?: string }>('/password/reset', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
