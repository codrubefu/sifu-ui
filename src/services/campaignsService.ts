import { apiClient } from '../api/apiClient';
import type { ApiUser } from './ErpApiService';

export type CampaignChannel = 'mail' | 'sms';
export type CampaignStatus = 'draft' | 'scheduled' | 'sent' | 'cancelled';

export type Campaign = {
  id: number;
  organization_id: number;
  segment_id?: number | null;
  created_by: number;
  name: string;
  channel: CampaignChannel;
  subject?: string | null;
  content: string;
  status: CampaignStatus;
  scheduled_at?: string | null;
  cancelled_at?: string | null;
  dispatched_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CampaignPayload = {
  name: string;
  channel: CampaignChannel;
  subject?: string | null;
  content: string;
  segment_id?: number | null;
};

export type CampaignPreview = {
  count: number;
  data: Pick<ApiUser, 'id' | 'first_name' | 'last_name' | 'email' | 'phone'>[];
};

export type CampaignStatistics = {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  skipped: number;
};

export const campaignsService = {
  list: () => apiClient<Campaign[]>('/campaigns'),
  create: (payload: CampaignPayload) => apiClient<Campaign>('/campaigns', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  update: (campaignId: number, payload: CampaignPayload) => apiClient<Campaign>(`/campaigns/${campaignId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  preview: (campaignId: number) => apiClient<CampaignPreview>(`/campaigns/${campaignId}/preview`),
  schedule: (campaignId: number, scheduledAt: string) => apiClient<Campaign>(`/campaigns/${campaignId}/schedule`, {
    method: 'POST',
    body: JSON.stringify({ scheduled_at: scheduledAt }),
  }),
  cancel: (campaignId: number) => apiClient<Campaign>(`/campaigns/${campaignId}/cancel`, { method: 'POST' }),
  statistics: (campaignId: number) => apiClient<CampaignStatistics>(`/campaigns/${campaignId}/statistics`),
};
