import type { EventItem, EventStatus, OccurrenceStatus, ParticipantStatus, Weekday } from '../../../services/eventService';

export type CalendarMode = 'month' | 'week';

export const weekdays: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
export const weekdayLabelKeys: Record<Weekday, string> = { monday: 'events.weekdays.monday', tuesday: 'events.weekdays.tuesday', wednesday: 'events.weekdays.wednesday', thursday: 'events.weekdays.thursday', friday: 'events.weekdays.friday', saturday: 'events.weekdays.saturday', sunday: 'events.weekdays.sunday' };
export const eventStatuses: EventStatus[] = ['active', 'inactive', 'cancelled'];
export const occurrenceStatuses: OccurrenceStatus[] = ['scheduled', 'cancelled', 'completed'];
export const participantStatuses: ParticipantStatus[] = ['registered', 'attended', 'cancelled', 'no_show'];

export function fieldError(errors?: Record<string, string[]>, name?: string) {
  if (!errors || !name) return '';
  return errors[name]?.[0] ?? '';
}

export function flattenApiErrors(errors?: Record<string, string[]>) {
  if (!errors) return '';
  return Object.values(errors).flat().join('\n');
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function timeToHourMinute(value?: string | null) {
  if (!value) return '';
  const timePart = value.includes('T') ? value.split('T')[1] : value;
  return timePart.slice(0, 5);
}

export function dateToDateInput(value?: string | null) {
  return value ? value.slice(0, 10) : null;
}

// `event.location` is the resolved `location_id` relation (`{id, name}`), not the legacy
// free-text column anymore (see `location_text`). Prefer the structured location's name and
// fall back to the free-text label for ad-hoc events without a `location_id`.
export function eventLocationLabel(event: Pick<EventItem, 'location' | 'location_text'>) {
  return event.location?.name || event.location_text || '';
}

export function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay() || 7;
  next.setDate(next.getDate() - day + 1);
  return next;
}

export function startOfMonthGrid(date: Date) {
  return startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function calendarRange(anchor: Date, mode: CalendarMode) {
  if (mode === 'week') {
    const start = startOfWeek(anchor);
    return { start, end: addDays(start, 6) };
  }

  const start = startOfMonthGrid(anchor);
  return { start, end: addDays(start, 41) };
}

export function calendarFetchRange(anchor: Date, mode: CalendarMode) {
  if (mode === 'week') return calendarRange(anchor, mode);

  return {
    start: new Date(anchor.getFullYear(), anchor.getMonth(), 1),
    end: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0),
  };
}
