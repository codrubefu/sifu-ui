import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SectionCard } from '../../primitives';
import ArticleForm from './ArticleForm';
import { articlesService, type Article, type ArticlePayload } from '../../../services/articlesService';
import { ProtectedRoute } from '../../ProtectedRoute';
import { useTranslation } from 'react-i18next';

export default function ArticleEdit() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let disposed = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const payload = await articlesService.get(id);
        if (!disposed) setArticle(payload);
      } catch (err) {
        if (!disposed) setError(err instanceof Error ? err.message : t('articles.loadOneError'));
      } finally {
        if (!disposed) setLoading(false);
      }
    }
    void load();
    return () => {
      disposed = true;
    };
  }, [id, t]);

  const save = async (form: ArticlePayload, options?: { closeAfterSave?: boolean }) => {
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const savedArticle = await articlesService.update(id, form);
      setArticle(savedArticle);
      setSuccess(t('articles.updated'));
      if (options?.closeAfterSave) navigate('/erp/articles');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('articles.updateError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <SectionCard title={t('articles.edit')}><p className="text-sm text-slate-500">{t('articles.loadingOne')}</p></SectionCard>;
  if (!article && error) return <SectionCard title={t('articles.edit')}><p className="text-sm font-semibold text-red-700">{error}</p></SectionCard>;

  return <ProtectedRoute requiredRights={['articles.update', 'articles.manage']}><ArticleForm mode="edit" initialData={article} onSubmit={save} submitting={submitting} serverError={error} successMessage={success} /></ProtectedRoute>;
}
