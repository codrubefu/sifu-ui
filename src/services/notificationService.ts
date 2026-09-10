import { apiClient } from '../api/apiClient';

export type NotificationChannel = 'sms' | 'mail';

export type NotificationPreference = {
  id: number;
  user_id: number;
  channel: NotificationChannel;
  scope: string;
  subscribed: boolean;
};

export const notificationService = {
  setPreference: (payload: { channel: NotificationChannel; scope: string; subscribed: boolean }) => apiClient<NotificationPreference>('/notification-preferences', {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
};
