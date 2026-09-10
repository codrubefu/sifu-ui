import { useState } from 'react';
import ArticleForm from './ArticleForm';
import { articlesService, type ArticlePayload } from '../../../services/articlesService';
import { ProtectedRoute } from '../../ProtectedRoute';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export default function ArticleCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const save = async (form: ArticlePayload, options?: { closeAfterSave?: boolean }) => {
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await articlesService.create(form);
      setSuccess(t('articles.created'));
      if (options?.closeAfterSave) navigate('/erp/articles');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('articles.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  return <ProtectedRoute requiredRights={['articles.create', 'articles.manage']}><ArticleForm mode="create" onSubmit={save} submitting={submitting} serverError={error} successMessage={success} /></ProtectedRoute>;
}
