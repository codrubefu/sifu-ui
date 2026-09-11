import { Edit3, Eye, Plus, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Modal, SectionCard } from '../../primitives';
import { articlesService, type Article, type ArticleRelation } from '../../../services/articlesService';
import { names, normalizeList } from './articleUiUtils';
import { Toast } from './ui';
import { Can } from '../../Can';
import { ProtectedRoute } from '../../ProtectedRoute';
import { useAuth } from '../../../context/useAuth';
import { useTranslation } from 'react-i18next';
import { formatApiDate } from '../../../utils/erp/formatters';

function labelFor(item: ArticleRelation) {
  return item.label || item.name || item.title || `#${item.id}`;
}

function matchesRelation(items: Article['groups'] | Article['locations'], id: string) {
  if (!id) return true;
  return (items ?? []).some((item) => Number(typeof item === 'object' ? item.id : item) === Number(id));
}

function statusClass(status?: string) {
  if (status === 'published') return 'bg-emerald-50 text-emerald-700';
  if (status === 'scheduled') return 'bg-blue-50 text-blue-700';
  if (status === 'expired') return 'bg-slate-100 text-slate-600';
  return 'bg-amber-50 text-amber-700';
}

export default function ArticlesList() {
  const { t } = useTranslation();
  const { hasAnyRight } = useAuth();
  const canCreateArticle = hasAnyRight(['articles.create', 'articles.manage']);
  const location = useLocation();
  const [articles, setArticles] = useState<Article[]>([]);
  const [groups, setGroups] = useState<ArticleRelation[]>([]);
  const [locations, setLocations] = useState<ArticleRelation[]>([]);
  const [filters, setFilters] = useState({ search: '', group: '', location: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const routeState = location.state as { message?: string } | null;
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(routeState?.message ? { type: 'success', message: routeState.message } : null);
  const [deleting, setDeleting] = useState<Article | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextArticles, nextGroups, nextLocations] = await Promise.all([
        articlesService.list({ search: filters.search, group_id: filters.group, location_id: filters.location }),
        articlesService.groups(),
        articlesService.locations(),
      ]);
      setArticles(normalizeList(nextArticles));
      setGroups(nextGroups);
      setLocations(nextLocations);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('articles.loadError'));
    } finally {
      setLoading(false);
    }
  }, [filters.group, filters.location, filters.search, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleArticles = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return articles.filter((article) => {
      const haystack = `${article.title ?? ''} ${article.description ?? ''}`.toLowerCase();
      return (!search || haystack.includes(search)) && matchesRelation(article.groups, filters.group) && matchesRelation(article.locations, filters.location);
    });
  }, [articles, filters]);

  const remove = async () => {
    if (!deleting) return;
    try {
      await articlesService.remove(deleting.id);
      setDeleting(null);
      setToast({ type: 'success', message: t('articles.deleted') });
      await load();
    } catch (err) {
      setToast({ type: 'error', message: err instanceof Error ? err.message : t('articles.deleteError') });
    }
  };

  return (
    <ProtectedRoute requiredRights={['articles.view', 'articles.manage']}>
      <div className="space-y-6">
      {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
      <SectionCard title={t('articles.title')} action={canCreateArticle ? <Link to="/erp/articles/create" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"><Plus className="h-4 w-4" />{t('articles.add')}</Link> : null}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-700">{t('articles.searchLabel')}</span>
            <input value={filters.search} onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">{t('articles.groups')}</span>
            <select value={filters.group} onChange={(event) => setFilters((prev) => ({ ...prev, group: event.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"><option value="">{t('common.all')}</option>{groups.map((group) => <option key={group.id} value={group.id}>{labelFor(group)}</option>)}</select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">{t('articles.locations')}</span>
            <select value={filters.location} onChange={(event) => setFilters((prev) => ({ ...prev, location: event.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"><option value="">{t('common.all')}</option>{locations.map((item) => <option key={item.id} value={item.id}>{labelFor(item)}</option>)}</select>
          </label>
          <div className="flex items-end gap-2 md:col-span-2">
            <button onClick={() => void load()} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white"><Search className="h-4 w-4" />{t('common.search')}</button>
            {canCreateArticle ? <Link to="/erp/articles/create" className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white"><Plus className="h-4 w-4" />{t('articles.add')}</Link> : null}
          </div>
        </div>
        {error ? <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead><tr className="border-b text-slate-500"><th className="pb-3">{t('articles.titleField')}</th><th className="pb-3">status</th><th className="pb-3">publish_at</th><th className="pb-3">audience</th><th className="pb-3">{t('articles.groups')}</th><th className="pb-3">{t('articles.locations')}</th><th className="pb-3 text-right">{t('common.actions')}</th></tr></thead>
            <tbody>{visibleArticles.length ? visibleArticles.map((article) => (
              <tr key={article.id} className="border-b border-slate-100 align-top">
                <td className="max-w-[320px] py-4">
                  <p className="font-medium text-slate-900">{article.title}</p>
                  <p className="mt-1 line-clamp-2 text-slate-600">{article.description}</p>
                </td>
                <td className="py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(article.status)}`}>{article.status ?? 'draft'}</span></td>
                <td className="py-4 text-slate-600">
                  <p>{formatApiDate(article.publish_at)}</p>
                  {article.expires_at ? <p className="text-xs text-slate-500">expira {formatApiDate(article.expires_at)}</p> : null}
                  <p className="text-xs text-slate-500">priority {article.priority ?? 0}</p>
                </td>
                <td className="py-4 text-slate-600">{article.audience_segment ?? 'all_users'}</td>
                <td className="py-4 text-slate-600">{names(article.groups)}</td>
                <td className="py-4 text-slate-600">{names(article.locations)}</td>
                <td className="py-4"><div className="flex justify-end gap-2">
                  <Link to={`/erp/articles/${article.id}`} className="rounded-lg border border-slate-200 px-3 py-2"><Eye className="h-4 w-4" /></Link>
                  <Can anyOf={['articles.update', 'articles.manage']}><Link to={`/erp/articles/${article.id}/edit`} className="rounded-lg border border-slate-200 px-3 py-2"><Edit3 className="h-4 w-4" /></Link></Can>
                  <Can anyOf={['articles.delete', 'articles.manage']}><button onClick={() => setDeleting(article)} className="rounded-lg border border-red-100 px-3 py-2 text-red-600"><Trash2 className="h-4 w-4" /></button></Can>
                </div></td>
              </tr>
            )) : <tr><td colSpan={7} className="py-10 text-center text-slate-500">{loading ? t('articles.loadingList') : t('articles.empty')}</td></tr>}</tbody>
          </table>
        </div>
      </SectionCard>
      {deleting && hasAnyRight(['articles.delete', 'articles.manage']) ? (
        <Modal open onClose={() => setDeleting(null)} title={t('articles.deleteConfirmTitle')} maxWidthClassName="max-w-md">
          <p className="text-sm text-slate-600">{t('articles.deleteConfirm')}</p>
          <div className="mt-6 flex justify-end gap-2">
            <button onClick={() => setDeleting(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium">{t('common.cancel')}</button>
            <button onClick={() => void remove()} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white">{t('common.delete')}</button>
          </div>
        </Modal>
      ) : null}
      </div>
    </ProtectedRoute>
  );
}
