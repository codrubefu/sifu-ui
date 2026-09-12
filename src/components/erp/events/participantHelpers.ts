import { eventService, type EventParticipant, type EventUser, type FutureOccurrenceUpdate } from '../../../services/eventService';

export function userLabel(user: EventUser) {
  return user.name || `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email;
}

export function participantUserId(participant: { id?: number; user_id?: number }) {
  return participant.user_id ?? participant.id ?? 0;
}

export function participantPaymentModelId(participant: EventParticipant) {
  return participant.pivot_id ?? null;
}

export function participantName(participant: EventParticipant) {
  return participant.user?.name || `${participant.user?.first_name ?? participant.first_name ?? ''} ${participant.user?.last_name ?? participant.last_name ?? ''}`.trim() || '-';
}

export function hasActiveService(user: EventUser) {
  if (typeof user.has_active_service === 'boolean') return user.has_active_service;
  return Boolean(user.active_services?.length);
}

export function usersFromPayload(payload: Awaited<ReturnType<typeof eventService.searchUsers>> | Awaited<ReturnType<typeof eventService.getEligibleOccurrenceParticipants>>) {
  return Array.isArray(payload) ? payload : payload.data ?? [];
}

export function usersFromCardPayload(payload: Awaited<ReturnType<typeof eventService.searchUsersByCard>>) {
  return Array.isArray(payload) ? payload : payload.data ?? [];
}

export function summarizeFutureOccurrences(updates: FutureOccurrenceUpdate[]) {
  const occurrencesWithAdds = updates.filter((update) => update.added_user_ids.length > 0).length;
  const skippedCount = updates.reduce((sum, update) => sum + update.skipped.length, 0);
  return { occurrencesWithAdds, skippedCount };
}
