import { ChevronLeft, ChevronRight, Download, Edit3, Eye, EyeOff, FileText, Filter, MoreVertical, Plus, RefreshCw, Save, ScanLine, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, Input, SectionCard, StatusBadge, SuccessMessage, Textarea } from '../../primitives';
import { erpApiService, type ApiActivity, type ApiCustomField, type ApiCustomFieldValue, type ApiCustomFieldValues, type ApiGrade, type ApiGroup, type ApiLocation, type ApiPaginated, type ApiPayment, type ApiService, type ApiUser, type ApiUserEvent, type ApiUserGrade, type ApiUserService, type ApiUserServiceAssignment, type ServiceAssignmentStatus } from '../../../services/ErpApiService';
import { PageShell } from '../shared/PageShell';
import { PaymentPopup, type PaymentPopupValues } from '../payments/PaymentPopup';
import { serviceLifecycleService } from '../../../services/serviceLifecycleService';
import { useAuth } from '../../../context/useAuth';
import { PrivacyPanel } from '../profile/PrivacyPanel';
import { UserDocumentsPanel } from './UserDocumentsPanel';
import { formatDeviceDate, formatDeviceDateTime } from '../../../utils/erp/formatters';

type UserFormTab = 'details' | 'code' | 'information' | 'groups' | 'locations' | 'services' | 'grades' | 'events' | 'documents' | 'privacy' | 'activity';

type UserForm = {
  user_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  parent_user_id: string;
  active: boolean;
  notification_consents: {
    sms: boolean;
    mail: boolean;
  };
  group_ids: string;
  location_ids: string;
  services: ApiUserServiceAssignment[];
  custom_fields: Record<string, unknown>;
};

type ServicePaymentForm = {
  id: number | null;
  first_name: string;
  last_name: string;
  service_id: string;
  service_reference: string;
  service_name: string;
  service_description: string;
  amount: string;
  currency: string;
  payment_type_id: string;
  paid_at: string;
};

export type UserManagementViewProps = {
  resource: string;
  title?: string;
  addLabel?: string;
  countLabel?: string;
  singularLabel?: string;
  entityLabel?: string;
  newEntityLabel?: string;
  showGroupsInList?: boolean;
  useRelationTabs?: boolean;
};

const emptyForm: UserForm = {
  user_code: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  parent_user_id: '',
  active: true,
  notification_consents: { sms: false, mail: false },
  group_ids: '',
  location_ids: '',
  services: [],
  custom_fields: {},
};

const emptyPaymentForm: ServicePaymentForm = {
  id: null,
  first_name: '',
  last_name: '',
  service_id: '',
  service_reference: '',
  service_name: '',
  service_description: '',
  amount: '',
  currency: '',
  payment_type_id: '',
  paid_at: '',
};

function toIdList(value: string) {
  return value
    .split(',')
    .map((part) => Number(part.trim()))
    .filter(Boolean);
}

function relationIds(items?: Array<{ id?: number }>) {
  return items?.map((item) => item.id).filter(Boolean).join(', ') ?? '';
}

function relationLabels(items?: Array<{ id?: number; label?: string; name?: string }>) {
  if (!items?.length) return '-';
  return items.map((item) => item.label || item.name || `#${item.id}`).join(', ');
}

function mergeById<T extends { id?: number }>(...groups: Array<T[] | undefined>) {
  const items = new Map<number, T>();
  groups.flatMap((group) => group ?? []).forEach((item) => {
    if (item.id) items.set(item.id, { ...items.get(item.id), ...item });
  });
  return Array.from(items.values());
}

function selectedIds(value: string) {
  return toIdList(value).map(String);
}

function idsFromSelect(options: HTMLCollectionOf<HTMLOptionElement>) {
  return Array.from(options)
    .filter((option) => option.selected)
    .map((option) => option.value)
    .join(', ');
}

function toggleId(value: string, id: number, checked: boolean) {
  const ids = new Set(toIdList(value));
  if (checked) {
    ids.add(id);
  } else {
    ids.delete(id);
  }
  return Array.from(ids).join(', ');
}

function toggleIds(value: string, idsToToggle: number[], checked: boolean) {
  const ids = new Set(toIdList(value));
  idsToToggle.forEach((id) => {
    if (checked) {
      ids.add(id);
    } else {
      ids.delete(id);
    }
  });
  return Array.from(ids).join(', ');
}

function userName(user: ApiUser) {
  return `${user.last_name ?? ''} ${user.first_name ?? ''}`.trim() || user.email || `#${user.id}`;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
  return formatDeviceDate(value);
}

function normalizeDateInput(value: string) {
  const trimmed = value.trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/.exec(trimmed);
  const localMatch = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(trimmed);
  const match = isoMatch
    ? { year: Number(isoMatch[1]), month: Number(isoMatch[2]), day: Number(isoMatch[3]) }
    : localMatch
      ? { year: Number(localMatch[3]), month: Number(localMatch[2]), day: Number(localMatch[1]) }
      : null;

  if (!match) return '';

  const date = new Date(match.year, match.month - 1, match.day);
  if (
    date.getFullYear() !== match.year
    || date.getMonth() !== match.month - 1
    || date.getDate() !== match.day
  ) {
    return '';
  }

  return [
    String(match.year).padStart(4, '0'),
    String(match.month).padStart(2, '0'),
    String(match.day).padStart(2, '0'),
  ].join('-');
}

function DateWithTextInput({
  label,
  value,
  disabled,
  inline = false,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  inline?: boolean;
  onChange: (value: string) => void;
}) {
  const normalizedValue = normalizeDateInput(value);

  return (
    <div className={inline ? 'grid grid-cols-1 gap-2 sm:grid-cols-2' : 'grid grid-cols-1 gap-2'}>
      <Input
        label={label}
        type="date"
        value={normalizedValue}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
    </div>
  );
}

function currentDateTimeLocal() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function dateTimeLocalToApi(value: string) {
  if (!value) return '';
  return value.length === 16 ? `${value.replace('T', ' ')}:00` : value.replace('T', ' ');
}

function apiDateTimeToLocal(value?: string | null) {
  if (!value) return '';
  return value.replace(' ', 'T').slice(0, 16);
}

function amountFromService(service?: ApiService | ApiUserService | null) {
  if (service?.price === undefined || service.price === null) return '';
  return String(service.price);
}

function moneyToCents(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}

function centsToMoney(value: number) {
  return Number((value / 100).toFixed(2));
}

function payablePayment(payment: ApiPayment) {
  return !['failed', 'refunded', 'cancelled'].includes(payment.status ?? '');
}

function paymentFormFromSelection(form: UserForm, service?: ApiService | ApiUserService | null): ServicePaymentForm {
  if (!service) {
    return {
      ...emptyPaymentForm,
      first_name: form.first_name,
      last_name: form.last_name,
      paid_at: currentDateTimeLocal(),
    };
  }

  return {
    id: null,
    first_name: form.first_name,
    last_name: form.last_name,
    service_id: String(service.id),
    service_reference: String(service.id),
    service_name: service.name ?? '',
    service_description: service.description ?? '',
    amount: amountFromService(service),
    currency: service.currency ?? '',
    payment_type_id: '',
    paid_at: currentDateTimeLocal(),
  };
}

function paymentFormFromPayment(payment: ApiPayment, form: UserForm, service?: ApiService | ApiUserService | null): ServicePaymentForm {
  return {
    id: payment.id,
    first_name: payment.first_name ?? form.first_name,
    last_name: payment.last_name ?? form.last_name,
    service_id: String(payment.service_id ?? service?.id ?? ''),
    service_reference: String(payment.service_id ?? service?.id ?? ''),
    service_name: service?.name ?? payment.service?.name ?? '',
    service_description: service?.description ?? payment.service?.description ?? '',
    amount: String(payment.amount ?? ''),
    currency: service?.currency ?? payment.service?.currency ?? '',
    payment_type_id: String(payment.payment_type_id ?? ''),
    paid_at: apiDateTimeToLocal(payment.paid_at),
  };
}

function paymentPopupValuesFromServiceForm(form: ServicePaymentForm): PaymentPopupValues {
  return {
    first_name: form.first_name,
    last_name: form.last_name,
    amount: form.amount,
    currency: form.currency,
    payment_type_id: form.payment_type_id,
    paid_at: form.paid_at,
    reference_id: form.service_id,
    reference_label: 'Service ID',
    reference_name: form.service_name,
    reference_description: form.service_description,
  };
}

function paymentMethodLabel(payment: ApiPayment) {
  if (payment.payment_type_id === 1) return 'Cash';
  if (payment.payment_type_id === 2) return 'Card';
  if (payment.payment_type_id === 3) return 'Bank transfer';
  return payment.payment_type ?? '-';
}

function serviceAssignmentsFromUser(user: ApiUser): ApiUserServiceAssignment[] {
  const source = mergeById(user.services, user.active_services);

  return source.map((service) => {
    const historyItem = user.service_history?.find((item) => item.service_id === service.id);
    return {
      id: service.id,
      start_date: historyItem?.start_date ?? service.start_date ?? service.pivot?.start_date ?? todayDate(),
      service_user_id: service.pivot?.id ?? historyItem?.id ?? null,
      invoice_number: historyItem?.invoice_number ?? service.invoice_number ?? service.pivot?.invoice_number ?? null,
      bill_number: historyItem?.bill_number ?? service.bill_number ?? service.pivot?.bill_number ?? null,
      status: historyItem?.status ?? service.status ?? service.pivot?.status ?? null,
      expires_at: historyItem?.expires_at ?? service.expires_at ?? service.pivot?.expires_at ?? null,
      accesses_used: historyItem?.accesses_used ?? service.accesses_used ?? service.pivot?.accesses_used ?? null,
      suspended_at: historyItem?.suspended_at ?? service.suspended_at ?? service.pivot?.suspended_at ?? null,
      resume_at: historyItem?.resume_at ?? service.resume_at ?? service.pivot?.resume_at ?? null,
      status_reason: historyItem?.status_reason ?? service.status_reason ?? service.pivot?.status_reason ?? null,
      activation_payment_id: historyItem?.activation_payment_id ?? service.activation_payment_id ?? service.pivot?.activation_payment_id ?? null,
    };
  }) ?? [];
}

function serviceUserIdForAssignment(
  assignment: ApiUserServiceAssignment | undefined,
  user: ApiUser | null,
  service?: ApiService | ApiUserService | null,
) {
  if (assignment?.service_user_id) return assignment.service_user_id;
  if (service?.pivot?.id) return service.pivot.id;
  const serviceId = assignment?.id ?? service?.id;
  if (!serviceId || !user) return null;
  const userService = mergeById(user.services, user.active_services).find((item) => item.id === serviceId);
  const historyItem = user.service_history?.find((item) => item.service_id === serviceId && item.id);
  return userService?.pivot?.id ?? historyItem?.id ?? null;
}

function hasActiveService(user: ApiUser) {
  return user.has_active_service ?? Boolean(user.active_services?.length);
}

function addDays(date: string | undefined, days: number | null | undefined) {
  if (!date || !days) return null;
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setDate(parsed.getDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function serviceStartDate(service?: ApiService | ApiUserService | null) {
  return service?.start_date ?? service?.pivot?.start_date ?? null;
}

function serviceExpiresAt(service?: ApiService | ApiUserService | null) {
  return service?.expires_at ?? service?.pivot?.expires_at ?? null;
}

function serviceIsActive(user: ApiUser | null, serviceId: number, fallback?: ApiService | ApiUserService | null) {
  if (user?.active_services?.some((service) => service.id === serviceId)) return true;
  if (fallback?.status) return fallback.status === 'active';
  if (fallback?.pivot?.status) return fallback.pivot.status === 'active';
  if (fallback?.is_currently_active !== undefined) return fallback.is_currently_active;
  if (fallback?.pivot?.is_active !== undefined) return fallback.pivot.is_active;
  if (fallback?.expires_at) return fallback.expires_at >= todayDate();
  if (fallback?.pivot?.expires_at) return fallback.pivot.expires_at >= todayDate();
  return fallback?.is_active ?? true;
}

function serviceAssignmentStatus(service?: ApiService | ApiUserService | null, assignment?: ApiUserServiceAssignment): ServiceAssignmentStatus | null {
  return assignment?.status ?? service?.status ?? service?.pivot?.status ?? null;
}

function assignmentValue<T>(
  assignment: ApiUserServiceAssignment | undefined,
  service: ApiService | ApiUserService | null | undefined,
  field: 'accesses_used' | 'suspended_at' | 'resume_at' | 'status_reason' | 'activation_payment_id' | 'expires_at',
): T | null {
  return (assignment?.[field] ?? service?.[field] ?? service?.pivot?.[field] ?? null) as T | null;
}

function assignmentStatusLabel(status: ServiceAssignmentStatus | null | undefined, t: ReturnType<typeof useTranslation>['t']) {
  return status ? t(`services.assignmentStatuses.${status}`) : '-';
}

function serviceHistoryRows(user: ApiUser | null) {
  if (!user) return [];
  const currentStatuses: Array<ServiceAssignmentStatus | undefined | null> = ['active', 'reserved', 'pending'];
  if (user.service_history?.length) {
    return user.service_history.filter((item) => !currentStatuses.includes(item.status) && !item.is_currently_active);
  }

  return mergeById(user.services, user.active_services).map((service) => ({
    id: service.pivot?.id ?? null,
    service_id: service.id,
    name: service.name,
    start_date: serviceStartDate(service),
    expires_at: serviceExpiresAt(service),
    status: serviceAssignmentStatus(service),
    is_active: serviceIsActive(user, service.id, service),
  })).filter((item) => !currentStatuses.includes(item.status) && !item.is_active);
}

function userServiceLabels(user: ApiUser) {
  return relationLabels(mergeById(user.services, user.active_services));
}

function buildPayload(form: UserForm) {
  const payload: Record<string, unknown> = {
    user_code: form.user_code.trim() || null,
    first_name: form.first_name,
    last_name: form.last_name,
    email: form.email || null,
    phone: form.phone || null,
    parent_user_id: form.parent_user_id ? Number(form.parent_user_id) : null,
    notification_consents: form.notification_consents,
    active: form.active,
    group_ids: toIdList(form.group_ids),
    location_ids: toIdList(form.location_ids),
    services: form.services.map((service) => ({
      id: service.id,
      start_date: service.start_date || todayDate(),
    })),
  };

  return payload;
}

function buildCreatePayload(form: UserForm, includeCustomFields: boolean) {
  return {
    ...buildPayload(form),
    ...(includeCustomFields ? { custom_fields: form.custom_fields } : {}),
  };
}

function customFieldValuesFromUser(user: ApiUser) {
  const source = user.custom_fields ?? user.custom_field_values;
  return customFieldValuesFromPayload(source);
}

function customFieldValuesFromPayload(source?: ApiCustomFieldValues | null) {
  if (!source) return {};
  if (!Array.isArray(source)) return source;

  return source.reduce<Record<string, unknown>>((values, item: ApiCustomFieldValue) => {
    const key = item.slug ?? item.custom_field?.slug ?? item.custom_field_id ?? item.field_id ?? item.custom_field?.id;
    if (key !== undefined) values[String(key)] = item.value ?? '';
    return values;
  }, {});
}

function paginationFrom<T>(payload: ApiPaginated<T>, fallbackPage: number, fallbackPerPage: number) {
  return {
    current_page: payload.meta?.current_page ?? payload.current_page ?? fallbackPage,
    last_page: payload.meta?.last_page ?? payload.last_page ?? 1,
    per_page: payload.meta?.per_page ?? payload.per_page ?? fallbackPerPage,
    total: payload.meta?.total ?? payload.total ?? payload.data.length,
  };
}

function formFromUser(user: ApiUser): UserForm {
  return {
    user_code: user.user_code ?? '',
    first_name: user.first_name ?? '',
    last_name: user.last_name ?? '',
    email: user.email ?? '',
    phone: user.phone ?? '',
    parent_user_id: user.parent_user_id ? String(user.parent_user_id) : '',
    active: Boolean(user.active),
    notification_consents: {
      sms: Boolean(user.notification_consents?.sms),
      mail: Boolean(user.notification_consents?.mail),
    },
    group_ids: relationIds(user.groups),
    location_ids: relationIds(user.locations),
    services: serviceAssignmentsFromUser(user),
    custom_fields: customFieldValuesFromUser(user),
  };
}

async function loadUserCustomFieldValues(user: ApiUser) {
  try {
    return customFieldValuesFromPayload(await erpApiService.getEntityCustomFieldValues('users', user.id));
  } catch {
    return customFieldValuesFromUser(user);
  }
}

function sortedCustomFields(fields: ApiCustomField[]) {
  return [...fields].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name));
}

function customFieldValueKey(field: ApiCustomField) {
  return field.slug || String(field.id);
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value.map(String) : value ? String(value).split(',').map((item) => item.trim()).filter(Boolean) : [];
}

function groupLocationsByBranch(locations: ApiLocation[]) {
  const groups = new Map<string, { id: string; name: string; locations: ApiLocation[] }>();

  locations.forEach((location) => {
    const groupId = location.location_group?.id ?? location.location_group_id ?? 'none';
    const id = String(groupId);
    const name = location.location_group?.name ?? 'Fara filiala';
    const current = groups.get(id) ?? { id, name, locations: [] };
    current.locations.push(location);
    groups.set(id, current);
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      locations: [...group.locations].sort((left, right) => left.name.localeCompare(right.name)),
    }))
    .sort((left, right) => (left.id === 'none' ? 1 : right.id === 'none' ? -1 : left.name.localeCompare(right.name)));
}

export function UserManagementView({
  resource,
  title,
  addLabel,
  countLabel,
  singularLabel,
  entityLabel,
  showGroupsInList = false,
  useRelationTabs = false,
}: UserManagementViewProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeParamUserId } = useParams();
  const routePathUserId = location.pathname.match(/^\/erp\/members\/(\d+)$/)?.[1];
  const routeUserId = routeParamUserId ?? routePathUserId;
  const { hasAnyRight } = useAuth();
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [groups, setGroups] = useState<ApiGroup[]>([]);
  const [locations, setLocations] = useState<ApiLocation[]>([]);
  const [services, setServices] = useState<ApiService[]>([]);
  const [grades, setGrades] = useState<ApiGrade[]>([]);
  const [gradeHistory, setGradeHistory] = useState<ApiUserGrade[]>([]);
  const [gradeForm, setGradeForm] = useState({ grade_id: '', obtained_at: todayDate(), description: '' });
  const [editingGrade, setEditingGrade] = useState<ApiUserGrade | null>(null);
  const [gradeSaving, setGradeSaving] = useState(false);
  const [gradeError, setGradeError] = useState('');
  const [userEvents, setUserEvents] = useState<ApiUserEvent[]>([]);
  const [userEventsPage, setUserEventsPage] = useState(1);
  const [userEventsLastPage, setUserEventsLastPage] = useState(1);
  const [userEventsLoading, setUserEventsLoading] = useState(false);
  const [userEventsError, setUserEventsError] = useState('');
  const [customFields, setCustomFields] = useState<ApiCustomField[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [perPage, setPerPage] = useState(15);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState<ApiUser | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [activeFormTab, setActiveFormTab] = useState<UserFormTab>('details');
  const [serviceToAdd, setServiceToAdd] = useState('');
  const [serviceStartDate, setServiceStartDate] = useState(todayDate());
  const [serviceSaving, setServiceSaving] = useState(false);
  const [openServiceActionsId, setOpenServiceActionsId] = useState<number | null>(null);
  const [paymentServiceId, setPaymentServiceId] = useState<number | null>(null);
  const [paymentForm, setPaymentForm] = useState<ServicePaymentForm>(emptyPaymentForm);
  const [servicePayments, setServicePayments] = useState<ApiPayment[]>([]);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState('');
  const [receiptLoadingId, setReceiptLoadingId] = useState<number | null>(null);
  const [lifecycleSavingId, setLifecycleSavingId] = useState<number | null>(null);
  const [paymentNoteLoadingId, setPaymentNoteLoadingId] = useState<number | null>(null);
  const [invoiceLoadingId, setInvoiceLoadingId] = useState<number | null>(null);
  const [invoiceDownloadKey, setInvoiceDownloadKey] = useState<string | null>(null);
  const [suspendAssignmentId, setSuspendAssignmentId] = useState<number | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendResumeAt, setSuspendResumeAt] = useState('');
  const [scanningCode, setScanningCode] = useState(false);
  const [scanBuffer, setScanBuffer] = useState('');
  const scanBufferRef = useRef('');
  const [userCodeVisible, setUserCodeVisible] = useState(false);
  const [activities, setActivities] = useState<ApiActivity[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState('');
  const [activityFilters, setActivityFilters] = useState({ type: '', from: '', to: '' });
  const [selectedParent, setSelectedParent] = useState<ApiUser | null>(null);
  const [parentSearchTerm, setParentSearchTerm] = useState('');
  const [parentSearchResults, setParentSearchResults] = useState<ApiUser[]>([]);
  const [parentSearchLoading, setParentSearchLoading] = useState(false);
  const [parentSearchError, setParentSearchError] = useState('');

  const resolvedTitle = title ?? t('members.title');
  const resolvedAddLabel = addLabel ?? t('members.add');
  const resolvedCountLabel = countLabel ?? t('members.countLabel');
  const resolvedSingularLabel = singularLabel ?? t('members.singularLabel');
  const resolvedEntityLabel = entityLabel ?? t('members.entityLabel');
  const editEntityLabel = editing ? `${resolvedEntityLabel}: ${userName(editing)}` : resolvedEntityLabel;

  const selectedGroupIds = useMemo(() => selectedIds(form.group_ids), [form.group_ids]);
  const selectedLocationIds = useMemo(() => selectedIds(form.location_ids), [form.location_ids]);
  const locationsByBranch = useMemo(() => groupLocationsByBranch(locations), [locations]);
  const selectedServiceIds = useMemo(() => form.services.map((service) => String(service.id)), [form.services]);
  const selectedPaymentService = useMemo(() => {
    const serviceId = Number(paymentServiceId);
    if (!serviceId) return null;
    return services.find((service) => service.id === serviceId)
      ?? mergeById(editing?.services, editing?.active_services).find((service) => service.id === serviceId)
      ?? null;
  }, [editing, paymentServiceId, services]);
  const selectedPaymentMaxAmount = useMemo(() => {
    const servicePriceCents = moneyToCents(selectedPaymentService?.price);
    if (servicePriceCents === null) return null;

    const serviceId = Number(paymentForm.service_id || paymentServiceId);
    if (!serviceId) return centsToMoney(servicePriceCents);

    const assignment = form.services.find((item) => item.id === serviceId);
    const modelId = serviceUserIdForAssignment(assignment, editing, selectedPaymentService);
    const alreadyPaidCents = servicePayments
      .filter((payment) => payablePayment(payment))
      .filter((payment) => payment.id !== paymentForm.id)
      .filter((payment) => (
        modelId
          ? payment.model_id === modelId
          : payment.service_id === serviceId
      ))
      .reduce((total, payment) => total + (moneyToCents(payment.amount) ?? 0), 0);

    return centsToMoney(Math.max(servicePriceCents - alreadyPaidCents, 0));
  }, [editing, form.services, paymentForm.id, paymentForm.service_id, paymentServiceId, selectedPaymentService, servicePayments]);

  const userCustomFields = useMemo(() => sortedCustomFields(customFields), [customFields]);
  const canUseGdpr = hasAnyRight(['gdpr.export', 'gdpr.process']);
  const canExportGdpr = hasAnyRight(['gdpr.export', 'gdpr.process']);
  const canProcessGdpr = hasAnyRight(['gdpr.process']);
  const canViewDocuments = hasAnyRight(['user-documents.view', 'user-documents.upload', 'user-documents.delete', 'users.manage']);
  const canUploadDocuments = hasAnyRight(['user-documents.upload', 'users.manage']);
  const canDeleteDocuments = hasAnyRight(['user-documents.delete', 'users.manage']);
  const canViewGrades = hasAnyRight(['grades.view', 'grades.manage']);
  const canManageGrades = hasAnyRight(['grades.manage']);
  const canViewUserEvents = hasAnyRight(['users.view']);
  const formTabs = useMemo<Array<[UserFormTab, string]>>(() => {
    const tabs: Array<[UserFormTab, string]> = [
      ['details', 'Date utilizator'],
      ['code', t('users.userCode')],
      ['information', t('users.information')],
    ];

    if (useRelationTabs) {
      tabs.push(['groups', t('users.groups')], ['locations', t('articles.locations')]);
    }

    tabs.push(['services', t('users.services')]);
    if (editing && canViewGrades) tabs.push(['grades', t('users.grades')]);
    if (editing && canViewUserEvents) tabs.push(['events', t('users.events')]);
    if (editing && canViewDocuments) tabs.push(['documents', 'Documente']);
    if (editing && canUseGdpr) tabs.push(['privacy', 'GDPR']);
    if (editing) tabs.push(['activity', 'Activity']);
    return tabs;
  }, [canUseGdpr, canViewDocuments, canViewGrades, canViewUserEvents, editing, t, useRelationTabs]);

  useEffect(() => {
    if (!scanningCode || activeFormTab !== 'code') return undefined;

    const handleScanKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const code = scanBufferRef.current.trim();
        if (code) {
          setForm((prev) => ({ ...prev, user_code: code }));
        }
        scanBufferRef.current = '';
        setScanBuffer('');
        setScanningCode(false);
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        scanBufferRef.current = '';
        setScanBuffer('');
        setScanningCode(false);
        return;
      }

      if (event.key === 'Backspace') {
        event.preventDefault();
        scanBufferRef.current = scanBufferRef.current.slice(0, -1);
        setScanBuffer(scanBufferRef.current);
        return;
      }

      if (event.key.length === 1) {
        event.preventDefault();
        scanBufferRef.current = `${scanBufferRef.current}${event.key}`.slice(0, 32);
        setScanBuffer(scanBufferRef.current);
      }
    };

    window.addEventListener('keydown', handleScanKey);
    return () => window.removeEventListener('keydown', handleScanKey);
  }, [activeFormTab, scanningCode]);

  useEffect(() => {
    if (activeFormTab === 'code') return;
    scanBufferRef.current = '';
    setScanBuffer('');
    setScanningCode(false);
  }, [activeFormTab]);

  const loadLookups = useCallback(async () => {
    try {
      const [groupData, locationData, serviceData] = await Promise.all([
        erpApiService.list<ApiGroup>('groups', { per_page: 100 }),
        erpApiService.list<ApiLocation>('locations', { per_page: 100 }),
        erpApiService.list<ApiService>('services', { per_page: 100, is_active: '1' }),
      ]);
      setGroups(groupData);
      setLocations(locationData);
      setServices(serviceData);
    } catch {
      setGroups([]);
      setLocations([]);
      setServices([]);
    }

    try {
      setCustomFields(await erpApiService.list<ApiCustomField>('custom-fields', { entity_type: 'users' }));
    } catch {
      setCustomFields([]);
    }
  }, []);

  const loadGrades = useCallback(async () => {
    if (!canViewGrades) return;
    try {
      const payload = await erpApiService.listGrades({ per_page: 100, is_active: '1' });
      setGrades(payload.data ?? []);
    } catch {
      setGrades([]);
    }
  }, [canViewGrades]);

  const loadGradeHistory = useCallback(async (userId: number) => {
    if (!canViewGrades) return;
    setGradeError('');
    try {
      const payload = await erpApiService.listUserGrades(userId, { per_page: 100 });
      setGradeHistory(payload.data ?? []);
    } catch (err) {
      setGradeError(err instanceof Error ? err.message : t('users.gradesLoadError'));
      setGradeHistory([]);
    }
  }, [canViewGrades, t]);

  const loadUserEvents = useCallback(async (userId: number, pageNumber = 1) => {
    if (!canViewUserEvents) return;
    setUserEventsLoading(true);
    setUserEventsError('');
    try {
      const payload = await erpApiService.listUserEvents(userId, { page: pageNumber, per_page: 15 });
      setUserEvents(payload.data ?? []);
      setUserEventsPage(payload.meta?.current_page ?? payload.current_page ?? pageNumber);
      setUserEventsLastPage(payload.meta?.last_page ?? payload.last_page ?? 1);
    } catch (err) {
      setUserEventsError(err instanceof Error ? err.message : t('users.eventsLoadError'));
      setUserEvents([]);
    } finally {
      setUserEventsLoading(false);
    }
  }, [canViewUserEvents, t]);

  const fetchUsers = useCallback(async (search: string, limit: number, nextPage: number) => {
    setLoading(true);
    setError('');
    try {
      const payload = await erpApiService.listPaginated<ApiUser>(resource, {
        search: search.trim(),
        page: nextPage,
        per_page: limit,
      });
      setUsers(payload.data);
      setPagination(paginationFrom(payload, nextPage, limit));
      setPage(paginationFrom(payload, nextPage, limit).current_page);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('users.loadError', { label: resolvedCountLabel }));
    } finally {
      setLoading(false);
    }
  }, [resolvedCountLabel, resource, t]);

  const loadUsers = useCallback((nextPage = page) => fetchUsers(searchTerm, perPage, nextPage), [fetchUsers, searchTerm, perPage, page]);

  useEffect(() => {
    const term = parentSearchTerm.trim();
    if (!term) {
      setParentSearchResults([]);
      setParentSearchError('');
      setParentSearchLoading(false);
      return;
    }
    let cancelled = false;
    setParentSearchLoading(true);
    setParentSearchError('');
    const timer = setTimeout(() => {
      erpApiService.listPaginated<ApiUser>(resource, { search: term, per_page: 50 })
        .then((payload) => {
          if (cancelled) return;
          setParentSearchResults(payload.data.filter((candidate) => candidate.id !== editing?.id));
        })
        .catch((err) => {
          if (cancelled) return;
          setParentSearchError(err instanceof Error ? err.message : t('users.loadError', { label: resolvedCountLabel }));
          setParentSearchResults([]);
        })
        .finally(() => {
          if (!cancelled) setParentSearchLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [parentSearchTerm, resource, editing?.id, resolvedCountLabel, t]);

  const selectParentUser = (candidate: ApiUser) => {
    setForm((prev) => ({ ...prev, parent_user_id: String(candidate.id) }));
    setSelectedParent(candidate);
    setParentSearchTerm('');
    setParentSearchResults([]);
  };

  const clearParentUser = () => {
    setForm((prev) => ({ ...prev, parent_user_id: '' }));
    setSelectedParent(null);
  };

  const loadActivity = useCallback(async (userId = editing?.id) => {
    if (!userId) {
      setActivities([]);
      return;
    }

    setActivityLoading(true);
    setActivityError('');
    try {
      const payload = await erpApiService.userActivity(userId, {
        type: activityFilters.type,
        from: activityFilters.from,
        to: activityFilters.to,
        per_page: 50,
      });
      setActivities(payload.data);
    } catch (err) {
      setActivityError(err instanceof Error ? err.message : 'Nu am putut incarca activitatea.');
      setActivities([]);
    } finally {
      setActivityLoading(false);
    }
  }, [activityFilters.from, activityFilters.to, activityFilters.type, editing?.id]);

  const loadServicePayments = useCallback(async (user: ApiUser | null, assignments: ApiUserServiceAssignment[]) => {
    if (!user || !assignments.length) {
      setServicePayments([]);
      return;
    }

    try {
      const paymentGroups = await Promise.all(assignments.map((assignment) => erpApiService.list<ApiPayment>('payments', {
        model_type: 'service_user',
        model_id: assignment.service_user_id ?? undefined,
        service_id: assignment.id,
        per_page: 100,
      })));
      const merged = mergeById(...paymentGroups).filter((payment) => (
        payment.user_id === undefined
        || payment.user_id === null
        || payment.user_id === user.id
      ));
      setServicePayments(merged);
    } catch {
      setServicePayments([]);
    }
  }, []);

  const reloadEditingUserServices = useCallback(async () => {
    if (!editing) return;
    const savedUser = await erpApiService.get<ApiUser>('users', editing.id);
    const customFieldValues = await loadUserCustomFieldValues(savedUser);
    const savedForm = { ...formFromUser(savedUser), custom_fields: customFieldValues };
    setEditing(savedUser);
    setForm(savedForm);
    await loadServicePayments(savedUser, savedForm.services);
    await loadUsers();
  }, [editing, loadServicePayments, loadUsers]);

  useEffect(() => {
    void loadLookups();
    void loadGrades();
    void fetchUsers('', 15, 1);
  }, [fetchUsers, loadGrades, loadLookups]);

  useEffect(() => {
    if (!paymentServiceId || paymentForm.id) return;
    setPaymentError('');
    setPaymentSuccess('');
    setPaymentForm(paymentFormFromSelection({
      ...emptyForm,
      first_name: form.first_name,
      last_name: form.last_name,
    }, selectedPaymentService));
  }, [form.first_name, form.last_name, paymentForm.id, paymentServiceId, selectedPaymentService]);

  useEffect(() => {
    if (activeFormTab !== 'activity' || !editing) return;
    void loadActivity(editing.id);
  }, [activeFormTab, editing, loadActivity]);

  useEffect(() => {
    if (activeFormTab !== 'grades' || !editing) return;
    void loadGradeHistory(editing.id);
  }, [activeFormTab, editing, loadGradeHistory]);

  useEffect(() => {
    if (activeFormTab !== 'events' || !editing) return;
    void loadUserEvents(editing.id, userEventsPage);
  }, [activeFormTab, editing, loadUserEvents, userEventsPage]);

  const resetFilters = () => {
    setSearchTerm('');
    setPerPage(15);
    setPage(1);
    void fetchUsers('', 15, 1);
  };

  const startCreate = () => {
    if (resource === 'clients') navigate('/erp/members');
    setEditing(null);
    setForm(emptyForm);
    setSuccess('');
    setActiveFormTab('details');
    setServiceToAdd('');
    setServiceStartDate(todayDate());
    setOpenServiceActionsId(null);
    setPaymentServiceId(null);
    setPaymentForm(emptyPaymentForm);
    setServicePayments([]);
    setActivities([]);
    setGradeHistory([]);
    setGradeError('');
    setEditingGrade(null);
    setGradeForm({ grade_id: '', obtained_at: todayDate(), description: '' });
    setUserEvents([]);
    setUserEventsPage(1);
    setUserEventsLastPage(1);
    setUserEventsError('');
    setActivityError('');
    setActivityFilters({ type: '', from: '', to: '' });
    setPaymentError('');
    setPaymentSuccess('');
    setSuspendAssignmentId(null);
    setSuspendReason('');
    setSuspendResumeAt('');
    setInvoiceLoadingId(null);
    setInvoiceDownloadKey(null);
    setSelectedParent(null);
    setParentSearchTerm('');
    setParentSearchResults([]);
    setFormOpen(true);
  };

  const startEdit = useCallback(async (user: ApiUser, updateUrl = true) => {
    if (updateUrl && resource === 'clients') {
      navigate(`/erp/members/${user.id}`);
    }
    let selectedUser = user;
    try {
      selectedUser = await erpApiService.get<ApiUser>('users', user.id);
    } catch {
      selectedUser = user;
    }
    const customFieldValues = await loadUserCustomFieldValues(selectedUser);
    setEditing(selectedUser);
    setForm({ ...formFromUser(selectedUser), custom_fields: customFieldValues });
    setParentSearchTerm('');
    setParentSearchResults([]);
    setSelectedParent(null);
    if (selectedUser.parent_user_id) {
      erpApiService.get<ApiUser>(resource, selectedUser.parent_user_id)
        .then((parentUser) => setSelectedParent(parentUser))
        .catch(() => setSelectedParent(null));
    }
    setSuccess('');
    setActiveFormTab('details');
    setServiceToAdd('');
    setServiceStartDate(todayDate());
    setPaymentServiceId(null);
    setPaymentForm(emptyPaymentForm);
    setServicePayments([]);
    setActivities([]);
    setGradeHistory([]);
    setGradeError('');
    setEditingGrade(null);
    setGradeForm({ grade_id: '', obtained_at: todayDate(), description: '' });
    setUserEvents([]);
    setUserEventsPage(1);
    setUserEventsLastPage(1);
    setUserEventsError('');
    setActivityError('');
    setActivityFilters({ type: '', from: '', to: '' });
    setPaymentError('');
    setPaymentSuccess('');
    setSuspendAssignmentId(null);
    setSuspendReason('');
    setSuspendResumeAt('');
    setInvoiceLoadingId(null);
    setInvoiceDownloadKey(null);
    setFormOpen(true);
    void loadServicePayments(selectedUser, serviceAssignmentsFromUser(selectedUser));
  }, [loadServicePayments, navigate, resource]);

  const closeForm = () => {
    if (resource === 'clients') navigate('/erp/members');
    setFormOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setSuccess('');
    setActiveFormTab('details');
    setServiceToAdd('');
    setServiceStartDate(todayDate());
    setPaymentServiceId(null);
    setPaymentForm(emptyPaymentForm);
    setServicePayments([]);
    setActivities([]);
    setGradeHistory([]);
    setGradeError('');
    setEditingGrade(null);
    setUserEvents([]);
    setUserEventsPage(1);
    setUserEventsLastPage(1);
    setUserEventsError('');
    setActivityError('');
    setPaymentError('');
    setPaymentSuccess('');
    setSuspendAssignmentId(null);
    setSuspendReason('');
    setSuspendResumeAt('');
    setInvoiceLoadingId(null);
    setInvoiceDownloadKey(null);
    setSelectedParent(null);
    setParentSearchTerm('');
    setParentSearchResults([]);
  };

  useEffect(() => {
    if (resource !== 'clients' || !routeUserId) return;
    const userId = Number(routeUserId);
    if (!Number.isFinite(userId) || userId <= 0) {
      navigate('/erp/members', { replace: true });
      return;
    }
    if (editing?.id === userId && formOpen) return;

    let disposed = false;
    const openUserFromRoute = async () => {
      try {
        const selectedUser = await erpApiService.get<ApiUser>('users', userId);
        if (disposed) return;
        await startEdit(selectedUser, false);
      } catch (err) {
        if (!disposed) {
          setError(err instanceof Error ? err.message : t('users.loadError', { label: resolvedSingularLabel }));
          navigate('/erp/members', { replace: true });
        }
      }
    };

    void openUserFromRoute();
    return () => {
      disposed = true;
    };
  }, [editing?.id, formOpen, navigate, resolvedSingularLabel, resource, routeUserId, startEdit, t]);

  const persistServiceAssignments = async (nextServices: ApiUserServiceAssignment[]) => {
    if (!editing) return;
    setServiceSaving(true);
    setError('');
    setSuccess('');
    try {
      await erpApiService.syncUserServices<ApiUser>(editing.id, nextServices);
      const savedUser = await erpApiService.get<ApiUser>('users', editing.id);
      const customFieldValues = await loadUserCustomFieldValues(savedUser);
      const savedForm = { ...formFromUser(savedUser), custom_fields: customFieldValues };
      setEditing(savedUser);
      setForm(savedForm);
      await loadServicePayments(savedUser, savedForm.services);
      setSuccess(t('common.saved'));
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('users.saveError', { label: resolvedSingularLabel }));
    } finally {
      setServiceSaving(false);
    }
  };

  const updateServiceStartDate = (serviceId: number, startDate: string) => {
    const nextServices = form.services.map((service) => (
      service.id === serviceId ? { ...service, start_date: startDate } : service
    ));
    setForm((prev) => ({ ...prev, services: nextServices }));
    void persistServiceAssignments(nextServices);
  };

  const addServiceAssignment = () => {
    const serviceId = Number(serviceToAdd);
    if (!serviceId) return;
    if (form.services.some((service) => service.id === serviceId)) return;
    const nextServices = [...form.services, { id: serviceId, start_date: serviceStartDate || todayDate() }];
    setForm((prev) => ({ ...prev, services: nextServices }));
    setServiceToAdd('');
    setServiceStartDate(todayDate());
    void persistServiceAssignments(nextServices);
  };

  const selectServiceForPayment = (serviceId: number) => {
    if (!form.services.some((service) => service.id === serviceId)) return;
    const service = services.find((item) => item.id === serviceId)
      ?? mergeById(editing?.services, editing?.active_services).find((item) => item.id === serviceId)
      ?? null;
    setPaymentServiceId(serviceId);
    setPaymentForm(paymentFormFromSelection(form, service));
    setPaymentError('');
    setPaymentSuccess('');
  };

  const editPayment = (payment: ApiPayment, service?: ApiService | ApiUserService | null) => {
    const serviceId = Number(payment.service_id ?? service?.id);
    if (!serviceId) return;
    setPaymentServiceId(serviceId);
    setPaymentForm(paymentFormFromPayment(payment, form, service));
    setPaymentError('');
    setPaymentSuccess('');
  };

  const updatePaymentForm = (field: keyof ServicePaymentForm, value: string) => {
    setPaymentForm((prev) => ({ ...prev, [field]: value }));
  };

  const updatePaymentPopupForm = <K extends keyof PaymentPopupValues>(field: K, value: PaymentPopupValues[K]) => {
    const mappedFields: Partial<Record<keyof PaymentPopupValues, keyof ServicePaymentForm>> = {
      first_name: 'first_name',
      last_name: 'last_name',
      amount: 'amount',
      currency: 'currency',
      payment_type_id: 'payment_type_id',
      paid_at: 'paid_at',
      reference_id: 'service_id',
      reference_name: 'service_name',
      reference_description: 'service_description',
    };
    const targetField = mappedFields[field];
    if (!targetField) return;
    updatePaymentForm(targetField, String(value ?? ''));
    if (field === 'reference_id') updatePaymentForm('service_reference', String(value ?? ''));
  };

  const savePayment = async () => {
    const serviceId = Number(paymentForm.service_id || paymentServiceId);
    const paymentTypeId = Number(paymentForm.payment_type_id);
    const amount = Number(paymentForm.amount);
    const assignment = form.services.find((item) => item.id === serviceId);
    const modelId = serviceUserIdForAssignment(assignment, editing, selectedPaymentService);

    setPaymentError('');
    setPaymentSuccess('');

    if (!serviceId) {
      setPaymentError('Select a service before creating a payment.');
      return;
    }
    if (!modelId) {
      setPaymentError('Salveaza mai intai subscriptia userului, apoi adauga plata.');
      return;
    }
    if (![1, 2, 3].includes(paymentTypeId)) {
      setPaymentError('Select a valid payment type.');
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      setPaymentError('Payment amount cannot be negative.');
      return;
    }
    const amountCents = moneyToCents(amount);
    const maxAmountCents = moneyToCents(selectedPaymentMaxAmount);
    if (amountCents !== null && maxAmountCents !== null && amountCents > maxAmountCents) {
      const maxAmountLabel = selectedPaymentMaxAmount === null ? '0.00' : selectedPaymentMaxAmount.toFixed(2);
      setPaymentError(`Suma platita nu poate depasi suma ramasa pentru serviciu (${maxAmountLabel} ${paymentForm.currency || selectedPaymentService?.currency || ''}).`);
      return;
    }
    if (!paymentForm.first_name.trim() || !paymentForm.last_name.trim() || !paymentForm.paid_at) {
      setPaymentError('First name, last name, and payment date/time are required.');
      return;
    }

    setPaymentSaving(true);
    try {
      const payload = {
        ...(editing ? { user_id: editing.id } : {}),
        model_type: 'service_user',
        model_id: modelId,
        service_id: serviceId,
        first_name: paymentForm.first_name.trim(),
        last_name: paymentForm.last_name.trim(),
        amount,
        payment_type_id: paymentTypeId,
        paid_at: dateTimeLocalToApi(paymentForm.paid_at),
      };
      let savedPayment: ApiPayment;
      if (paymentForm.id) {
        savedPayment = await erpApiService.update<ApiPayment>('payments', paymentForm.id, payload);
      } else {
        savedPayment = await erpApiService.create<ApiPayment>('payments', payload);
      }
      const currentStatus = serviceAssignmentStatus(selectedPaymentService, assignment);
      if (!paymentForm.id && savedPayment.id && modelId && ['pending', 'reserved', 'expired'].includes(currentStatus ?? '')) {
        try {
          await serviceLifecycleService.activate(modelId, savedPayment.id);
        } catch (activationError) {
          console.warn('Payment saved, but service assignment activation was skipped.', activationError);
        }
      }
      if (editing) {
        await reloadEditingUserServices();
      } else {
        setServicePayments((prev) => {
          const withoutSaved = prev.filter((payment) => payment.id !== savedPayment.id);
          return [...withoutSaved, savedPayment];
        });
      }
      setPaymentServiceId(null);
      setPaymentForm(emptyPaymentForm);
      setPaymentSuccess('');
      setSuccess(paymentForm.id ? 'Payment updated.' : 'Payment saved.');
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Could not save payment.');
    } finally {
      setPaymentSaving(false);
    }
  };

  const removeServiceAssignment = (serviceId: number) => {
    const nextServices = form.services.filter((service) => service.id !== serviceId);
    setForm((prev) => ({ ...prev, services: nextServices }));
    if (paymentServiceId === serviceId) {
      setPaymentServiceId(null);
      setPaymentForm(emptyPaymentForm);
      setPaymentError('');
      setPaymentSuccess('');
    }
    void persistServiceAssignments(nextServices);
  };

  const runLifecycleAction = async (assignmentId: number, action: 'activate' | 'resume' | 'consume') => {
    setLifecycleSavingId(assignmentId);
    setError('');
    setSuccess('');
    try {
      if (action === 'activate') {
        await serviceLifecycleService.activate(assignmentId);
      } else if (action === 'resume') {
        await serviceLifecycleService.resume(assignmentId);
      } else {
        await serviceLifecycleService.consume(assignmentId);
      }
      await reloadEditingUserServices();
      setSuccess(t('services.lifecycleSaved'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('services.lifecycleError'));
    } finally {
      setLifecycleSavingId(null);
    }
  };

  const downloadPaymentNote = async (assignmentId: number) => {
    setPaymentNoteLoadingId(assignmentId);
    setError('');
    setSuccess('');
    try {
      const blob = await erpApiService.downloadServicePaymentNote(assignmentId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `nota-plata-serviciu-${assignmentId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('services.paymentNoteError'));
    } finally {
      setPaymentNoteLoadingId(null);
    }
  };

  const generateInvoice = async (assignmentId: number) => {
    setInvoiceLoadingId(assignmentId);
    setError('');
    setSuccess('');
    try {
      await serviceLifecycleService.generateInvoice(assignmentId);
      await reloadEditingUserServices();
      setSuccess(t('services.invoiceGenerated'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('services.invoiceGenerateError'));
    } finally {
      setInvoiceLoadingId(null);
    }
  };

  const downloadServiceInvoice = async (assignmentId: number, invoiceNumber: string | null | undefined, format: 'pdf' | 'xml') => {
    const key = `${assignmentId}-${format}`;
    setInvoiceDownloadKey(key);
    setError('');
    setSuccess('');
    try {
      const blob = await erpApiService.downloadServiceInvoice(assignmentId, format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${format === 'xml' ? 'efactura' : 'factura'}-${invoiceNumber ?? assignmentId}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('services.invoiceDownloadError'));
    } finally {
      setInvoiceDownloadKey(null);
    }
  };

  const downloadReceipt = async (payment: ApiPayment) => {
    setReceiptLoadingId(payment.id);
    setError('');
    setSuccess('');
    try {
      const blob = await erpApiService.downloadPaymentReceipt(payment.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chitanta-${payment.receipt_number ?? payment.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu am putut descarca chitanta.');
    } finally {
      setReceiptLoadingId(null);
    }
  };

  const suspendAssignment = async (assignmentId: number) => {
    if (!suspendReason.trim()) {
      setError(t('services.suspendReasonRequired'));
      return;
    }
    setLifecycleSavingId(assignmentId);
    setError('');
    setSuccess('');
    try {
      await serviceLifecycleService.suspend(assignmentId, {
        reason: suspendReason.trim(),
        resume_at: suspendResumeAt ? dateTimeLocalToApi(suspendResumeAt) : null,
      });
      setSuspendAssignmentId(null);
      setSuspendReason('');
      setSuspendResumeAt('');
      await reloadEditingUserServices();
      setSuccess(t('services.lifecycleSaved'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('services.lifecycleError'));
    } finally {
      setLifecycleSavingId(null);
    }
  };

  const updateCustomField = (field: ApiCustomField, value: unknown) => {
    const key = customFieldValueKey(field);
    setForm((prev) => ({
      ...prev,
      custom_fields: { ...prev.custom_fields, [key]: value },
    }));
  };

  const saveUserGrade = async () => {
    if (!editing || !gradeForm.grade_id || !gradeForm.obtained_at) return;
    setGradeSaving(true);
    setGradeError('');
    try {
      const payload = {
        grade_id: Number(gradeForm.grade_id),
        obtained_at: gradeForm.obtained_at,
        description: gradeForm.description || null,
      };
      if (editingGrade) {
        await erpApiService.update<ApiUserGrade>(`users/${editing.id}/grades`, editingGrade.id, payload);
      } else {
        await erpApiService.create<ApiUserGrade>(`users/${editing.id}/grades`, payload);
      }
      setEditingGrade(null);
      setGradeForm({ grade_id: '', obtained_at: todayDate(), description: '' });
      await loadGradeHistory(editing.id);
      setSuccess(t('common.saved'));
    } catch (err) {
      setGradeError(err instanceof Error ? err.message : t('users.gradesSaveError'));
    } finally {
      setGradeSaving(false);
    }
  };

  const deleteUserGrade = async (record: ApiUserGrade) => {
    if (!editing || !window.confirm(t('users.gradesDeleteConfirm'))) return;
    setGradeError('');
    try {
      await erpApiService.remove(`users/${editing.id}/grades`, record.id);
      await loadGradeHistory(editing.id);
      setSuccess(t('common.saved'));
    } catch (err) {
      setGradeError(err instanceof Error ? err.message : t('users.gradesDeleteError'));
    }
  };

  const renderCustomField = (field: ApiCustomField) => {
    const key = customFieldValueKey(field);
    const value = form.custom_fields[key] ?? '';
    const label = `${field.name}${field.is_required ? ' *' : ''}`;
    const choices = field.options?.choices ?? [];

    if (field.type === 'textarea') {
      return <Textarea key={key} label={label} value={String(value)} onChange={(event) => updateCustomField(field, event.target.value)} rows={4} />;
    }

    if (field.type === 'select') {
      return (
        <label key={key} className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
          <select value={String(value)} onChange={(event) => updateCustomField(field, event.target.value)} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100">
            <option value="">{t('common.select')}</option>
            {choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
          </select>
        </label>
      );
    }

    if (field.type === 'multi_select') {
      return (
        <label key={key} className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
          <select multiple value={arrayValue(value)} onChange={(event) => updateCustomField(field, Array.from(event.currentTarget.selectedOptions).map((option) => option.value))} className="min-h-36 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100">
            {choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
          </select>
        </label>
      );
    }

    if (field.type === 'checkbox' || field.type === 'boolean') {
      return (
        <label key={key} className="flex h-10 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={Boolean(value)} onChange={(event) => updateCustomField(field, event.target.checked)} className="h-4 w-4 accent-indigo-600" />
          {label}
        </label>
      );
    }

    if (field.type === 'file') {
      return <Input key={key} label={label} type="text" value={String(value)} onChange={(event) => updateCustomField(field, event.target.value)} placeholder={t('users.customFilePlaceholder')} />;
    }

    const inputType = field.type === 'datetime' ? 'datetime-local' : field.type === 'phone' ? 'tel' : field.type;
    return <Input key={key} label={label} type={inputType} value={String(value)} onChange={(event) => updateCustomField(field, event.target.value)} />;
  };

  const renderGroupCheckboxes = () => (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {groups.length ? groups.map((group) => (
        <label key={group.id} className="flex h-10 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={selectedGroupIds.includes(String(group.id))}
            onChange={(event) => setForm((prev) => ({ ...prev, group_ids: toggleId(prev.group_ids, group.id, event.target.checked) }))}
            className="h-4 w-4 accent-indigo-600"
          />
          {group.label || group.name}
        </label>
      )) : (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 md:col-span-2">
          {t('access.empty')}
        </div>
      )}
    </div>
  );

  const renderLocationCheckboxes = () => (
    <div className="space-y-4">
      {locationsByBranch.length ? locationsByBranch.map((group) => {
        const groupLocationIds = group.locations.map((location) => location.id);
        const selectedCount = groupLocationIds.filter((id) => selectedLocationIds.includes(String(id))).length;
        const allSelected = selectedCount === groupLocationIds.length;
        const partiallySelected = selectedCount > 0 && !allSelected;

        return (
          <div key={group.id} className="rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{group.name}</h3>
                <p className="text-xs text-slate-500">{selectedCount}/{group.locations.length} {t('articles.locations')}</p>
              </div>
              <label className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = partiallySelected;
                  }}
                  onChange={(event) => setForm((prev) => ({ ...prev, location_ids: toggleIds(prev.location_ids, groupLocationIds, event.target.checked) }))}
                  className="h-4 w-4 accent-indigo-600"
                />
                {t('common.selectAll')}
              </label>
            </div>
            <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
              {group.locations.map((location) => (
                <label key={location.id} className="flex h-10 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedLocationIds.includes(String(location.id))}
                    onChange={(event) => setForm((prev) => ({ ...prev, location_ids: toggleId(prev.location_ids, location.id, event.target.checked) }))}
                    className="h-4 w-4 accent-indigo-600"
                  />
                  {location.name}
                </label>
              ))}
            </div>
          </div>
        );
      }) : (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          {t('branches.empty')}
        </div>
      )}
    </div>
  );

  const saveUser = async (closeAfterSave = false) => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      let savedUser: ApiUser;
      const shouldSaveCustomFields = activeFormTab === 'information';
      if (editing) {
        savedUser = await erpApiService.update<ApiUser>(resource, editing.id, buildPayload(form));
        if (shouldSaveCustomFields) {
          await erpApiService.saveEntityCustomFieldValues('users', editing.id, form.custom_fields);
        }
        savedUser = await erpApiService.get<ApiUser>('users', editing.id);
      } else {
        savedUser = await erpApiService.create<ApiUser>(resource, buildCreatePayload(form, shouldSaveCustomFields));
      }
      const customFieldValues = await loadUserCustomFieldValues(savedUser);
      const savedForm = { ...formFromUser(savedUser), custom_fields: customFieldValues };
      setEditing(savedUser);
      setForm(savedForm);
      await loadServicePayments(savedUser, savedForm.services);
      setSuccess(t('common.saved'));
      await loadUsers();
      if (closeAfterSave) closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('users.saveError', { label: resolvedSingularLabel }));
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (user: ApiUser) => {
    if (!window.confirm(t('users.deleteConfirm', { label: resolvedSingularLabel, name: userName(user) }))) return;
    setError('');
    try {
      await erpApiService.remove(resource, user.id);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('users.deleteError', { label: resolvedSingularLabel }));
    }
  };

  if (formOpen) {
    return (
      <PageShell>
        {error ? <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
        {success ? <SuccessMessage fixed>{success}</SuccessMessage> : null}
        <SectionCard
          title={editing ? t('users.editTitle', { label: editEntityLabel }) : t('users.addCardTitle', { label: resolvedEntityLabel })}
          action={
            <button onClick={closeForm} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm">
              <X className="h-4 w-4" />{t('common.close')}
            </button>
          }
        >
          <label className="mb-5 block sm:hidden">
            <span className="mb-2 block text-sm font-semibold text-slate-700">{t('common.section', 'Sectiune')}</span>
            <select
              value={activeFormTab}
              onChange={(event) => setActiveFormTab(event.target.value as UserFormTab)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base font-semibold text-slate-800 shadow-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            >
              {formTabs.map(([tab, label]) => <option key={tab} value={tab}>{label}</option>)}
            </select>
          </label>
          <div className="mb-5 hidden flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:flex">
            {formTabs.map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveFormTab(tab as UserFormTab)}
                className={`h-9 rounded-lg px-3 text-sm font-semibold transition ${activeFormTab === tab ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-900'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {activeFormTab === 'details' ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input label={t('users.firstName')} value={form.first_name} onChange={(event) => setForm((prev) => ({ ...prev, first_name: event.target.value }))} placeholder="John" />
              <Input label={t('users.lastName')} value={form.last_name} onChange={(event) => setForm((prev) => ({ ...prev, last_name: event.target.value }))} placeholder="Doe" />
              <Input label={t('members.email')} type="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="john@example.com" />
              <Input label={t('members.phone')} value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder="+15550001111" />
              <div className="md:col-span-2">
                <span className="mb-2 block text-sm font-medium text-slate-700">{t('users.parentUser', 'Tutore')}</span>
                {selectedParent ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5">
                    <span className="min-w-0 truncate text-sm font-medium text-slate-900">
                      {[selectedParent.first_name, selectedParent.last_name].filter(Boolean).join(' ')}
                      {selectedParent.email ? <span className="ml-2 font-normal text-slate-500">{selectedParent.email}</span> : null}
                      {selectedParent.phone ? <span className="ml-2 font-normal text-slate-500">{selectedParent.phone}</span> : null}
                    </span>
                    <button type="button" onClick={clearParentUser} className="shrink-0 text-sm font-medium text-red-600 hover:text-red-700">
                      {t('users.removeParentUser', 'Elimina')}
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      value={parentSearchTerm}
                      onChange={(event) => setParentSearchTerm(event.target.value)}
                      placeholder={t('users.parentUserSearchPlaceholder', 'Cauta dupa nume, email sau telefon')}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                    />
                    {parentSearchError ? <p className="mt-2 text-sm font-medium text-red-600">{parentSearchError}</p> : null}
                    {parentSearchTerm.trim() ? (
                      <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
                        <div className="max-h-64 overflow-y-auto">
                          <table className="min-w-full text-left text-sm">
                            <thead className="sticky top-0 bg-slate-50 text-slate-500">
                              <tr>
                                <th className="px-3 py-2">{t('users.firstName')}</th>
                                <th className="px-3 py-2">{t('users.lastName')}</th>
                                <th className="px-3 py-2">{t('members.email')}</th>
                                <th className="px-3 py-2">{t('members.phone')}</th>
                                <th className="px-3 py-2" />
                              </tr>
                            </thead>
                            <tbody>
                              {parentSearchResults.map((candidate) => (
                                <tr key={candidate.id} className="border-t border-slate-100 hover:bg-slate-50">
                                  <td className="px-3 py-2">{candidate.first_name}</td>
                                  <td className="px-3 py-2">{candidate.last_name}</td>
                                  <td className="px-3 py-2 text-slate-500">{candidate.email || '-'}</td>
                                  <td className="px-3 py-2 text-slate-500">{candidate.phone || '-'}</td>
                                  <td className="px-3 py-2 text-right">
                                    <button type="button" onClick={() => selectParentUser(candidate)} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                                      {t('users.selectParentUser', 'Selecteaza')}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              {!parentSearchLoading && parentSearchResults.length === 0 ? (
                                <tr><td colSpan={5} className="px-3 py-4 text-center text-sm text-slate-500">{t('users.noParentUserResults', 'Niciun rezultat')}</td></tr>
                              ) : null}
                              {parentSearchLoading ? (
                                <tr><td colSpan={5} className="px-3 py-4 text-center text-sm text-slate-500">{t('common.loading')}</td></tr>
                              ) : null}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
              <label className="flex h-10 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={form.active} onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))} className="h-4 w-4 accent-indigo-600" />
                {t('users.activeUser')}
              </label>
              <div className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 md:col-span-2 sm:grid-cols-3">
                {(['sms', 'mail'] as const).map((channel) => (
                  <label key={channel} className="flex h-10 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.notification_consents[channel]}
                      onChange={(event) => setForm((prev) => ({
                        ...prev,
                        notification_consents: { ...prev.notification_consents, [channel]: event.target.checked },
                      }))}
                      className="h-4 w-4 accent-indigo-600"
                    />
                    Consent {channel}
                  </label>
                ))}
              </div>
              {!useRelationTabs ? (
                <>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">{t('users.groups')}</span>
                    <select
                      multiple
                      value={selectedGroupIds}
                      onChange={(event) => {
                        const groupIds = idsFromSelect(event.currentTarget.selectedOptions);
                        setForm((prev) => ({ ...prev, group_ids: groupIds }));
                      }}
                      className="min-h-36 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                    >
                      {groups.map((group) => <option key={group.id} value={group.id}>{group.label || group.name}</option>)}
                    </select>
                  </label>
                  <div className="md:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-slate-700">{t('articles.locations')}</span>
                    {renderLocationCheckboxes()}
                  </div>
                </>
              ) : null}
            </div>
          ) : activeFormTab === 'code' ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <Input label={t('users.userCode')} type={userCodeVisible ? 'text' : 'password'} value={form.user_code} onChange={(event) => setForm((prev) => ({ ...prev, user_code: event.target.value }))} placeholder="USR00000000000000000000000000001" maxLength={32} />
                <div className="flex flex-wrap items-end gap-2">
                  <Button
                    onClick={() => setUserCodeVisible((prev) => !prev)}
                    variant="secondary"
                    className="w-full py-3 md:w-auto"
                    type="button"
                  >
                    {userCodeVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {userCodeVisible ? t('users.hideCode') : t('users.showCode')}
                  </Button>
                  <Button
                    onClick={() => {
                      scanBufferRef.current = '';
                      setScanBuffer('');
                      setScanningCode(true);
                    }}
                    variant={scanningCode ? 'secondary' : 'primary'}
                    className="w-full py-3 md:w-auto"
                    type="button"
                  >
                    <ScanLine className="h-4 w-4" />{scanningCode ? t('users.scanning') : t('users.scan')}
                  </Button>
                </div>
              </div>
              <div className={`rounded-lg border px-4 py-3 text-sm ${scanningCode ? 'border-indigo-200 bg-indigo-50 text-indigo-800' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                {scanningCode ? (
                  <div className="space-y-1">
                    <p className="font-semibold">{t('users.scanWaiting')}</p>
                    <p>{scanBuffer || t('users.scanEmpty')}</p>
                  </div>
                ) : (
                  <p>{form.user_code ? t('users.currentUserCode', { code: userCodeVisible ? form.user_code : '••••••••' }) : t('users.noUserCode')}</p>
                )}
              </div>
            </div>
          ) : activeFormTab === 'information' ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {userCustomFields.length ? userCustomFields.map(renderCustomField) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 md:col-span-2">
                  {t('users.noCustomFields')}
                </div>
              )}
            </div>
          ) : activeFormTab === 'groups' ? (
            renderGroupCheckboxes()
          ) : activeFormTab === 'locations' ? (
            renderLocationCheckboxes()
          ) : activeFormTab === 'grades' && editing ? (
            <div className="space-y-5">
              {gradeError ? <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{gradeError}</p> : null}
              {canManageGrades ? (
                <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
                  <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">{t('users.grade')}</span><select value={gradeForm.grade_id} onChange={(event) => setGradeForm((prev) => ({ ...prev, grade_id: event.target.value }))} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="">{t('users.selectGrade')}</option>{grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}</select></label>
                  <Input label={t('users.gradeObtainedAt')} type="date" max={todayDate()} value={gradeForm.obtained_at} onChange={(event) => setGradeForm((prev) => ({ ...prev, obtained_at: event.target.value }))} />
                  <Textarea label={t('users.gradeDescription')} value={gradeForm.description} onChange={(event) => setGradeForm((prev) => ({ ...prev, description: event.target.value }))} />
                  <div className="flex items-end gap-2 md:col-span-3"><Button onClick={() => void saveUserGrade()} disabled={gradeSaving || !gradeForm.grade_id || !gradeForm.obtained_at} variant="primary"><Save className="h-4 w-4" />{gradeSaving ? t('common.saving') : editingGrade ? t('common.save') : t('users.addGrade')}</Button>{editingGrade ? <Button onClick={() => { setEditingGrade(null); setGradeForm({ grade_id: '', obtained_at: todayDate(), description: '' }); }}>{t('common.cancel')}</Button> : null}</div>
                </div>
              ) : null}
              <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">{t('users.grade')}</th><th className="px-4 py-3">{t('users.gradeObtainedAt')}</th><th className="px-4 py-3">{t('users.gradeDescription')}</th><th className="px-4 py-3 text-right">{t('common.actions')}</th></tr></thead><tbody>{gradeHistory.map((record) => <tr key={record.id} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold">{record.grade?.name ?? record.grade_id}{record.id === gradeHistory[0]?.id ? <span className="ml-2 rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">{t('users.activeGrade')}</span> : null}</td><td className="px-4 py-3">{formatDate(record.obtained_at)}</td><td className="px-4 py-3">{record.description || '-'}</td><td className="px-4 py-3 text-right">{canManageGrades ? <div className="flex justify-end gap-2"><button onClick={() => { setEditingGrade(record); setGradeForm({ grade_id: String(record.grade_id), obtained_at: record.obtained_at, description: record.description ?? '' }); }} className="rounded-lg border p-2"><Edit3 className="h-4 w-4" /></button><button onClick={() => void deleteUserGrade(record)} className="rounded-lg border border-red-100 p-2 text-red-600"><Trash2 className="h-4 w-4" /></button></div> : null}</td></tr>)}{gradeHistory.length === 0 ? <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500">{t('users.noGrades')}</td></tr> : null}</tbody></table></div>
            </div>
          ) : activeFormTab === 'events' && editing ? (
            <div className="space-y-4">
              {userEventsError ? <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{userEventsError}</p> : null}
              <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="min-w-[900px] w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">{t('users.event')}</th><th className="px-4 py-3">{t('users.eventDate')}</th><th className="px-4 py-3">{t('users.eventStatus')}</th><th className="px-4 py-3">{t('users.participantStatus')}</th><th className="px-4 py-3">{t('users.registeredAt')}</th><th className="px-4 py-3">{t('users.eventNotes')}</th></tr></thead><tbody>{userEvents.map((event) => <tr key={event.id} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold">{event.event?.title ?? `#${event.event_id}`}</td><td className="px-4 py-3">{formatDeviceDateTime(event.start_datetime)} - {formatDeviceDateTime(event.end_datetime)}</td><td className="px-4 py-3"><StatusBadge status={event.status} /></td><td className="px-4 py-3"><StatusBadge status={event.participant_status ?? '-'} /></td><td className="px-4 py-3">{formatDeviceDateTime(event.registered_at)}</td><td className="px-4 py-3">{event.notes || '-'}</td></tr>)}{userEvents.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">{userEventsLoading ? t('common.loading') : t('users.noEvents')}</td></tr> : null}</tbody></table></div>
              <div className="flex items-center justify-end gap-2 text-sm text-slate-600"><button onClick={() => setUserEventsPage((page) => page - 1)} disabled={userEventsLoading || userEventsPage <= 1} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">{t('users.previousPage')}</button><span>{t('users.pageOf', { page: userEventsPage, lastPage: userEventsLastPage })}</span><button onClick={() => setUserEventsPage((page) => page + 1)} disabled={userEventsLoading || userEventsPage >= userEventsLastPage} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">{t('users.nextPage')}</button></div>
            </div>
          ) : activeFormTab === 'privacy' && editing ? (
            <PrivacyPanel userId={editing.id} administrative canExport={canExportGdpr} canProcess={canProcessGdpr} />
          ) : activeFormTab === 'documents' && editing ? (
            <UserDocumentsPanel userId={editing.id} locations={locations} canUpload={canUploadDocuments} canDelete={canDeleteDocuments} />
          ) : activeFormTab === 'activity' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
                <Input label="type" value={activityFilters.type} onChange={(event) => setActivityFilters((prev) => ({ ...prev, type: event.target.value }))} placeholder="service_assigned" />
                <Input label="from" type="date" value={activityFilters.from} onChange={(event) => setActivityFilters((prev) => ({ ...prev, from: event.target.value }))} />
                <Input label="to" type="date" value={activityFilters.to} onChange={(event) => setActivityFilters((prev) => ({ ...prev, to: event.target.value }))} />
                <div className="flex items-end">
                  <Button onClick={() => void loadActivity()} disabled={activityLoading} className="w-full">
                    <RefreshCw className="h-4 w-4" />{activityLoading ? 'Se incarca...' : 'Filtreaza'}
                  </Button>
                </div>
              </div>
              {activityError ? <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{activityError}</p> : null}
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                <table className="min-w-[920px] w-full text-left text-sm text-slate-700 [&_tbody_tr:nth-child(even)]:bg-slate-50/45">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="border-b border-slate-200 px-5 py-3 font-semibold">type</th>
                      <th className="border-b border-slate-200 px-4 py-3 font-semibold">model</th>
                      <th className="border-b border-slate-200 px-4 py-3 font-semibold">actor</th>
                      <th className="border-b border-slate-200 px-4 py-3 font-semibold">created_at</th>
                      <th className="border-b border-slate-200 px-5 py-3 font-semibold">new_values</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.length ? activities.map((activity) => (
                      <tr key={activity.id} className="border-b border-slate-100 align-top transition-colors hover:bg-indigo-50/30">
                        <td className="px-5 py-3 font-semibold text-slate-900">{activity.type}</td>
                        <td className="px-4 py-3 text-slate-600">{activity.model_type ?? '-'} #{activity.model_id ?? '-'}</td>
                        <td className="px-4 py-3 text-slate-600">{activity.actor_id ?? '-'}</td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(activity.created_at)}</td>
                        <td className="max-w-[360px] px-5 py-3 text-xs text-slate-600"><pre className="whitespace-pre-wrap font-mono">{JSON.stringify(activity.new_values ?? {}, null, 2)}</pre></td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">{activityLoading ? 'Se incarca activitatea...' : 'Nu exista activitate.'}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(220px,320px)_minmax(360px,440px)_auto] md:items-end">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">{t('users.addService')}</span>
                  <select value={serviceToAdd} onChange={(event) => setServiceToAdd(event.target.value)} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100">
                    <option value="">{t('users.selectService')}</option>
                    {services.filter((service) => !selectedServiceIds.includes(String(service.id))).map((service) => (
                      <option key={service.id} value={service.id}>{service.name}</option>
                    ))}
                  </select>
                </label>
                <DateWithTextInput
                  label={t('users.startDate')}
                  value={serviceStartDate}
                  onChange={setServiceStartDate}
                  inline
                />
                <div className="flex items-end">
                  <Button onClick={addServiceAssignment} disabled={!serviceToAdd || serviceSaving} variant="primary" className="w-full py-3 md:w-auto">
                    <Plus className="h-4 w-4" />{serviceSaving ? t('common.saving') : t('common.add')}
                  </Button>
                </div>
              </div>

              {selectedPaymentService ? (
                <PaymentPopup
                  title={paymentForm.id ? `Edit payment #${paymentForm.id}` : 'Adauga plata'}
                  subtitle={selectedPaymentService.name
                    ? `Plata pentru ${selectedPaymentService.name}`
                    : `Plata pentru service #${paymentForm.service_id || selectedPaymentService.id}`}
                  values={paymentPopupValuesFromServiceForm(paymentForm)}
                  maxAmount={selectedPaymentMaxAmount}
                  error={paymentError}
                  success={paymentSuccess}
                  saving={paymentSaving}
                  onChange={updatePaymentPopupForm}
                  onClose={() => {
                    setPaymentServiceId(null);
                    setPaymentForm(emptyPaymentForm);
                    setPaymentError('');
                  }}
                  onSave={() => void savePayment()}
                />
              ) : null}

              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-900">{t('users.currentServices')}</h3>
                <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                  <table className="min-w-[980px] w-full text-left text-sm text-slate-700 [&_tbody_tr:nth-child(even)]:bg-slate-50/45">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="border-b border-slate-200 px-5 py-3 font-semibold">{t('services.service')}</th>
                        <th className="border-b border-slate-200 px-4 py-3 font-semibold">{t('users.added')}</th>
                        <th className="border-b border-slate-200 px-4 py-3 font-semibold">{t('users.expires')}</th>
                        <th className="border-b border-slate-200 px-4 py-3 font-semibold">{t('common.status')}</th>
                        <th className="border-b border-slate-200 px-5 py-3 font-semibold text-right">{t('common.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.services.length > 0 ? form.services.map((assignment) => {
                        const userService = mergeById(editing?.services, editing?.active_services).find((item) => item.id === assignment.id);
                        const service = services.find((item) => item.id === assignment.id) ?? userService;
                        const persistedExpiresAt = serviceExpiresAt(userService);
                        const expiresAt = persistedExpiresAt ?? addDays(assignment.start_date, service?.duration_days);
                        const serviceUserId = serviceUserIdForAssignment(assignment, editing, service);
                        const lifecycleStatus = serviceAssignmentStatus(userService ?? service, assignment);
                        const accessesUsed = assignmentValue<number>(assignment, userService ?? service, 'accesses_used') ?? 0;
                        const maxAccesses = service?.max_accesses ?? userService?.max_accesses ?? null;
                        const resumeAt = assignmentValue<string>(assignment, userService ?? service, 'resume_at');
                        const statusReason = assignmentValue<string>(assignment, userService ?? service, 'status_reason');
                        const paymentsForService = servicePayments.filter((payment) => (
                          serviceUserId
                            ? payment.model_id === serviceUserId || (payment.model_id === undefined && payment.service_id === assignment.id)
                            : payment.service_id === assignment.id
                        ));
                        return (
                          <tr key={assignment.id} className="border-b border-slate-100 align-top transition-colors hover:bg-indigo-50/30">
                            <td className="px-5 py-3">
                              <p className="font-medium text-slate-900">{service?.name ?? `#${assignment.id}`}</p>
                              <p className="text-xs text-slate-500">{service?.duration_days ? t('services.days', { count: service.duration_days }) : t('services.noAutoExpiry')}</p>
                              <p className="text-xs text-slate-500">{t('services.invoiceNumber')}: {assignment.invoice_number ?? '-'}</p>
                              <p className="text-xs text-slate-500">{t('services.billNumber')}: {assignment.bill_number ?? '-'}</p>
                              <div className="mt-3 space-y-2">
                                {paymentsForService.length ? paymentsForService.map((payment) => (
                                  <div key={payment.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div>
                                        <p className="text-xs font-semibold text-slate-900">Payment #{payment.id} - {payment.amount}</p>
                                        <p className="text-xs text-slate-500">{paymentMethodLabel(payment)} - {payment.paid_at ?? '-'}</p>
                                      </div>
                                      <div className="flex flex-wrap justify-end gap-2">
                                        {payment.status === 'confirmed' && payment.receipt_number ? (
                                          <Button onClick={() => void downloadReceipt(payment)} disabled={receiptLoadingId === payment.id} size="sm" className="px-2.5 py-1.5 text-xs">
                                            <Download className="h-3.5 w-3.5" />{t('payments.receipt')}
                                          </Button>
                                        ) : null}
                                        <Button onClick={() => editPayment(payment, service)} size="sm" className="px-2.5 py-1.5 text-xs">
                                          <Edit3 className="h-3.5 w-3.5" />{t('common.edit')}
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                )) : (
                                  <p className="text-xs text-slate-500">Nu exista plati atasate.</p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <DateWithTextInput
                                label={t('users.startDate')}
                                value={assignment.start_date ?? ''}
                                onChange={(value) => updateServiceStartDate(assignment.id, value)}
                                disabled={serviceSaving}
                              />
                            </td>
                            <td className="px-4 py-3 text-slate-600">{expiresAt ? formatDate(expiresAt) : t('services.noAutoExpiry')}</td>
                            <td className="px-4 py-3">
                              <StatusBadge status={assignmentStatusLabel(lifecycleStatus, t)} />
                              <div className="mt-2 space-y-1 text-xs text-slate-500">
                                <p>{t('services.accesses')}: {maxAccesses ? `${accessesUsed} / ${maxAccesses}` : '-'}</p>
                                {resumeAt ? <p>{t('services.resumeAt')}: {formatDate(resumeAt)}</p> : null}
                                {statusReason ? <p>{t('services.statusReason')}: {statusReason}</p> : null}
                              </div>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <div className="relative inline-block text-left">
                                <button
                                  type="button"
                                  onClick={() => setOpenServiceActionsId((currentId) => (currentId === assignment.id ? null : assignment.id))}
                                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                                  aria-expanded={openServiceActionsId === assignment.id}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                  {t('common.actions')}
                                </button>
                                {openServiceActionsId === assignment.id ? (
                                  <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white p-1.5 text-left shadow-xl shadow-slate-900/10">
                                    <button type="button" onClick={() => { setOpenServiceActionsId(null); selectServiceForPayment(assignment.id); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                                      <Plus className="h-4 w-4" />Adauga plata noua
                                    </button>
                                    {serviceUserId ? (
                                      <button type="button" onClick={() => { setOpenServiceActionsId(null); void downloadPaymentNote(serviceUserId); }} disabled={paymentNoteLoadingId === serviceUserId} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                                        <FileText className="h-4 w-4" />{paymentNoteLoadingId === serviceUserId ? t('services.generatingPaymentNote') : t('services.paymentNote')}
                                      </button>
                                    ) : null}
                                    {serviceUserId && !assignment.invoice_number ? (
                                      <button type="button" onClick={() => { setOpenServiceActionsId(null); void generateInvoice(serviceUserId); }} disabled={invoiceLoadingId === serviceUserId} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50">
                                        <FileText className="h-4 w-4" />{invoiceLoadingId === serviceUserId ? t('services.generatingInvoice') : t('services.generateInvoice')}
                                      </button>
                                    ) : null}
                                    {serviceUserId && assignment.invoice_number ? (
                                      <>
                                        <button type="button" onClick={() => { setOpenServiceActionsId(null); void downloadServiceInvoice(serviceUserId, assignment.invoice_number, 'pdf'); }} disabled={invoiceDownloadKey === `${serviceUserId}-pdf`} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                                          <Download className="h-4 w-4" />{t('services.invoicePdf')}
                                        </button>
                                        <button type="button" onClick={() => { setOpenServiceActionsId(null); void downloadServiceInvoice(serviceUserId, assignment.invoice_number, 'xml'); }} disabled={invoiceDownloadKey === `${serviceUserId}-xml`} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                                          <Download className="h-4 w-4" />{t('services.invoiceXml')}
                                        </button>
                                      </>
                                    ) : null}
                                    {serviceUserId && service && Number(service.price ?? 0) <= 0 && ['pending', 'reserved', 'expired'].includes(lifecycleStatus ?? '') ? (
                                      <button type="button" onClick={() => { setOpenServiceActionsId(null); void runLifecycleAction(serviceUserId, 'activate'); }} disabled={lifecycleSavingId === serviceUserId} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50">
                                        {t('services.activate')}
                                      </button>
                                    ) : null}
                                    {serviceUserId && ['active', 'reserved'].includes(lifecycleStatus ?? '') ? (
                                      <button type="button" onClick={() => {
                                        setOpenServiceActionsId(null);
                                        setSuspendAssignmentId(serviceUserId);
                                        setSuspendReason('');
                                        setSuspendResumeAt('');
                                      }} disabled={lifecycleSavingId === serviceUserId} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                                        {t('services.suspend')}
                                      </button>
                                    ) : null}
                                    {serviceUserId && lifecycleStatus === 'suspended' ? (
                                      <button type="button" onClick={() => { setOpenServiceActionsId(null); void runLifecycleAction(serviceUserId, 'resume'); }} disabled={lifecycleSavingId === serviceUserId} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                                        {t('services.resume')}
                                      </button>
                                    ) : null}
                                    {serviceUserId && lifecycleStatus === 'active' && maxAccesses ? (
                                      <button type="button" onClick={() => { setOpenServiceActionsId(null); void runLifecycleAction(serviceUserId, 'consume'); }} disabled={lifecycleSavingId === serviceUserId} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                                        {t('services.consume')}
                                      </button>
                                    ) : null}
                                    <div className="my-1 border-t border-slate-100" />
                                    <button type="button" onClick={() => { setOpenServiceActionsId(null); removeServiceAssignment(assignment.id); }} disabled={serviceSaving} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
                                      <Trash2 className="h-4 w-4" />{t('common.delete')}
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                              {serviceUserId && suspendAssignmentId === serviceUserId ? (
                                <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left">
                                  <Textarea label={t('services.suspendReason')} value={suspendReason} onChange={(event) => setSuspendReason(event.target.value)} />
                                  <Input label={t('services.resumeAtOptional')} type="datetime-local" value={suspendResumeAt} onChange={(event) => setSuspendResumeAt(event.target.value)} />
                                  <div className="flex justify-end gap-2">
                                    <Button onClick={() => setSuspendAssignmentId(null)}>{t('common.cancel')}</Button>
                                    <Button onClick={() => void suspendAssignment(serviceUserId)} disabled={lifecycleSavingId === serviceUserId} variant="primary">{t('services.suspend')}</Button>
                                  </div>
                                </div>
                              ) : null}
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">{t('users.noAttachedServices')}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-900">{t('users.serviceHistory')}</h3>
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                  <table className="min-w-[760px] w-full text-left text-sm text-slate-700 [&_tbody_tr:nth-child(even)]:bg-slate-50/45">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="border-b border-slate-200 px-5 py-3 font-semibold">{t('services.service')}</th>
                        <th className="border-b border-slate-200 px-4 py-3 font-semibold">{t('users.added')}</th>
                        <th className="border-b border-slate-200 px-4 py-3 font-semibold">{t('users.expires')}</th>
                        <th className="border-b border-slate-200 px-5 py-3 font-semibold">{t('common.status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serviceHistoryRows(editing).length ? serviceHistoryRows(editing).map((item) => (
                        <tr key={`${item.service_id}-${item.id ?? item.start_date}`} className="border-b border-slate-100 transition-colors hover:bg-indigo-50/30">
                          <td className="px-5 py-3 font-medium text-slate-900">{item.name}</td>
                          <td className="px-4 py-3 text-slate-600">{formatDate(item.start_date)}</td>
                          <td className="px-4 py-3 text-slate-600">{item.expires_at ? formatDate(item.expires_at) : t('services.noAutoExpiry')}</td>
                          <td className="px-5 py-3"><StatusBadge status={assignmentStatusLabel(item.status, t)} /></td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500">{t('users.noServiceHistory')}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button onClick={closeForm}>{t('common.cancel')}</Button>
            {!['services', 'grades', 'events', 'documents', 'privacy', 'activity'].includes(activeFormTab) ? <Button onClick={() => void saveUser()} disabled={saving} variant="primary">
              <Save className="h-4 w-4" />{saving ? t('users.saving') : t('common.save')}
            </Button> : null}
            {!['services', 'grades', 'events', 'documents', 'privacy', 'activity'].includes(activeFormTab) ? <Button onClick={() => void saveUser(true)} disabled={saving} variant="dark">
              <Save className="h-4 w-4" />{saving ? t('users.saving') : t('common.saveAndClose')}
            </Button> : null}
          </div>
        </SectionCard>
      </PageShell>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title={resolvedTitle}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={resetFilters} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
              <Filter className="mr-2 inline h-4 w-4" />{t('users.resetFilters')}
            </button>
            <button onClick={() => void loadUsers()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
              <RefreshCw className="mr-2 inline h-4 w-4" />{t('common.refresh')}
            </button>
            <button onClick={startCreate} className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">
              <Plus className="mr-2 inline h-4 w-4" />{resolvedAddLabel}
            </button>
          </div>
        }
      >
        <div className="mb-5 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[minmax(0,1fr)_160px_auto]">
          <Input
            label={t('common.search')}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                setPage(1);
                void fetchUsers(searchTerm, perPage, 1);
              }
            }}
            placeholder={t('users.searchPlaceholder')}
          />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">{t('users.perPage')}</span>
            <select
              value={perPage}
              onChange={(event) => {
                const nextPerPage = Number(event.target.value);
                setPerPage(nextPerPage);
                setPage(1);
                void fetchUsers(searchTerm, nextPerPage, 1);
              }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            >
              {[10, 15, 25, 50].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <div className="flex items-end">
            <button onClick={() => {
              setPage(1);
              void fetchUsers(searchTerm, perPage, 1);
            }} className="h-10 w-full rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white">{t('common.search')}</button>
          </div>
        </div>

        {error ? <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}

        <div className="mb-4 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {t('users.showingCount', { count: pagination.total || users.length, label: resolvedCountLabel })}
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
          <table className="min-w-[1120px] w-full text-left text-sm text-slate-700 [&_tbody_tr:nth-child(even)]:bg-slate-50/45">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase text-slate-500">
                <th className="border-b border-slate-200 px-5 py-3 font-semibold">{t('users.user')}</th>
                <th className="border-b border-slate-200 px-4 py-3 font-semibold">{t('users.contact')}</th>
                {showGroupsInList ? <th className="border-b border-slate-200 px-4 py-3 font-semibold">{t('users.groups')}</th> : null}
                <th className="border-b border-slate-200 px-4 py-3 font-semibold">{t('users.services')}</th>
                <th className="border-b border-slate-200 px-4 py-3 font-semibold">{t('articles.locations')}</th>
                <th className="border-b border-slate-200 px-4 py-3 font-semibold">{t('common.status')}</th>
                <th className="border-b border-slate-200 px-5 py-3 font-semibold text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? users.map((user) => (
                <tr key={user.id} className="border-b border-slate-100 align-top transition-colors hover:bg-indigo-50/30">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-slate-900">{userName(user)}</p>
                    {user.parent ? (
                      <p className="mt-1 text-xs text-slate-500">{t('users.parentUser')}: {userName(user.parent)}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <p>{user.email}</p>
                    <p className="text-xs text-slate-500">{user.phone || '-'}</p>
                  </td>
                  {showGroupsInList ? <td className="max-w-[260px] px-4 py-3 text-slate-600">{relationLabels(user.groups)}</td> : null}
                  <td className="max-w-[260px] px-4 py-3 text-slate-600">
                    <p>{userServiceLabels(user)}</p>
                    <div className="mt-2"><StatusBadge status={hasActiveService(user) ? t('users.statusActive') : t('users.noActiveService')} /></div>
                  </td>
                  <td className="max-w-[260px] px-4 py-3 text-slate-600">{relationLabels(user.locations)}</td>
                  <td className="px-4 py-3"><StatusBadge status={user.active ? t('users.statusActive') : t('users.statusInactive')} /></td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => void startEdit(user)} className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        <Edit3 className="mr-2 h-4 w-4" />{t('common.edit')}
                      </button>
                      <button onClick={() => void deleteUser(user)} className="inline-flex h-9 items-center rounded-lg border border-red-100 px-3 text-sm font-medium text-red-600 hover:bg-red-50">
                        <Trash2 className="mr-2 h-4 w-4" />{t('common.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={showGroupsInList ? 7 : 6} className="py-10 text-center text-sm text-slate-500">{loading ? t('users.loadingList', { label: resolvedCountLabel }) : t('users.emptyList', { label: resolvedCountLabel })}</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
          <span>{t('users.pageOf', { page: pagination.current_page, lastPage: pagination.last_page })}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void loadUsers(page - 1)}
              disabled={loading || page <= 1}
              className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />{t('users.previousPage')}
            </button>
            <button
              onClick={() => void loadUsers(page + 1)}
              disabled={loading || page >= pagination.last_page}
              className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t('users.nextPage')}<ChevronRight className="ml-1 h-4 w-4" />
            </button>
          </div>
        </div>
      </SectionCard>

    </div>
  );
}

export type MembersViewProps = Omit<UserManagementViewProps, 'resource'>;

export function MembersView(props: MembersViewProps = {}) {
  return <UserManagementView resource="clients" {...props} />;
}
