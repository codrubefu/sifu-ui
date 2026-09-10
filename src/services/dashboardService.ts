import { apiClient } from '../api/apiClient';

export type DashboardGroupBy = 'day' | 'month';

export type DashboardFilters = {
  from?: string;
  to?: string;
  group_by?: DashboardGroupBy;
};

export type DashboardStats = {
  active_members: number;
  flagged_services: number;
  total_revenue: number;
  active_locations: number;
};

export type DashboardRevenuePoint = {
  period: string;
  revenue: number;
};

export type DashboardStatusPoint = {
  status: string;
  count: number;
};

export type DashboardActivityPoint = {
  period: string;
  active: number;
  messages: number;
};

export type DashboardAutomation = {
  key: string;
  label: string;
  enabled: boolean;
  helper: string;
  count?: number | null;
};

export type DashboardPayload = {
  filters: Required<DashboardFilters>;
  stats: DashboardStats;
  revenue_by_period: DashboardRevenuePoint[];
  member_status: DashboardStatusPoint[];
  activity: DashboardActivityPoint[];
  automations: DashboardAutomation[];
};

function queryFrom(filters: DashboardFilters = {}) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return query.toString();
}

export const dashboardService = {
  getDashboard(filters: DashboardFilters = {}) {
    const query = queryFrom(filters);
    return apiClient<DashboardPayload>(`/dashboard${query ? `?${query}` : ''}`);
  },
};
