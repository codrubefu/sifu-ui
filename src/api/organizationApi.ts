import { apiClient } from './apiClient';

export type ApiOrganization = {
  id: string | number;
  name: string;
};

export function getOrganizationByUrl(url: string) {
  return apiClient<ApiOrganization>(`/organizations/by-url?url=${encodeURIComponent(url)}`);
}
