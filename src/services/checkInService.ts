import { erpApiService, type ApiUser, type ApiUserService } from './ErpApiService';
import type { EventOccurrence, EventParticipant } from './eventService';

export type CheckInVerdict =
  | 'allowed'
  | 'already_present'
  | 'requires_payment'
  | 'document_expired'
  | 'refused'
  | 'not_found'
  | 'override_allowed';

export type CheckInResult = {
  member_found: boolean;
  member: ApiUser | null;
  verdict: CheckInVerdict;
  access_allowed: boolean;
  reason: string | null;
  requires_payment: boolean;
  document_expired: boolean;
  active_subscription: boolean;
  eligible_services: ApiUserService[];
  last_check_in: { occurrence_id: number; event_title?: string | null; registered_at?: string | null; status?: string | null } | null;
  occurrence: EventOccurrence | null;
  participant?: EventParticipant | null;
};

export const checkInService = {
  currentOccurrences: () => erpApiService.list<EventOccurrence>('check-ins/occurrences/current'),
  search: (query: string, occurrenceId?: number | null) => erpApiService.create<CheckInResult>('check-ins/search', { query, occurrence_id: occurrenceId ?? null }),
  confirm: (userId: number, occurrenceId: number, allowOverride = false) => erpApiService.create<CheckInResult>('check-ins/confirm', { user_id: userId, occurrence_id: occurrenceId, allow_override: allowOverride }),
};
