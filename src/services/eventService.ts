import { endpoint, extractErrorMessage, parseJsonResponse } from '../api/apiCore';
import { TOKEN_KEY, erpApiService, getApiBaseUrl } from './ErpApiService';

export type EventStatus = 'active' | 'inactive' | 'cancelled';
export type RecurrenceType = 'once' | 'weekly' | 'monthly';
export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type OccurrenceStatus = 'scheduled' | 'cancelled' | 'completed';
export type ParticipantStatus = 'registered' | 'attended' | 'cancelled' | 'no_show';
export type EventPaymentType = string;

export type PaginationMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type Paginated<T> = {
  data: T[];
  meta?: PaginationMeta;
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
};

export type EventService = {
  id: number;
  name: string;
};

// Resolved reference objects embedded in `EventItem` (via `whenLoaded()` on the API side).
// Only `{id, name}` is guaranteed regardless of how rich the underlying model is.
export type EventLocation = {
  id: number;
  name: string;
};

export type EventInstructor = {
  id: number;
  name: string;
};

export type EventGroup = {
  id: number;
  name: string;
};

export type EventCategory = {
  id: number;
  name: string;
  color: string | null;
  description: string | null;
  is_active: boolean;
  events_count?: number;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
};

export type EventUser = {
  id: number;
  user_code?: string | null;
  name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string | null;
  has_active_service?: boolean;
  active_services?: EventService[];
};

export type EventItem = {
  id: number;
  category_id: number | null;
  category?: EventCategory | null;
  // Structured location/instructor/group, resolved server-side from the matching
  // `*_id` foreign key (`whenLoaded()`). `null` when the relation isn't set or
  // wasn't eager-loaded by the endpoint that returned this event.
  location_id: number | null;
  location?: EventLocation | null;
  instructor_id: number | null;
  instructor?: EventInstructor | null;
  group_id: number | null;
  group?: EventGroup | null;
  title: string;
  description: string | null;
  // Free-text fallback location label (legacy `location` column, used for
  // ad-hoc events without a structured `location_id`). Not the same as
  // `location` above, which is the resolved `location_id` relation.
  location_text: string | null;
  start_time: string;
  end_time: string;
  recurrence_type: RecurrenceType;
  recurrence_days: Weekday[] | null;
  monthly_day: number | null;
  start_date: string;
  end_date: string | null;
  requires_active_service: boolean;
  required_service_id: number | null;
  required_service?: EventService | null;
  requires_payment: boolean;
  payment_amount: string | number | null;
  payment_type: EventPaymentType | null;
  max_participants: number | null;
  status: EventStatus;
  occurrences_count?: number;
  occurrences?: EventOccurrence[];
  created_at?: string | null;
  updated_at?: string | null;
};

// Write payload: the resolved relation objects (`location`/`instructor`/`group`/`category`/
// `required_service`) are read-only API output, not accepted on create/update. The backend
// still accepts the free-text fallback label under the `location` key (returned back as
// `location_text`), so it's re-added here as a plain string field.
export type EventPayload = Omit<EventItem, 'id' | 'created_at' | 'updated_at' | 'required_service' | 'category' | 'location' | 'instructor' | 'group' | 'location_text'> & {
  location?: string | null;
};

export type EventOccurrence = {
  id: number;
  event_id: number;
  occurrence_date: string;
  start_datetime: string;
  end_datetime: string;
  status: OccurrenceStatus;
  participants_count: number;
  available_places: number | null;
  event?: EventItem;
};

export type EventParticipant = {
  id?: number;
  pivot_id?: number | null;
  user_id?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  user?: EventUser;
  status: ParticipantStatus;
  registered_at: string;
  notes: string | null;
};

export type EventFilters = {
  page?: number;
  per_page?: number;
  search?: string;
  category_id?: string;
  status?: string;
  recurrence_type?: string;
  requires_active_service?: string;
  requires_payment?: string;
  sort?: 'created_at' | 'start_date' | 'title';
  direction?: 'asc' | 'desc';
};

export type OccurrenceFilters = {
  date_from?: string;
  date_to?: string;
  status?: string;
  category_id?: string;
  page?: number;
  per_page?: number;
};

export type EligibleParticipantFilters = {
  search?: string;
  page?: number;
  per_page?: number;
};

export type AddParticipantPayload = {
  user_id: number;
  status?: ParticipantStatus;
  registered_at?: string | null;
  notes?: string | null;
};

export type BulkAddParticipantsPayload = {
  user_ids: number[];
  status?: ParticipantStatus;
  registered_at?: string | null;
  notes?: string | null;
  apply_to_future_occurrences?: boolean;
};

export type FutureOccurrenceSkip = {
  user_id: number;
  reason: string;
};

export type FutureOccurrenceUpdate = {
  occurrence_id: number;
  occurrence_date: string;
  added_user_ids: number[];
  skipped: FutureOccurrenceSkip[];
};

export type BulkAddParticipantsResponse = {
  success?: boolean;
  message?: string;
  data: EventParticipant[];
  requires_payment?: boolean;
  future_occurrences_updated?: FutureOccurrenceUpdate[];
};

export type UpdateParticipantStatusPayload = {
  status: ParticipantStatus;
  notes?: string | null;
};

export type EventCategoryPayload = {
  name: string;
  color?: string | null;
  description?: string | null;
  is_active?: boolean;
};

export type ApiValidationError = Error & {
  status?: number;
  errors?: Record<string, string[]>;
};

function unwrap<T>(payload: T | { data?: T }) {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const envelope = payload as { data?: T };
    if (Array.isArray(envelope.data) && ('meta' in payload || 'current_page' in payload || 'links' in payload)) return payload as T;
    return envelope.data as T;
  }
  return payload as T;
}

function normalizeError(error: unknown): ApiValidationError {
  return (error instanceof Error ? error : new Error('Cererea catre API a esuat.')) as ApiValidationError;
}

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return `${getApiBaseUrl().replace(/\/$/, '')}/${path.replace(/^\//, '')}${query.size ? `?${query.toString()}` : ''}`;
}

async function request<T>(path: string, options: RequestInit = {}, params?: Record<string, string | number | boolean | undefined>, requestOptions?: { raw?: boolean }) {
  try {
    const headers = new Headers(options.headers);
    headers.set('Accept', 'application/json');
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

    const token = window.localStorage.getItem(TOKEN_KEY);
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const response = await fetch(buildUrl(path, params), { ...options, headers });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;
    if (!response.ok) {
      if (response.status === 401) erpApiService.clearToken();
      const normalized = new Error(payload?.message ?? 'Cererea catre API a esuat.') as ApiValidationError;
      normalized.status = response.status;
      normalized.errors = payload?.errors;
      throw normalized;
    }
    // `raw` skips the `{ data: ... }` unwrap so callers can read sibling
    // envelope fields (e.g. `future_occurrences_updated`) alongside `data`.
    return requestOptions?.raw ? (payload as T) : unwrap<T>(payload as T | { data?: T });
  } catch (error) {
    throw normalizeError(error);
  }
}

async function downloadOccurrenceParticipantsPdf(occurrenceId: number) {
  const response = await fetch(endpoint(`/event-occurrences/${occurrenceId}/participants/download/pdf`), {
    headers: {
      Accept: 'application/pdf',
      ...(window.localStorage.getItem(TOKEN_KEY) ? { Authorization: `Bearer ${window.localStorage.getItem(TOKEN_KEY)}` } : {}),
    },
  });
  if (!response.ok) {
    const payload = await parseJsonResponse(response);
    throw new Error(extractErrorMessage(payload, `Cererea a esuat (${response.status}).`));
  }
  return response.blob();
}

export const eventService = {
  getCategories: (params: { page?: number; per_page?: number; search?: string; is_active?: string } = {}) => request<Paginated<EventCategory>>('/event-categories', {}, params),
  getCategory: (id: number) => request<EventCategory>(`/event-categories/${id}`),
  createCategory: (payload: EventCategoryPayload) => request<EventCategory>('/event-categories', { method: 'POST', body: JSON.stringify(payload) }),
  updateCategory: (id: number, payload: EventCategoryPayload) => request<EventCategory>(`/event-categories/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteCategory: (id: number) => request<void>(`/event-categories/${id}`, { method: 'DELETE' }),
  getEvents: (params: EventFilters = {}) => request<Paginated<EventItem>>('/events', {}, params),
  getEvent: (id: number) => request<EventItem>(`/events/${id}`),
  createEvent: (payload: EventPayload) => request<EventItem>('/events', { method: 'POST', body: JSON.stringify(payload) }),
  updateEvent: (id: number, payload: EventPayload) => request<EventItem>(`/events/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteEvent: (id: number) => request<void>(`/events/${id}`, { method: 'DELETE' }),
  getEventOccurrences: (eventId: number, params: OccurrenceFilters = {}) => request<Paginated<EventOccurrence>>(`/events/${eventId}/occurrences`, {}, params),
  getAllOccurrences: (params: OccurrenceFilters = {}) => request<Paginated<EventOccurrence>>('/event-occurrences', {}, params),
  getOccurrence: (id: number) => request<EventOccurrence>(`/event-occurrences/${id}`),
  cancelOccurrence: (id: number) => request<EventOccurrence>(`/event-occurrences/${id}/cancel`, { method: 'PATCH' }),
  getEligibleOccurrenceParticipants: (occurrenceId: number, params: EligibleParticipantFilters = {}) => request<Paginated<EventUser> | EventUser[]>(`/event-occurrences/${occurrenceId}/eligible-participants`, {}, params),
  getOccurrenceParticipants: (occurrenceId: number) => request<Paginated<EventParticipant> | EventParticipant[]>(`/event-occurrences/${occurrenceId}/participants`, {}, { per_page: 100 }),
  addOccurrenceParticipant: (occurrenceId: number, payload: AddParticipantPayload) => request<EventParticipant>(`/event-occurrences/${occurrenceId}/participants`, { method: 'POST', body: JSON.stringify(payload) }),
  bulkAddOccurrenceParticipants: (occurrenceId: number, payload: BulkAddParticipantsPayload) => request<BulkAddParticipantsResponse>(`/event-occurrences/${occurrenceId}/participants/bulk`, { method: 'POST', body: JSON.stringify(payload) }, undefined, { raw: true }),
  removeOccurrenceParticipant: (occurrenceId: number, userId: number) => request<void>(`/event-occurrences/${occurrenceId}/participants/${userId}`, { method: 'DELETE' }),
  updateOccurrenceParticipantStatus: (occurrenceId: number, userId: number, payload: UpdateParticipantStatusPayload) => request<EventParticipant>(`/event-occurrences/${occurrenceId}/participants/${userId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  downloadOccurrenceParticipantsPdf,
  searchUsers: (search: string, page = 1, perPage = 10) => request<Paginated<EventUser> | EventUser[]>('/users', {}, { search, page, per_page: perPage }),
  searchUsersByCard: (cardCode: string, page = 1, perPage = 10) => request<Paginated<EventUser> | EventUser[]>('/users/search/user-code', {}, { search: cardCode, page, per_page: perPage }),
  getServices: () => request<EventService[] | Paginated<EventService>>('/services', {}, { per_page: 100, is_active: 1 }),
  // Reference data for the location_id/instructor_id/group_id selects on `EventForm`.
  // These reuse the same endpoints already owned by the Branches (`/locations`), Members
  // (`/administrators`, staff-only) and Groups & Rights (`/groups`) modules instead of
  // duplicating resources — see `ErpApiService`/`BranchesView`/`GroupsRightsView`/`AdminsView`.
  getLocations: (params: { search?: string; per_page?: number } = {}) => request<EventLocation[] | Paginated<EventLocation>>('/locations', {}, { per_page: 100, ...params }),
  getInstructors: (params: { search?: string; per_page?: number } = {}) => request<EventUser[] | Paginated<EventUser>>('/administrators', {}, { per_page: 100, ...params }),
  getGroups: (params: { search?: string; per_page?: number } = {}) => request<EventGroup[] | Paginated<EventGroup>>('/groups', {}, { per_page: 100, ...params }),
};

export const payloadExamples = {
  create: {
    title: 'Yoga saptamanal',
    description: 'Clasa pentru membri activi',
    location: 'Sala 1',
    start_time: '18:00',
    end_time: '19:00',
    recurrence_type: 'weekly',
    recurrence_days: ['monday', 'wednesday'],
    monthly_day: null,
    start_date: '2026-06-01',
    end_date: '2026-12-31',
    requires_active_service: true,
    required_service_id: 3,
    max_participants: 20,
    status: 'active',
  },
  update: {
    title: 'Yoga saptamanal avansati',
    status: 'active',
  },
  addParticipant: {
    user_id: 42,
    status: 'registered',
    notes: 'Preferinta randul 2',
  },
};
