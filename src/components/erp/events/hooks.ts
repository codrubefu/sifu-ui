import { useCallback, useEffect, useState } from 'react';
import { eventService, type EventFilters, type EventItem, type EventOccurrence, type EventParticipant, type OccurrenceFilters, type Paginated, type PaginationMeta } from '../../../services/eventService';

function metaFrom<T>(payload: Paginated<T>): PaginationMeta {
  return payload.meta ?? {
    current_page: payload.current_page ?? 1,
    last_page: payload.last_page ?? 1,
    per_page: payload.per_page ?? payload.data?.length ?? 15,
    total: payload.total ?? payload.data?.length ?? 0,
  };
}

export function useEvents(params: EventFilters) {
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
      setError(err instanceof Error ? err.message : 'Nu am putut incarca evenimentele.');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { events, meta, loading, error, reload };
}

export function useEvent(id?: number) {
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
      setError(err instanceof Error ? err.message : 'Nu am putut incarca evenimentul.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { event, loading, error, reload };
}

export function useEventOccurrences(eventId?: number, params: OccurrenceFilters = {}) {
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
      setError(err instanceof Error ? err.message : 'Nu am putut incarca aparitiile.');
    } finally {
      setLoading(false);
    }
  }, [eventId, params]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { occurrences, loading, error, reload };
}

export function useEventParticipants(occurrenceId?: number) {
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
      setError(err instanceof Error ? err.message : 'Nu am putut incarca participantii.');
    } finally {
      setLoading(false);
    }
  }, [occurrenceId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { participants, loading, error, reload };
}
