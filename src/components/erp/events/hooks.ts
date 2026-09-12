import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { eventService, type EventCategory, type EventFilters, type EventItem, type EventOccurrence, type EventParticipant, type EventUser, type OccurrenceFilters, type Paginated, type PaginationMeta } from '../../../services/eventService';
import { useAuth } from '../../../context/useAuth';

export function usePermissions() {
  const { hasAnyRight } = useAuth();
  return {
    canViewEvents: hasAnyRight(['events.view', 'events.manage']),
    canManageEvents: hasAnyRight(['events.manage']),
    canViewParticipants: hasAnyRight(['event_participants.view', 'event_participants.manage']),
    canManageParticipants: hasAnyRight(['event_participants.manage']),
  };
}

function metaFrom<T>(payload: Paginated<T>): PaginationMeta {
  return payload.meta ?? {
    current_page: payload.current_page ?? 1,
    last_page: payload.last_page ?? 1,
    per_page: payload.per_page ?? payload.data?.length ?? 15,
    total: payload.total ?? payload.data?.length ?? 0,
  };
}

export function useEvents(params: EventFilters) {
  const { t } = useTranslation();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ current_page: 1, last_page: 1, per_page: 15, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await eventService.getEvents(params);
      setEvents(payload.data ?? []);
      setMeta(metaFrom(payload));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('events.loadEventsError'));
    } finally {
      setLoading(false);
    }
  }, [params, t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { events, meta, loading, error, reload };
}

export function useEvent(id?: number) {
  const { t } = useTranslation();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      setEvent(await eventService.getEvent(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('events.loadEventError'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { event, loading, error, reload };
}

export function useEventOccurrences(eventId?: number, params: OccurrenceFilters = {}) {
  const { t } = useTranslation();
  const [occurrences, setOccurrences] = useState<EventOccurrence[]>([]);
  const [loading, setLoading] = useState(Boolean(eventId));
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError('');
    try {
      const payload = await eventService.getEventOccurrences(eventId, params);
      setOccurrences(payload.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('events.loadOccurrencesError'));
    } finally {
      setLoading(false);
    }
  }, [eventId, params, t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { occurrences, loading, error, reload };
}

export function useEventParticipants(occurrenceId?: number) {
  const { t } = useTranslation();
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [loading, setLoading] = useState(Boolean(occurrenceId));
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!occurrenceId) return;
    setLoading(true);
    setError('');
    try {
      const payload = await eventService.getOccurrenceParticipants(occurrenceId);
      setParticipants(Array.isArray(payload) ? payload : payload.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('events.loadParticipantsError'));
    } finally {
      setLoading(false);
    }
  }, [occurrenceId, t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { participants, loading, error, reload };
}

// Reference data (categories, locations, instructors, groups) shared across the events
// module. Previously `EventsPage`, `EventForm`, and `EventCalendarPage` each fetched
// categories independently on mount. This hook centralizes those fetches with a simple
// module-level cache (no react-query/SWR — YAGNI, consistent with this file's style): the
// first component to mount triggers the request, every other mount within the same browser
// session reuses the in-flight promise or the already-resolved list, so each resource is
// only fetched once per navigation session instead of once per page.
export type EventReferenceOption = { id: number; name: string };

function instructorLabel(user: EventUser) {
  return user.name || `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email || `#${user.id}`;
}

let categoriesCache: EventCategory[] | null = null;
let categoriesPromise: Promise<EventCategory[]> | null = null;
let locationsCache: EventReferenceOption[] | null = null;
let locationsPromise: Promise<EventReferenceOption[]> | null = null;
let instructorsCache: EventReferenceOption[] | null = null;
let instructorsPromise: Promise<EventReferenceOption[]> | null = null;
let groupsCache: EventReferenceOption[] | null = null;
let groupsPromise: Promise<EventReferenceOption[]> | null = null;

function loadCategories(): Promise<EventCategory[]> {
  if (categoriesCache) return Promise.resolve(categoriesCache);
  if (!categoriesPromise) {
    categoriesPromise = eventService.getCategories({ per_page: 100, is_active: '1' })
      .then((payload) => {
        categoriesCache = payload.data ?? [];
        return categoriesCache;
      })
      .catch((err) => {
        categoriesPromise = null;
        throw err;
      });
  }
  return categoriesPromise;
}

function loadLocations(): Promise<EventReferenceOption[]> {
  if (locationsCache) return Promise.resolve(locationsCache);
  if (!locationsPromise) {
    locationsPromise = eventService.getLocations()
      .then((payload) => {
        const items = Array.isArray(payload) ? payload : payload.data ?? [];
        locationsCache = items.map((item) => ({ id: item.id, name: item.name }));
        return locationsCache;
      })
      .catch((err) => {
        locationsPromise = null;
        throw err;
      });
  }
  return locationsPromise;
}

function loadInstructors(): Promise<EventReferenceOption[]> {
  if (instructorsCache) return Promise.resolve(instructorsCache);
  if (!instructorsPromise) {
    instructorsPromise = eventService.getInstructors()
      .then((payload) => {
        const items = Array.isArray(payload) ? payload : payload.data ?? [];
        instructorsCache = items.map((item) => ({ id: item.id, name: instructorLabel(item) }));
        return instructorsCache;
      })
      .catch((err) => {
        instructorsPromise = null;
        throw err;
      });
  }
  return instructorsPromise;
}

function loadGroups(): Promise<EventReferenceOption[]> {
  if (groupsCache) return Promise.resolve(groupsCache);
  if (!groupsPromise) {
    groupsPromise = eventService.getGroups()
      .then((payload) => {
        const items = Array.isArray(payload) ? payload : payload.data ?? [];
        groupsCache = items.map((item) => ({ id: item.id, name: item.name }));
        return groupsCache;
      })
      .catch((err) => {
        groupsPromise = null;
        throw err;
      });
  }
  return groupsPromise;
}

// Categories are also managed (created/edited/deleted) from `EventCategoriesPage` within
// this same module; call this after a successful category CRUD so the next mount of the
// shared hook reflects the change instead of serving a session-stale cached list. Locations/
// instructors/groups are managed outside the events module (Branches/Members/Access), so
// they don't need an equivalent invalidation hook here.
export function invalidateEventCategoriesCache() {
  categoriesCache = null;
  categoriesPromise = null;
}

export function useEventReferenceData() {
  const [categories, setCategories] = useState<EventCategory[]>(categoriesCache ?? []);
  const [locations, setLocations] = useState<EventReferenceOption[]>(locationsCache ?? []);
  const [instructors, setInstructors] = useState<EventReferenceOption[]>(instructorsCache ?? []);
  const [groups, setGroups] = useState<EventReferenceOption[]>(groupsCache ?? []);
  const [loading, setLoading] = useState(!categoriesCache || !locationsCache || !instructorsCache || !groupsCache);

  useEffect(() => {
    let active = true;
    // `loading`'s initial value (above) already reflects whether every resource is cached,
    // so it doesn't need to be re-set to `true` here on every mount.
    Promise.all([
      loadCategories().then((data) => { if (active) setCategories(data); }).catch(() => { if (active) setCategories([]); }),
      loadLocations().then((data) => { if (active) setLocations(data); }).catch(() => { if (active) setLocations([]); }),
      loadInstructors().then((data) => { if (active) setInstructors(data); }).catch(() => { if (active) setInstructors([]); }),
      loadGroups().then((data) => { if (active) setGroups(data); }).catch(() => { if (active) setGroups([]); }),
    ]).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return { categories, locations, instructors, groups, loading };
}
