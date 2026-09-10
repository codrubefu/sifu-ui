import { apiClient } from '../api/apiClient';
import { erpApiService, type ApiUser } from './ErpApiService';

export type SegmentCriteria = {
  expires_in_days?: number;
  expired?: boolean;
  active?: boolean;
  location_id?: number;
  service_type?: 'membership' | 'access_pass';
};

export type Segment = {
  id: number;
  organization_id: number;
  name: string;
  criteria: SegmentCriteria;
  created_by: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type SegmentPayload = {
  name: string;
  criteria: SegmentCriteria;
};

export const segmentsService = {
  list: () => apiClient<Segment[]>('/segments'),
  create: (payload: SegmentPayload) => apiClient<Segment>('/segments', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  update: (segmentId: number, payload: SegmentPayload) => apiClient<Segment>(`/segments/${segmentId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  delete: (segmentId: number) => apiClient<void>(`/segments/${segmentId}`, { method: 'DELETE' }),
  listMembers: (segmentId: number, perPage = 15) => erpApiService.listPaginated<ApiUser>(`segments/${segmentId}/members`, { per_page: perPage }),
};
