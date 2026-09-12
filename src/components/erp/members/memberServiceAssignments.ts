import type { useTranslation } from 'react-i18next';
import type { ApiService, ApiUser, ApiUserService, ApiUserServiceAssignment, ServiceAssignmentStatus } from '../../../services/ErpApiService';

export function relationLabels(items?: Array<{ id?: number; label?: string; name?: string }>) {
  if (!items?.length) return '-';
  return items.map((item) => item.label || item.name || `#${item.id}`).join(', ');
}

export function mergeById<T extends { id?: number }>(...groups: Array<T[] | undefined>) {
  const items = new Map<number, T>();
  groups.flatMap((group) => group ?? []).forEach((item) => {
    if (item.id) items.set(item.id, { ...items.get(item.id), ...item });
  });
  return Array.from(items.values());
}

export function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export function serviceAssignmentsFromUser(user: ApiUser): ApiUserServiceAssignment[] {
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

export function serviceUserIdForAssignment(
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

export function hasActiveService(user: ApiUser) {
  return user.has_active_service ?? Boolean(user.active_services?.length);
}

export function addDays(date: string | undefined, days: number | null | undefined) {
  if (!date || !days) return null;
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setDate(parsed.getDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function serviceStartDate(service?: ApiService | ApiUserService | null) {
  return service?.start_date ?? service?.pivot?.start_date ?? null;
}

export function serviceExpiresAt(service?: ApiService | ApiUserService | null) {
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

export function serviceAssignmentStatus(service?: ApiService | ApiUserService | null, assignment?: ApiUserServiceAssignment): ServiceAssignmentStatus | null {
  return assignment?.status ?? service?.status ?? service?.pivot?.status ?? null;
}

export function assignmentValue<T>(
  assignment: ApiUserServiceAssignment | undefined,
  service: ApiService | ApiUserService | null | undefined,
  field: 'accesses_used' | 'suspended_at' | 'resume_at' | 'status_reason' | 'activation_payment_id' | 'expires_at',
): T | null {
  return (assignment?.[field] ?? service?.[field] ?? service?.pivot?.[field] ?? null) as T | null;
}

export function assignmentStatusLabel(status: ServiceAssignmentStatus | null | undefined, t: ReturnType<typeof useTranslation>['t']) {
  return status ? t(`services.assignmentStatuses.${status}`) : '-';
}

export function serviceHistoryRows(user: ApiUser | null) {
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

export function userServiceLabels(user: ApiUser) {
  return relationLabels(mergeById(user.services, user.active_services));
}
