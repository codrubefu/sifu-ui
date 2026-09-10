import { Activity, BarChart3, CalendarDays, Download, FileText, FileSpreadsheet, RefreshCw, Save, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Alert, Button, Input, SectionCard, Select } from '../../primitives';
import { useAuth } from '../../../context/useAuth';
import { erpApiService, type ApiLocation, type ApiUser } from '../../../services/ErpApiService';
import { eventService, type EventCategory } from '../../../services/eventService';
import {
  reportingService,
  type EventParticipationReport,
  type FinancialDocument,
  type FinancialReportAggregate,
  type FinancialReportFilters,
  type ReportExport,
  type ReportExportFormat,
  type ServiceAssignmentStatus,
  type ServiceExpirationCategory,
  type ServiceExpirationReport,
} from '../../../services/reportingService';
import { segmentsService, type Segment, type SegmentCriteria } from '../../../services/segmentsService';
import type { ReportsViewProps } from '../shared/types';
import { formatCurrency } from '../../../utils/erp/formatters';

type FinancialFilterForm = {
  from: string;
  to: string;
  location_id: string;
  admin_id: string;
  payment_type_id: string;
  status: string;
  service_type: string;
  group_by: 'day' | 'month';
  segment_id: string;
};

type ServiceExpirationFilterForm = {
  location_id: string;
  service_type: string;
  status: string;
  expires_in_days_from: string;
  expires_in_days_to: string;
  category: string;
};

type EventParticipationFilterForm = {
  from: string;
  to: string;
  category_id: string;
  location: string;
  time_from: string;
  time_to: string;
  underutilized_below: string;
};

type SegmentForm = {
  id: number | null;
  name: string;
  active: string;
  expired: boolean;
  expires_in_days: string;
  location_id: string;
  service_type: string;
};

type ReportSubmenu = 'summary' | 'payments' | 'serviceExpirations' | 'eventParticipation';

const emptyFinancialFilters: FinancialFilterForm = {
  from: '',
  to: '',
  location_id: '',
  admin_id: '',
  payment_type_id: '',
  status: '',
  service_type: '',
  group_by: 'month',
  segment_id: '',
};

const emptyServiceExpirationFilters: ServiceExpirationFilterForm = {
  location_id: '',
  service_type: '',
  status: '',
  expires_in_days_from: '',
  expires_in_days_to: '',
  category: '',
};

const emptyEventParticipationFilters: EventParticipationFilterForm = {
  from: '',
  to: '',
  category_id: '',
  location: '',
  time_from: '',
  time_to: '',
  underutilized_below: '50',
};

const emptySegmentForm: SegmentForm = {
  id: null,
  name: '',
  active: '',
  expired: false,
  expires_in_days: '',
  location_id: '',
  service_type: '',
};

const paymentStatuses = ['initiated', 'pending', 'confirmed', 'failed', 'refunded', 'cancelled'] as const;
const serviceStatuses: ServiceAssignmentStatus[] = ['pending', 'active', 'expired', 'suspended', 'consumed', 'reserved'];
const serviceExpirationCategories: ServiceExpirationCategory[] = ['expiring_soon', 'expired', 'suspended', 'not_renewed'];

function optionalNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function optionalInteger(value: string) {
  if (value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildFinancialFilters(form: FinancialFilterForm): FinancialReportFilters {
  return {
    from: form.from || undefined,
    to: form.to || undefined,
    location_id: optionalNumber(form.location_id),
    admin_id: optionalNumber(form.admin_id),
    payment_type_id: optionalNumber(form.payment_type_id) as 1 | 2 | 3 | undefined,
    status: form.status ? form.status as FinancialReportFilters['status'] : undefined,
    service_type: form.service_type ? form.service_type as FinancialReportFilters['service_type'] : undefined,
    group_by: form.group_by,
    segment_id: optionalNumber(form.segment_id),
  };
}

function segmentCriteriaFromForm(form: SegmentForm): SegmentCriteria {
  return {
    active: form.active === '' ? undefined : form.active === 'true',
    expired: form.expired ? true : undefined,
    expires_in_days: optionalNumber(form.expires_in_days),
    location_id: optionalNumber(form.location_id),
    service_type: form.service_type ? form.service_type as SegmentCriteria['service_type'] : undefined,
  };
}

function segmentFormFrom(segment: Segment): SegmentForm {
  return {
    id: segment.id,
    name: segment.name,
    active: typeof segment.criteria.active === 'boolean' ? String(segment.criteria.active) : '',
    expired: Boolean(segment.criteria.expired),
    expires_in_days: segment.criteria.expires_in_days ? String(segment.criteria.expires_in_days) : '',
    location_id: segment.criteria.location_id ? String(segment.criteria.location_id) : '',
    service_type: segment.criteria.service_type ?? '',
  };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function userLabel(user: ApiUser) {
  return `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email || `#${user.id}`;
}

function Kpi({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

export function ReportsView(props: ReportsViewProps) {
  void props;
  const { t } = useTranslation();
  const { hasAnyRight } = useAuth();
  const canViewReports = hasAnyRight(['reports.view', 'reports.manage']);
  const canExportReports = hasAnyRight(['reports.export', 'reports.manage']);
  const canViewSegments = hasAnyRight(['segments.view', 'segments.manage', 'reports.view', 'reports.manage']);
  const canManageSegments = hasAnyRight(['segments.manage']);

  const [activeSubmenu, setActiveSubmenu] = useState<ReportSubmenu>('summary');
  const [filters, setFilters] = useState<FinancialFilterForm>(emptyFinancialFilters);
  const [serviceFilters, setServiceFilters] = useState<ServiceExpirationFilterForm>(emptyServiceExpirationFilters);
  const [eventFilters, setEventFilters] = useState<EventParticipationFilterForm>(emptyEventParticipationFilters);
  const [locations, setLocations] = useState<ApiLocation[]>([]);
  const [admins, setAdmins] = useState<ApiUser[]>([]);
  const [eventCategories, setEventCategories] = useState<EventCategory[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [segmentsLoading, setSegmentsLoading] = useState(false);
  const [segmentError, setSegmentError] = useState('');
  const [segmentForm, setSegmentForm] = useState<SegmentForm>(emptySegmentForm);
  const [segmentMembers, setSegmentMembers] = useState<ApiUser[]>([]);
  const [segmentMembersLabel, setSegmentMembersLabel] = useState('');
  const [report, setReport] = useState<FinancialReportAggregate | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [documents, setDocuments] = useState<FinancialDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState('');
  const [documentDownloadKey, setDocumentDownloadKey] = useState<string | null>(null);
  const [exportRecord, setExportRecord] = useState<ReportExport | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState('');
  const [serviceExpirations, setServiceExpirations] = useState<ServiceExpirationReport | null>(null);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [serviceError, setServiceError] = useState('');
  const [eventParticipation, setEventParticipation] = useState<EventParticipationReport | null>(null);
  const [eventLoading, setEventLoading] = useState(false);
  const [eventError, setEventError] = useState('');

  const chartData = useMemo(() => report?.revenue_by_period ?? [], [report]);
  const serviceRows = useMemo(() => serviceExpirationCategories.flatMap((category) => serviceExpirations?.[category] ?? []), [serviceExpirations]);
  const eventTotals = useMemo(() => {
    const groups = eventParticipation?.groups ?? [];
    const occupancies = groups.map((group) => group.occupancy_percentage).filter((value): value is number => value !== null);
    return {
      sessions: groups.reduce((sum, group) => sum + group.sessions, 0),
      capacity: groups.reduce((sum, group) => sum + (group.capacity ?? 0), 0),
      registrations: groups.reduce((sum, group) => sum + group.registrations, 0),
      attendances: groups.reduce((sum, group) => sum + group.attendances, 0),
      occupancy: occupancies.length ? occupancies.reduce((sum, value) => sum + value, 0) / occupancies.length : null,
    };
  }, [eventParticipation]);

  const loadReport = useCallback(async () => {
    if (!canViewReports) return;
    setReportLoading(true);
    setReportError('');
    try {
      setReport(await reportingService.getFinancialReport(buildFinancialFilters(filters)));
    } catch (err) {
      setReport(null);
      setReportError(err instanceof Error ? err.message : t('reports.financialLoadError'));
    } finally {
      setReportLoading(false);
    }
  }, [canViewReports, filters, t]);

  const loadDocuments = useCallback(async () => {
    if (!canViewReports) return;
    setDocumentsLoading(true);
    setDocumentsError('');
    try {
      setDocuments(await reportingService.getFinancialDocuments(buildFinancialFilters(filters)));
    } catch (err) {
      setDocuments([]);
      setDocumentsError(err instanceof Error ? err.message : t('reports.documentsLoadError'));
    } finally {
      setDocumentsLoading(false);
    }
  }, [canViewReports, filters, t]);

  const loadSegments = useCallback(async () => {
    if (!canViewSegments) return;
    setSegmentsLoading(true);
    setSegmentError('');
    try {
      setSegments(await segmentsService.list());
    } catch (err) {
      setSegments([]);
      setSegmentError(err instanceof Error ? err.message : t('reports.segmentsLoadError'));
    } finally {
      setSegmentsLoading(false);
    }
  }, [canViewSegments, t]);

  const loadServiceExpirations = useCallback(async () => {
    if (!canViewReports) return;
    setServiceLoading(true);
    setServiceError('');
    try {
      setServiceExpirations(await reportingService.getServiceExpirations({
        location_id: optionalNumber(serviceFilters.location_id),
        service_type: serviceFilters.service_type ? serviceFilters.service_type as 'membership' | 'access_pass' : undefined,
        status: serviceFilters.status ? serviceFilters.status as ServiceAssignmentStatus : undefined,
        expires_in_days_from: optionalInteger(serviceFilters.expires_in_days_from),
        expires_in_days_to: optionalInteger(serviceFilters.expires_in_days_to),
        category: serviceFilters.category ? serviceFilters.category as ServiceExpirationCategory : undefined,
      }));
    } catch (err) {
      setServiceExpirations(null);
      setServiceError(err instanceof Error ? err.message : t('reports.serviceExpirationsLoadError'));
    } finally {
      setServiceLoading(false);
    }
  }, [canViewReports, serviceFilters, t]);

  const loadEventParticipation = useCallback(async () => {
    if (!canViewReports) return;
    setEventLoading(true);
    setEventError('');
    try {
      setEventParticipation(await reportingService.getEventParticipation({
        from: eventFilters.from || undefined,
        to: eventFilters.to || undefined,
        category_id: optionalNumber(eventFilters.category_id),
        location: eventFilters.location.trim() || undefined,
        time_from: eventFilters.time_from || undefined,
        time_to: eventFilters.time_to || undefined,
        underutilized_below: optionalInteger(eventFilters.underutilized_below),
      }));
    } catch (err) {
      setEventParticipation(null);
      setEventError(err instanceof Error ? err.message : t('reports.eventParticipationLoadError'));
    } finally {
      setEventLoading(false);
    }
  }, [canViewReports, eventFilters, t]);

  useEffect(() => {
    if (!canViewReports) return;
    void loadReport();
  }, [canViewReports, loadReport]);

  useEffect(() => {
    if (!canViewSegments) return;
    void loadSegments();
  }, [canViewSegments, loadSegments]);

  useEffect(() => {
    if (activeSubmenu === 'payments') void loadDocuments();
    if (activeSubmenu === 'serviceExpirations') void loadServiceExpirations();
    if (activeSubmenu === 'eventParticipation') void loadEventParticipation();
  }, [activeSubmenu, loadDocuments, loadEventParticipation, loadServiceExpirations]);

  useEffect(() => {
    Promise.all([
      erpApiService.list<ApiLocation>('locations', { per_page: 100 }).catch(() => []),
      erpApiService.list<ApiUser>('admins', { per_page: 100 }).catch(() => []),
      eventService.getCategories({ per_page: 100, is_active: '1' }).catch(() => ({ data: [] })),
    ]).then(([nextLocations, nextAdmins, nextCategories]) => {
      setLocations(nextLocations);
      setAdmins(nextAdmins);
      setEventCategories(Array.isArray(nextCategories) ? nextCategories : nextCategories.data ?? []);
    });
  }, []);

  const createExport = async (format: ReportExportFormat) => {
    setExportLoading(true);
    setExportError('');
    try {
      setExportRecord(await reportingService.createExport(buildFinancialFilters(filters), format));
    } catch (err) {
      setExportError(err instanceof Error ? err.message : t('reports.exportError'));
    } finally {
      setExportLoading(false);
    }
  };

  const downloadExport = async () => {
    if (!exportRecord) return;
    setExportLoading(true);
    setExportError('');
    try {
      downloadBlob(await reportingService.downloadExport(exportRecord.id), `financial-report.${exportRecord.format}`);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : t('reports.exportDownloadError'));
    } finally {
      setExportLoading(false);
    }
  };

  const downloadDocument = async (document: FinancialDocument, format: 'pdf' | 'xml' = 'pdf') => {
    const key = `${document.type}-${document.id}-${format}`;
    setDocumentDownloadKey(key);
    setDocumentsError('');
    try {
      downloadBlob(await reportingService.downloadFinancialDocument(document, format), format === 'xml' ? document.xml_filename ?? document.filename.replace(/\.pdf$/i, '.xml') : document.filename);
    } catch (err) {
      setDocumentsError(err instanceof Error ? err.message : t('reports.documentDownloadError'));
    } finally {
      setDocumentDownloadKey(null);
    }
  };

  const downloadAllDocuments = async () => {
    setDocumentDownloadKey('all');
    setDocumentsError('');
    try {
      downloadBlob(await reportingService.downloadFinancialDocuments(buildFinancialFilters(filters)), 'documente-financiare.zip');
    } catch (err) {
      setDocumentsError(err instanceof Error ? err.message : t('reports.documentsDownloadError'));
    } finally {
      setDocumentDownloadKey(null);
    }
  };

  const downloadServiceExpirations = async () => {
    setServiceLoading(true);
    setServiceError('');
    try {
      downloadBlob(await reportingService.downloadServiceExpirations({
        location_id: optionalNumber(serviceFilters.location_id),
        service_type: serviceFilters.service_type ? serviceFilters.service_type as 'membership' | 'access_pass' : undefined,
        status: serviceFilters.status ? serviceFilters.status as ServiceAssignmentStatus : undefined,
        expires_in_days_from: optionalInteger(serviceFilters.expires_in_days_from),
        expires_in_days_to: optionalInteger(serviceFilters.expires_in_days_to),
        category: serviceFilters.category ? serviceFilters.category as ServiceExpirationCategory : undefined,
      }), 'service-expirations.csv');
    } catch (err) {
      setServiceError(err instanceof Error ? err.message : t('reports.serviceExpirationsExportError'));
    } finally {
      setServiceLoading(false);
    }
  };

  const saveSegment = async () => {
    if (!segmentForm.name.trim()) {
      setSegmentError(t('reports.segmentNameRequired'));
      return;
    }
    setSegmentsLoading(true);
    setSegmentError('');
    try {
      const payload = { name: segmentForm.name.trim(), criteria: segmentCriteriaFromForm(segmentForm) };
      if (segmentForm.id) {
        await segmentsService.update(segmentForm.id, payload);
      } else {
        await segmentsService.create(payload);
      }
      setSegmentForm(emptySegmentForm);
      await loadSegments();
    } catch (err) {
      setSegmentError(err instanceof Error ? err.message : t('reports.segmentSaveError'));
    } finally {
      setSegmentsLoading(false);
    }
  };

  const deleteSegment = async (segment: Segment) => {
    if (!window.confirm(t('reports.segmentDeleteConfirm', { name: segment.name }))) return;
    setSegmentsLoading(true);
    setSegmentError('');
    try {
      await segmentsService.delete(segment.id);
      if (filters.segment_id === String(segment.id)) setFilters((prev) => ({ ...prev, segment_id: '' }));
      await loadSegments();
    } catch (err) {
      setSegmentError(err instanceof Error ? err.message : t('reports.segmentDeleteError'));
    } finally {
      setSegmentsLoading(false);
    }
  };

  const previewMembers = async (segment: Segment) => {
    setSegmentsLoading(true);
    setSegmentError('');
    try {
      const payload = await segmentsService.listMembers(segment.id, 15);
      setSegmentMembers(payload.data ?? []);
      setSegmentMembersLabel(segment.name);
    } catch (err) {
      setSegmentMembers([]);
      setSegmentError(err instanceof Error ? err.message : t('reports.segmentMembersError'));
    } finally {
      setSegmentsLoading(false);
    }
  };

  if (!canViewReports) {
    return <SectionCard title={t('reports.financialTitle')}><Alert>{t('reports.missingViewRight')}</Alert></SectionCard>;
  }

  return (
    <div className="space-y-6">
      <label className="block sm:hidden">
        <span className="mb-2 block text-sm font-semibold text-slate-700">{t('common.section', 'Sectiune')}</span>
        <select
          value={activeSubmenu}
          onChange={(event) => setActiveSubmenu(event.target.value as ReportSubmenu)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base font-semibold text-slate-800 shadow-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
        >
          <option value="summary">{t('reports.summaryTab')}</option>
          <option value="payments">{t('reports.paymentsTab')}</option>
        </select>
      </label>
      <div className="hidden flex-wrap gap-2 sm:flex">
        <Button onClick={() => setActiveSubmenu('summary')} variant={activeSubmenu === 'summary' ? 'primary' : undefined}><BarChart3 className="h-4 w-4" />{t('reports.summaryTab')}</Button>
        <Button onClick={() => setActiveSubmenu('payments')} variant={activeSubmenu === 'payments' ? 'primary' : undefined}><FileText className="h-4 w-4" />{t('reports.paymentsTab')}</Button>
        <Button onClick={() => setActiveSubmenu('serviceExpirations')} variant={activeSubmenu === 'serviceExpirations' ? 'primary' : undefined}><Activity className="h-4 w-4" />{t('reports.serviceExpirationsTab')}</Button>
        <Button onClick={() => setActiveSubmenu('eventParticipation')} variant={activeSubmenu === 'eventParticipation' ? 'primary' : undefined}><CalendarDays className="h-4 w-4" />{t('reports.eventParticipationTab')}</Button>
      </div>

      {activeSubmenu === 'summary' ? (
        <SectionCard title={t('reports.financialTitle')} action={<Button onClick={() => void loadReport()} disabled={reportLoading}><RefreshCw className="h-4 w-4" />{t('common.refresh')}</Button>}>
          {reportError ? <Alert tone="error" className="mb-4">{reportError}</Alert> : null}
          <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 lg:grid-cols-4">
            <Input label={t('reports.filters.from')} type="date" value={filters.from} onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))} />
            <Input label={t('reports.filters.to')} type="date" value={filters.to} onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))} />
            <Select label={t('reports.filters.groupBy')} value={filters.group_by} onChange={(event) => setFilters((prev) => ({ ...prev, group_by: event.target.value as FinancialFilterForm['group_by'] }))}>
              <option value="month">{t('reports.groupBy.month')}</option>
              <option value="day">{t('reports.groupBy.day')}</option>
            </Select>
            <Select label={t('reports.filters.status')} value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}>
              <option value="">{t('common.all')}</option>
              {paymentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </Select>
            <Select label={t('reports.filters.paymentType')} value={filters.payment_type_id} onChange={(event) => setFilters((prev) => ({ ...prev, payment_type_id: event.target.value }))}>
              <option value="">{t('common.all')}</option>
              <option value="1">Cash</option>
              <option value="2">Card</option>
              <option value="3">Bank transfer</option>
            </Select>
            <Select label={t('reports.filters.serviceType')} value={filters.service_type} onChange={(event) => setFilters((prev) => ({ ...prev, service_type: event.target.value }))}>
              <option value="">{t('common.all')}</option>
              <option value="membership">{t('services.types.membership')}</option>
              <option value="access_pass">{t('services.types.access_pass')}</option>
            </Select>
            <Select label={t('reports.filters.location')} value={filters.location_id} onChange={(event) => setFilters((prev) => ({ ...prev, location_id: event.target.value }))}>
              <option value="">{t('common.all')}</option>
              {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </Select>
            <Select label={t('reports.filters.admin')} value={filters.admin_id} onChange={(event) => setFilters((prev) => ({ ...prev, admin_id: event.target.value }))}>
              <option value="">{t('common.all')}</option>
              {admins.map((admin) => <option key={admin.id} value={admin.id}>{userLabel(admin)}</option>)}
            </Select>
            <Select label={t('reports.filters.segment')} value={filters.segment_id} onChange={(event) => setFilters((prev) => ({ ...prev, segment_id: event.target.value }))}>
              <option value="">{t('common.all')}</option>
              {segments.map((segment) => <option key={segment.id} value={segment.id}>{segment.name}</option>)}
            </Select>
            <div className="flex items-end gap-2 lg:col-span-3">
              <Button onClick={() => void loadReport()} disabled={reportLoading} variant="primary"><BarChart3 className="h-4 w-4" />{reportLoading ? t('common.loading') : t('reports.applyFilters')}</Button>
              <Button onClick={() => setFilters(emptyFinancialFilters)}>{t('users.resetFilters')}</Button>
            </div>
          </div>

          {report ? (
            <>
              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Kpi label={t('reports.kpis.confirmed')} value={formatCurrency(report.totals.confirmed)} helper={t('reports.kpis.transactions', { count: report.totals.count })} />
                <Kpi label={t('reports.kpis.refunded')} value={formatCurrency(report.totals.refunded)} />
                <Kpi label={t('reports.kpis.net')} value={formatCurrency(report.totals.net)} />
                <Kpi label={t('reports.kpis.renewals')} value={String(report.renewals)} />
                <Kpi label={t('reports.kpis.invoiced')} value={formatCurrency(report.receivables.invoiced)} helper={t('reports.receivables')} />
                <Kpi label={t('reports.kpis.paid')} value={formatCurrency(report.receivables.paid)} />
                <Kpi label={t('reports.kpis.outstanding')} value={formatCurrency(report.receivables.outstanding)} />
                <Kpi label={t('reports.kpis.unreconciled')} value={formatCurrency(report.bank_reconciliation.unreconciled)} helper={`${t('reports.kpis.reconciled')}: ${formatCurrency(report.bank_reconciliation.reconciled)}`} />
              </div>
              <div className="mt-5 h-72 rounded-lg border border-slate-200 bg-white p-4">
                {chartData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Bar dataKey="total" fill="#5b45f0" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-slate-500">{t('reports.noRevenue')}</p>}
              </div>
            </>
          ) : <p className="mt-5 text-sm text-slate-500">{reportLoading ? t('common.loading') : t('reports.noFinancialData')}</p>}
        </SectionCard>
      ) : null}

      {activeSubmenu === 'payments' ? (
        <SectionCard title={t('reports.paymentsDocumentsTitle')} action={<div className="flex flex-wrap gap-2"><Button onClick={() => void loadDocuments()} disabled={documentsLoading}><RefreshCw className="h-4 w-4" />{t('common.refresh')}</Button>{canExportReports ? <Button onClick={() => void downloadAllDocuments()} disabled={documentDownloadKey === 'all'} variant="primary"><Download className="h-4 w-4" />{t('reports.downloadAllDocuments')}</Button> : null}</div>}>
          {documentsError ? <Alert tone="error" className="mb-4">{documentsError}</Alert> : null}
          <div className="mb-5 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[180px_180px_auto]">
            <Input label={t('reports.filters.from')} type="date" value={filters.from} onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))} />
            <Input label={t('reports.filters.to')} type="date" value={filters.to} onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))} />
            <div className="flex items-end gap-2">
              <Button onClick={() => void loadDocuments()} disabled={documentsLoading} variant="primary"><FileText className="h-4 w-4" />{documentsLoading ? t('common.loading') : t('reports.applyFilters')}</Button>
              <Button onClick={() => setFilters(emptyFinancialFilters)}>{t('users.resetFilters')}</Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-left text-sm text-slate-700 [&_tbody_tr:nth-child(even)]:bg-slate-50/45">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="border-b border-slate-200 px-5 py-3">{t('reports.documentType')}</th><th className="border-b border-slate-200 px-4 py-3">{t('reports.documentNumber')}</th><th className="border-b border-slate-200 px-4 py-3">{t('events.date')}</th><th className="border-b border-slate-200 px-4 py-3">{t('payments.member')}</th><th className="border-b border-slate-200 px-4 py-3">{t('common.details')}</th><th className="border-b border-slate-200 px-4 py-3 text-right">{t('payments.amount')}</th><th className="border-b border-slate-200 px-5 py-3 text-right">{t('common.actions')}</th></tr></thead>
                <tbody>
                  {documents.length ? documents.map((document) => (
                    <tr key={`${document.type}-${document.id}`} className="border-b border-slate-100 transition-colors hover:bg-indigo-50/30">
                      <td className="px-5 py-3 font-medium text-slate-900">{document.type_label}</td><td className="px-4 py-3 text-slate-600">{document.number}</td><td className="px-4 py-3 text-slate-600">{document.date}</td><td className="px-4 py-3 text-slate-600">{document.member || '-'}</td><td className="px-4 py-3 text-slate-600">{document.description}</td><td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(document.amount, document.currency ?? 'RON')}</td>
                      <td className="px-5 py-3 text-right">{canExportReports ? <Button onClick={() => void downloadDocument(document, 'pdf')} disabled={documentDownloadKey === `${document.type}-${document.id}-pdf`} size="sm"><Download className="h-4 w-4" />PDF</Button> : null}{canExportReports && document.type === 'invoice' ? <Button onClick={() => void downloadDocument(document, 'xml')} disabled={documentDownloadKey === `${document.type}-${document.id}-xml`} size="sm"><Download className="h-4 w-4" />XML</Button> : null}</td>
                    </tr>
                  )) : <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">{documentsLoading ? t('common.loading') : t('reports.noDocuments')}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </SectionCard>
      ) : null}

      {activeSubmenu === 'serviceExpirations' ? (
        <SectionCard title={t('reports.serviceExpirationsTitle')} action={<div className="flex flex-wrap gap-2"><Button onClick={() => void loadServiceExpirations()} disabled={serviceLoading}><RefreshCw className="h-4 w-4" />{t('common.refresh')}</Button>{canExportReports ? <Button onClick={() => void downloadServiceExpirations()} disabled={serviceLoading} variant="primary"><Download className="h-4 w-4" />CSV</Button> : null}</div>}>
          {serviceError ? <Alert tone="error" className="mb-4">{serviceError}</Alert> : null}
          <div className="mb-5 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 lg:grid-cols-4">
            <Select label={t('reports.filters.location')} value={serviceFilters.location_id} onChange={(event) => setServiceFilters((prev) => ({ ...prev, location_id: event.target.value }))}><option value="">{t('common.all')}</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</Select>
            <Select label={t('reports.filters.serviceType')} value={serviceFilters.service_type} onChange={(event) => setServiceFilters((prev) => ({ ...prev, service_type: event.target.value }))}><option value="">{t('common.all')}</option><option value="membership">{t('services.types.membership')}</option><option value="access_pass">{t('services.types.access_pass')}</option></Select>
            <Select label={t('reports.filters.assignmentStatus')} value={serviceFilters.status} onChange={(event) => setServiceFilters((prev) => ({ ...prev, status: event.target.value }))}><option value="">{t('common.all')}</option>{serviceStatuses.map((status) => <option key={status} value={status}>{t(`services.assignmentStatuses.${status}`)}</option>)}</Select>
            <Select label={t('reports.filters.expirationCategory')} value={serviceFilters.category} onChange={(event) => setServiceFilters((prev) => ({ ...prev, category: event.target.value }))}><option value="">{t('common.all')}</option>{serviceExpirationCategories.map((category) => <option key={category} value={category}>{t(`reports.serviceExpirationCategories.${category}`)}</option>)}</Select>
            <Input label={t('reports.filters.daysFrom')} type="number" value={serviceFilters.expires_in_days_from} onChange={(event) => setServiceFilters((prev) => ({ ...prev, expires_in_days_from: event.target.value }))} />
            <Input label={t('reports.filters.daysTo')} type="number" value={serviceFilters.expires_in_days_to} onChange={(event) => setServiceFilters((prev) => ({ ...prev, expires_in_days_to: event.target.value }))} />
            <div className="flex items-end gap-2 lg:col-span-2"><Button onClick={() => void loadServiceExpirations()} disabled={serviceLoading} variant="primary"><Activity className="h-4 w-4" />{serviceLoading ? t('common.loading') : t('reports.applyFilters')}</Button><Button onClick={() => setServiceFilters(emptyServiceExpirationFilters)}>{t('users.resetFilters')}</Button></div>
          </div>
          {serviceExpirations ? <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">{serviceExpirationCategories.map((category) => <Kpi key={category} label={t(`reports.serviceExpirationCategories.${category}`)} value={String(serviceExpirations[category]?.length ?? 0)} />)}</div> : null}
          <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[1120px] w-full text-left text-sm text-slate-700 [&_tbody_tr:nth-child(even)]:bg-slate-50/45">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="border-b border-slate-200 px-5 py-3">{t('payments.member')}</th><th className="border-b border-slate-200 px-4 py-3">{t('members.phone')}</th><th className="border-b border-slate-200 px-4 py-3">{t('services.service')}</th><th className="border-b border-slate-200 px-4 py-3">{t('services.type')}</th><th className="border-b border-slate-200 px-4 py-3">{t('common.status')}</th><th className="border-b border-slate-200 px-4 py-3">{t('users.startDate')}</th><th className="border-b border-slate-200 px-4 py-3">{t('users.expires')}</th><th className="border-b border-slate-200 px-4 py-3 text-right">{t('reports.daysUntilExpiration')}</th><th className="border-b border-slate-200 px-5 py-3">{t('reports.lastNotification')}</th></tr></thead>
                <tbody>{serviceRows.length ? serviceRows.map((row) => <tr key={`${row.category}-${row.assignment_id}`} className="border-b border-slate-100 transition-colors hover:bg-indigo-50/30"><td className="px-5 py-3 font-medium text-slate-900">{row.member_name || `#${row.user_id}`}</td><td className="px-4 py-3 text-slate-600">{row.phone || '-'}</td><td className="px-4 py-3 text-slate-600">{row.service_name}</td><td className="px-4 py-3 text-slate-600">{t(`services.types.${row.service_type}`, row.service_type)}</td><td className="px-4 py-3 text-slate-600">{t(`services.assignmentStatuses.${row.status}`, row.status)}</td><td className="px-4 py-3 text-slate-600">{row.start_date || '-'}</td><td className="px-4 py-3 text-slate-600">{row.expires_at || '-'}</td><td className="px-4 py-3 text-right font-semibold text-slate-900">{row.days_until_expiration ?? '-'}</td><td className="px-5 py-3 text-slate-600">{row.last_notification_at || '-'}</td></tr>) : <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-500">{serviceLoading ? t('common.loading') : t('reports.noServiceExpirations')}</td></tr>}</tbody>
              </table>
            </div>
          </div>
        </SectionCard>
      ) : null}

      {activeSubmenu === 'eventParticipation' ? (
        <SectionCard title={t('reports.eventParticipationTitle')} action={<Button onClick={() => void loadEventParticipation()} disabled={eventLoading}><RefreshCw className="h-4 w-4" />{t('common.refresh')}</Button>}>
          {eventError ? <Alert tone="error" className="mb-4">{eventError}</Alert> : null}
          <div className="mb-5 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 lg:grid-cols-4">
            <Input label={t('reports.filters.from')} type="date" value={eventFilters.from} onChange={(event) => setEventFilters((prev) => ({ ...prev, from: event.target.value }))} />
            <Input label={t('reports.filters.to')} type="date" value={eventFilters.to} onChange={(event) => setEventFilters((prev) => ({ ...prev, to: event.target.value }))} />
            <Select label={t('events.eventCategories')} value={eventFilters.category_id} onChange={(event) => setEventFilters((prev) => ({ ...prev, category_id: event.target.value }))}><option value="">{t('common.all')}</option>{eventCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select>
            <Input label={t('reports.filters.eventLocation')} value={eventFilters.location} onChange={(event) => setEventFilters((prev) => ({ ...prev, location: event.target.value }))} />
            <Input label={t('reports.filters.timeFrom')} type="time" value={eventFilters.time_from} onChange={(event) => setEventFilters((prev) => ({ ...prev, time_from: event.target.value }))} />
            <Input label={t('reports.filters.timeTo')} type="time" value={eventFilters.time_to} onChange={(event) => setEventFilters((prev) => ({ ...prev, time_to: event.target.value }))} />
            <Input label={t('reports.filters.underutilizedBelow')} type="number" min="0" max="100" value={eventFilters.underutilized_below} onChange={(event) => setEventFilters((prev) => ({ ...prev, underutilized_below: event.target.value }))} />
            <div className="flex items-end gap-2"><Button onClick={() => void loadEventParticipation()} disabled={eventLoading} variant="primary"><CalendarDays className="h-4 w-4" />{eventLoading ? t('common.loading') : t('reports.applyFilters')}</Button><Button onClick={() => setEventFilters(emptyEventParticipationFilters)}>{t('users.resetFilters')}</Button></div>
          </div>
          {eventParticipation ? <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5"><Kpi label={t('reports.eventParticipationKpis.sessions')} value={String(eventTotals.sessions)} /><Kpi label={t('reports.eventParticipationKpis.capacity')} value={String(eventTotals.capacity)} /><Kpi label={t('reports.eventParticipationKpis.registrations')} value={String(eventTotals.registrations)} /><Kpi label={t('reports.eventParticipationKpis.attendances')} value={String(eventTotals.attendances)} /><Kpi label={t('reports.eventParticipationKpis.averageOccupancy')} value={eventTotals.occupancy === null ? '-' : `${eventTotals.occupancy.toFixed(2)}%`} /></div> : null}
          <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[1220px] w-full text-left text-sm text-slate-700 [&_tbody_tr:nth-child(even)]:bg-slate-50/45">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="border-b border-slate-200 px-5 py-3">{t('events.event')}</th><th className="border-b border-slate-200 px-4 py-3">{t('events.date')}</th><th className="border-b border-slate-200 px-4 py-3">{t('reports.timeInterval')}</th><th className="border-b border-slate-200 px-4 py-3">{t('events.eventCategories')}</th><th className="border-b border-slate-200 px-4 py-3">{t('reports.filters.eventLocation')}</th><th className="border-b border-slate-200 px-4 py-3 text-right">{t('reports.eventParticipationKpis.sessions')}</th><th className="border-b border-slate-200 px-4 py-3 text-right">{t('reports.eventParticipationKpis.capacity')}</th><th className="border-b border-slate-200 px-4 py-3 text-right">{t('reports.eventParticipationKpis.registrations')}</th><th className="border-b border-slate-200 px-4 py-3 text-right">{t('reports.eventParticipationKpis.attendances')}</th><th className="border-b border-slate-200 px-4 py-3 text-right">{t('reports.occupancy')}</th><th className="border-b border-slate-200 px-5 py-3">{t('reports.utilization')}</th></tr></thead>
                <tbody>{eventParticipation?.groups.length ? eventParticipation.groups.map((group) => <tr key={`${group.event.id}-${group.category.id ?? 'none'}-${group.location ?? ''}-${group.day}-${group.time_interval.from}`} className="border-b border-slate-100 transition-colors hover:bg-indigo-50/30"><td className="px-5 py-3 font-medium text-slate-900">{group.event.title}</td><td className="px-4 py-3 text-slate-600">{group.day}</td><td className="px-4 py-3 text-slate-600">{group.time_interval.from} - {group.time_interval.to}</td><td className="px-4 py-3 text-slate-600">{group.category.name || t('reports.noCategory')}</td><td className="px-4 py-3 text-slate-600">{group.location || '-'}</td><td className="px-4 py-3 text-right text-slate-600">{group.sessions}</td><td className="px-4 py-3 text-right text-slate-600">{group.capacity ?? '-'}</td><td className="px-4 py-3 text-right text-slate-600">{group.registrations}</td><td className="px-4 py-3 text-right text-slate-600">{group.attendances}</td><td className="px-4 py-3 text-right font-semibold text-slate-900">{group.occupancy_percentage === null ? '-' : `${group.occupancy_percentage}%`}</td><td className="px-5 py-3 text-slate-600">{t(`reports.utilizationStatuses.${group.utilization}`)}</td></tr>) : <tr><td colSpan={11} className="px-4 py-10 text-center text-sm text-slate-500">{eventLoading ? t('common.loading') : t('reports.noEventParticipation')}</td></tr>}</tbody>
              </table>
            </div>
          </div>
        </SectionCard>
      ) : null}

      {activeSubmenu === 'summary' && canExportReports ? (
        <SectionCard title={t('reports.exports')} action={<div className="flex flex-wrap gap-2"><Button onClick={() => void createExport('csv')} disabled={exportLoading}><FileSpreadsheet className="h-4 w-4" />CSV</Button><Button onClick={() => void createExport('xlsx')} disabled={exportLoading}>XLSX</Button></div>}>
          {exportError ? <Alert tone="error" className="mb-4">{exportError}</Alert> : null}
          {exportRecord ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm"><div><p className="font-semibold text-slate-900">#{exportRecord.id}</p><p className="text-slate-600">{exportRecord.format.toUpperCase()} - {exportRecord.status}{exportRecord.error ? ` - ${exportRecord.error}` : ''}</p></div><div className="flex flex-wrap gap-2"><Button onClick={() => reportingService.getExport(exportRecord.id).then(setExportRecord).catch((err) => setExportError(err instanceof Error ? err.message : t('reports.exportStatusError')))} disabled={exportLoading}><RefreshCw className="h-4 w-4" />{t('reports.refreshExport')}</Button>{exportRecord.status === 'completed' ? <Button onClick={() => void downloadExport()} disabled={exportLoading} variant="primary"><Download className="h-4 w-4" />{t('reports.downloadExport')}</Button> : null}</div></div> : <p className="text-sm text-slate-500">{t('reports.noExport')}</p>}
        </SectionCard>
      ) : null}

      {activeSubmenu === 'summary' && canViewSegments ? (
        <SectionCard title={t('reports.segments')} action={<Button onClick={() => void loadSegments()} disabled={segmentsLoading}><RefreshCw className="h-4 w-4" />{t('common.refresh')}</Button>}>
          {segmentError ? <Alert tone="error" className="mb-4">{segmentError}</Alert> : null}
          {canManageSegments ? (
            <div className="mb-5 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 lg:grid-cols-4">
              <Input label={t('reports.segmentName')} value={segmentForm.name} onChange={(event) => setSegmentForm((prev) => ({ ...prev, name: event.target.value }))} />
              <Select label={t('reports.criteria.active')} value={segmentForm.active} onChange={(event) => setSegmentForm((prev) => ({ ...prev, active: event.target.value }))}>
                <option value="">{t('common.all')}</option>
                <option value="true">{t('users.statusActive')}</option>
                <option value="false">{t('users.statusInactive')}</option>
              </Select>
              <Input label={t('reports.criteria.expiresInDays')} type="number" min="0" value={segmentForm.expires_in_days} onChange={(event) => setSegmentForm((prev) => ({ ...prev, expires_in_days: event.target.value }))} />
              <Select label={t('reports.criteria.location')} value={segmentForm.location_id} onChange={(event) => setSegmentForm((prev) => ({ ...prev, location_id: event.target.value }))}>
                <option value="">{t('common.all')}</option>
                {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
              </Select>
              <Select label={t('reports.criteria.serviceType')} value={segmentForm.service_type} onChange={(event) => setSegmentForm((prev) => ({ ...prev, service_type: event.target.value }))}>
                <option value="">{t('common.all')}</option>
                <option value="membership">{t('services.types.membership')}</option>
                <option value="access_pass">{t('services.types.access_pass')}</option>
              </Select>
              <label className="flex h-10 items-center gap-3 self-end rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={segmentForm.expired} onChange={(event) => setSegmentForm((prev) => ({ ...prev, expired: event.target.checked }))} className="h-4 w-4 accent-indigo-600" />
                {t('reports.criteria.expired')}
              </label>
              <div className="flex items-end gap-2 lg:col-span-2">
                <Button onClick={() => void saveSegment()} disabled={segmentsLoading} variant="primary"><Save className="h-4 w-4" />{segmentForm.id ? t('common.save') : t('common.add')}</Button>
                <Button onClick={() => setSegmentForm(emptySegmentForm)}>{t('common.cancel')}</Button>
              </div>
            </div>
          ) : null}
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-left text-sm text-slate-700 [&_tbody_tr:nth-child(even)]:bg-slate-50/45">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="border-b border-slate-200 px-5 py-3">{t('reports.segmentName')}</th><th className="border-b border-slate-200 px-4 py-3">{t('reports.criteria.title')}</th><th className="border-b border-slate-200 px-5 py-3 text-right">{t('common.actions')}</th></tr></thead>
                <tbody>
                  {segments.length ? segments.map((segment) => (
                    <tr key={segment.id} className="border-b border-slate-100 align-top transition-colors hover:bg-indigo-50/30">
                      <td className="px-5 py-3 font-semibold text-slate-900">{segment.name}</td>
                      <td className="px-4 py-3 text-slate-600"><pre className="whitespace-pre-wrap font-mono text-xs">{JSON.stringify(segment.criteria, null, 2)}</pre></td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button onClick={() => {
                            const nextFilters = { ...filters, segment_id: String(segment.id) };
                            setFilters(nextFilters);
                            setReportLoading(true);
                            setReportError('');
                            reportingService.getFinancialReport(buildFinancialFilters(nextFilters)).then(setReport).catch((err) => {
                              setReport(null);
                              setReportError(err instanceof Error ? err.message : t('reports.financialLoadError'));
                            }).finally(() => setReportLoading(false));
                          }} size="sm">{t('reports.useSegment')}</Button>
                          <Button onClick={() => void previewMembers(segment)} size="sm">{t('reports.previewMembers')}</Button>
                          {canManageSegments ? <Button onClick={() => setSegmentForm(segmentFormFrom(segment))} size="sm">{t('common.edit')}</Button> : null}
                          {canManageSegments ? <Button onClick={() => void deleteSegment(segment)} size="sm" variant="danger"><Trash2 className="h-4 w-4" />{t('common.delete')}</Button> : null}
                        </div>
                      </td>
                    </tr>
                  )) : <tr><td colSpan={3} className="px-4 py-10 text-center text-sm text-slate-500">{segmentsLoading ? t('common.loading') : t('reports.noSegments')}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          {segmentMembersLabel ? (
            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">{t('reports.previewFor', { name: segmentMembersLabel })}</h3>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                {segmentMembers.length ? segmentMembers.map((member) => <div key={member.id} className="rounded-lg bg-white px-3 py-2 text-sm text-slate-700">{userLabel(member)}<p className="text-xs text-slate-500">{member.email}</p></div>) : <p className="text-sm text-slate-500">{t('reports.noSegmentMembers')}</p>}
              </div>
            </div>
          ) : null}
        </SectionCard>
      ) : null}
    </div>
  );
}
