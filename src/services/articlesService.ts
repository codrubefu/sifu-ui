import { erpApiService } from './ErpApiService';

export type ArticleRelation = {
  id: number;
  name?: string;
  label?: string;
  title?: string;
};

export type Article = {
  id: number;
  title: string;
  description: string;
  publish_at?: string | null;
  expires_at?: string | null;
  priority?: number | null;
  status?: ArticleStatus;
  audience_segment?: ArticleAudienceSegment;
  segment_id?: number | null;
  groups?: ArticleRelation[] | number[];
  locations?: ArticleRelation[] | number[];
  delivered_at?: string | null;
  viewed_at?: string | null;
};

export type ArticleStatus = 'draft' | 'scheduled' | 'published' | 'expired';
export type ArticleAudienceSegment = 'all_users' | 'active_subscribers' | 'expired_users' | 'groups' | 'locations';

export type ArticlePayload = {
  title: string;
  description: string;
  publish_at?: string | null;
  expires_at?: string | null;
  priority?: number;
  status?: ArticleStatus;
  audience_segment?: ArticleAudienceSegment;
  segment_id?: number | null;
  groups: number[];
  locations: number[];
};

type CollectionEnvelope<T> = {
  data?: T[];
};

function normalizeCollection<T>(payload: T[] | CollectionEnvelope<T>): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

function ids(items: ArticleRelation[] | number[] | undefined): number[] {
  return (items ?? []).map((item) => Number(typeof item === 'object' ? item.id : item)).filter(Boolean);
}

function articlePayload(data: ArticlePayload): ArticlePayload {
  return {
    title: data.title,
    description: data.description,
    publish_at: data.publish_at || null,
    expires_at: data.expires_at || null,
    priority: Number(data.priority ?? 0),
    status: data.status ?? 'draft',
    audience_segment: data.audience_segment ?? 'all_users',
    segment_id: data.segment_id || null,
    groups: ids(data.groups),
    locations: ids(data.locations),
  };
}

export const articlesService = {
  list(filters: Record<string, string | number | undefined> = {}) {
    return erpApiService.list<Article>('articles', filters);
  },
  get(id: string | number | undefined) {
    return erpApiService.get<Article>('articles', Number(id));
  },
  create(data: ArticlePayload) {
    return erpApiService.create<Article>('articles', { ...articlePayload(data) });
  },
  update(id: string | number | undefined, data: ArticlePayload) {
    return erpApiService.update<Article>('articles', Number(id), { ...articlePayload(data) });
  },
  remove(id: string | number | undefined) {
    return erpApiService.remove('articles', Number(id));
  },
  feed(filters: Record<string, string | number | undefined> = {}) {
    return erpApiService.listPaginated<Article>('articles-feed', filters);
  },
  markViewed(id: string | number | undefined) {
    return erpApiService.create<Article>(`articles/${Number(id)}/view`, {});
  },
  async groups() {
    return normalizeCollection(await erpApiService.list<ArticleRelation>('groups'));
  },
  async locations() {
    return normalizeCollection(await erpApiService.list<ArticleRelation>('locations'));
  },
  async segments() {
    return normalizeCollection(await erpApiService.list<ArticleRelation>('segments'));
  },
};
