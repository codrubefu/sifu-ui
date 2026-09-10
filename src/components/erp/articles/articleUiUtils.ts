import type { ArticleRelation } from '../../../services/articlesService';

export function names(items?: ArticleRelation[] | number[]) {
  return (items ?? []).map((item) => (typeof item === 'object' ? item.label || item.name || item.title || `#${item.id}` : `#${item}`)).join(', ') || '-';
}

export function normalizeList<T>(payload: T[] | { data?: T[] }) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}
