import { apiClient } from '../api/apiClient';
import { apiHeaders, endpoint, extractErrorMessage, parseJsonResponse } from '../api/apiCore';

export type FinancialReportGroupBy = 'day' | 'month';
export type ReportExportFormat = 'csv' | 'xlsx';
export type ReportExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type FinancialReportFilters = {
  from?: string;
  to?: string;
  organization_id?: number;
  location_id?: number;
  admin_id?: number;
  payment_type_id?: 1 | 2 | 3;
  status?: 'initiated' | 'pending' | 'confirmed' | 'failed' | 'refunded' | 'cancelled';
  service_type?: 'membership' | 'access_pass';
  group_by?: FinancialReportGroupBy;
  segment_id?: number;
};

export type FinancialReportAggregate = {
  totals: {
    confirmed: number;
    refunded: number;
    net: number;
    count: number;
  };
  revenue_by_period: Array<{
    period: string;
    total: number;
  }>;
  receivables: {
    invoiced: number;
    paid: number;
    outstanding: number;
  };
  renewals: number;
  bank_reconciliation: {
    total: number;
    reconciled: number;
    unreconciled: number;
  };
};

export type ReportExport = {
  id: string;
  organization_id: number;
  requested_by: number;
  format: ReportExportFormat;
  filters: FinancialReportFilters;
  status: ReportExportStatus;
  path?: string | null;
  error?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type FinancialDocumentType = 'invoice' | 'payment_note' | 'receipt';

export type FinancialDocument = {
  id: number;
  type: FinancialDocumentType;
  type_label: string;
  number: string;
  date: string;
  member: string;
  description: string;
  amount: number;
  currency?: string | null;
  filename: string;
  xml_filename?: string | null;
};

export type ServiceExpirationCategory = 'expiring_soon' | 'expired' | 'suspended' | 'not_renewed';
export type ServiceAssignmentStatus = 'pending' | 'active' | 'expired' | 'suspended' | 'consumed' | 'reserved';

export type ServiceExpirationFilters = {
  location_id?: number;
  service_type?: 'membership' | 'access_pass';
  status?: ServiceAssignmentStatus;
  expires_in_days_from?: number;
  expires_in_days_to?: number;
  category?: ServiceExpirationCategory;
};

export type ServiceExpirationRow = {
  assignment_id: number;
  user_id: number;
  member_name: string;
  phone?: string | null;
  service_id: number;
  service_name: string;
  service_type: 'membership' | 'access_pass' | string;
  status: ServiceAssignmentStatus | string;
  start_date?: string | null;
  expires_at?: string | null;
  days_until_expiration?: number | null;
  last_notification_at?: string | null;
  category: ServiceExpirationCategory;
};

export type ServiceExpirationReport = Record<ServiceExpirationCategory, ServiceExpirationRow[]>;

export type EventParticipationFilters = {
  from?: string;
  to?: string;
  organization_id?: number;
  category_id?: number;
  location?: string;
  time_from?: string;
  time_to?: string;
  underutilized_below?: number;
};

export type EventUtilization = 'capacity_not_set' | 'full' | 'underutilized' | 'normal';

export type EventParticipationGroup = {
  event: {
    id: number;
    title: string;
  };
  category: {
    id: number | null;
    name?: string | null;
  };
  location?: string | null;
  day: string;
  time_interval: {
    from: string;
    to: string;
  };
  sessions: number;
  capacity: number | null;
  registrations: number;
  attendances: number;
  occupancy_percentage: number | null;
  utilization: EventUtilization;
};

export type EventParticipationReport = {
  underutilized_below: number;
  groups: EventParticipationGroup[];
};

function queryFrom(filters: object) {
  const query = new URLSearchParams();
  Object.entries(filters as Record<string, string | number | undefined>).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return query.toString();
}

async function downloadExport(exportId: string) {
  const response = await fetch(endpoint(`/reports/exports/${exportId}/download`), {
    headers: apiHeaders(),
  });
  if (!response.ok) {
    const payload = await parseJsonResponse(response);
    throw new Error(extractErrorMessage(payload, `Cererea a esuat (${response.status}).`));
  }
  return response.blob();
}

async function downloadFinancialDocument(document: FinancialDocument, format: 'pdf' | 'xml' = 'pdf') {
  const response = await fetch(endpoint(`/reports/financial-documents/${document.type}/${document.id}/download/${format}`), {
    headers: apiHeaders(),
  });
  if (!response.ok) {
    const payload = await parseJsonResponse(response);
    throw new Error(extractErrorMessage(payload, `Cererea a esuat (${response.status}).`));
  }
  return response.blob();
}

async function downloadFinancialDocuments(filters: FinancialReportFilters) {
  const query = queryFrom(filters);
  const response = await fetch(endpoint(`/reports/financial-documents/download${query ? `?${query}` : ''}`), {
    headers: apiHeaders(),
  });
  if (!response.ok) {
    const payload = await parseJsonResponse(response);
    throw new Error(extractErrorMessage(payload, `Cererea a esuat (${response.status}).`));
  }
  return response.blob();
}

async function downloadServiceExpirations(filters: ServiceExpirationFilters) {
  const query = queryFrom(filters);
  const response = await fetch(endpoint(`/reports/service-expirations/export${query ? `?${query}` : ''}`), {
    headers: apiHeaders(),
  });
  if (!response.ok) {
    const payload = await parseJsonResponse(response);
    throw new Error(extractErrorMessage(payload, `Cererea a esuat (${response.status}).`));
  }
  return response.blob();
}

export const reportingService = {
  getFinancialReport: (filters: FinancialReportFilters) => {
    const query = queryFrom(filters);
    return apiClient<FinancialReportAggregate>(`/reports/financial${query ? `?${query}` : ''}`);
  },
  getFinancialDocuments: (filters: FinancialReportFilters) => {
    const query = queryFrom(filters);
    return apiClient<FinancialDocument[]>(`/reports/financial-documents${query ? `?${query}` : ''}`);
  },
  getServiceExpirations: (filters: ServiceExpirationFilters) => {
    const query = queryFrom(filters);
    return apiClient<ServiceExpirationReport>(`/reports/service-expirations${query ? `?${query}` : ''}`);
  },
  getEventParticipation: (filters: EventParticipationFilters) => {
    const query = queryFrom(filters);
    return apiClient<EventParticipationReport>(`/reports/event-participation${query ? `?${query}` : ''}`);
  },
  createExport: (filters: FinancialReportFilters, format: ReportExportFormat) => {
    return apiClient<ReportExport>('/reports/financial/exports', {
      method: 'POST',
      body: JSON.stringify({ ...filters, format }),
    });
  },
  getExport: (exportId: string) => apiClient<ReportExport>(`/reports/exports/${exportId}`),
  downloadExport,
  downloadFinancialDocument,
  downloadFinancialDocuments,
  downloadServiceExpirations,
};
