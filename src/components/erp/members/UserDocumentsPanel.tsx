import { Download, FileText, RefreshCw, Trash2, Upload } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, SectionCard, Textarea } from '../../primitives';
import { erpApiService, type ApiLocation, type ApiUserDocument, type ApiUserDocumentCategory } from '../../../services/ErpApiService';

const categories: ApiUserDocumentCategory[] = ['membership_request', 'identity_document', 'gdpr_agreement', 'certificate', 'contract', 'photo', 'other'];

type FormState = {
  category: ApiUserDocumentCategory;
  title: string;
  description: string;
  expires_at: string;
  location_id: string;
  file: File | null;
};

const emptyForm: FormState = {
  category: 'other',
  title: '',
  description: '',
  expires_at: '',
  location_id: '',
  file: null,
};

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function documentFilename(document: ApiUserDocument) {
  return document.original_name || `${document.title}.${document.extension}`;
}

type UserDocumentsPanelProps = {
  userId?: number;
  locations?: ApiLocation[];
  canUpload: boolean;
  canDelete: boolean;
  fetchDocuments?: () => Promise<ApiUserDocument[]>;
  downloadDocumentOverride?: (documentId: number) => Promise<Blob>;
};

export function UserDocumentsPanel({ userId, locations = [], canUpload, canDelete, fetchDocuments, downloadDocumentOverride }: UserDocumentsPanelProps) {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<ApiUserDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [replaceTarget, setReplaceTarget] = useState<ApiUserDocument | null>(null);

  const selectedFileName = useMemo(() => form.file?.name ?? t('userDocuments.noFile'), [form.file, t]);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (fetchDocuments) {
        setDocuments(await fetchDocuments());
      } else if (userId) {
        const payload = await erpApiService.listUserDocuments(userId, 1, 100);
        setDocuments(payload.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('userDocuments.loadError'));
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [fetchDocuments, userId, t]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setReplaceTarget(null);
  };

  const saveDocument = async () => {
    if (!userId) return;
    if (!form.file) {
      setError(t('userDocuments.fileRequired'));
      return;
    }
    if (!form.title.trim()) {
      setError(t('userDocuments.titleRequired'));
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        file: form.file,
        category: form.category,
        title: form.title.trim(),
        description: form.description.trim(),
        expires_at: form.expires_at,
        location_id: form.location_id,
      };
      if (replaceTarget) {
        await erpApiService.replaceUserDocument(userId, replaceTarget.id, payload);
        setSuccess(t('userDocuments.replaced'));
      } else {
        await erpApiService.uploadUserDocument(userId, payload);
        setSuccess(t('userDocuments.uploaded'));
      }
      resetForm();
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('userDocuments.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const downloadDocument = async (document: ApiUserDocument) => {
    setError('');
    try {
      const blob = downloadDocumentOverride ? await downloadDocumentOverride(document.id) : userId ? await erpApiService.downloadUserDocument(userId, document.id) : null;
      if (!blob) return;
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = documentFilename(document);
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('userDocuments.downloadError'));
    }
  };

  const deleteDocument = async (document: ApiUserDocument) => {
    if (!userId) return;
    if (!window.confirm(t('userDocuments.deleteConfirm', { title: document.title }))) return;
    setError('');
    try {
      await erpApiService.deleteUserDocument(userId, document.id);
      setSuccess(t('userDocuments.deleted'));
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('userDocuments.deleteError'));
    }
  };

  return (
    <div className="space-y-5">
      {error ? <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
      {success ? <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{success}</p> : null}

      {canUpload ? (
        <SectionCard title={replaceTarget ? t('userDocuments.replaceTitle', { title: replaceTarget.title }) : t('userDocuments.uploadTitle')}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">{t('userDocuments.category')}</span>
              <select value={form.category} onChange={(event) => updateField('category', event.target.value as ApiUserDocumentCategory)} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100">
                {categories.map((category) => <option key={category} value={category}>{t(`userDocuments.categories.${category}`)}</option>)}
              </select>
            </label>
            <Input label={t('userDocuments.title')} value={form.title} onChange={(event) => updateField('title', event.target.value)} />
            <Input label={t('userDocuments.expiresAt')} type="date" value={form.expires_at} onChange={(event) => updateField('expires_at', event.target.value)} />
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">{t('userDocuments.location')}</span>
              <select value={form.location_id} onChange={(event) => updateField('location_id', event.target.value)} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100">
                <option value="">{t('userDocuments.noLocation')}</option>
                {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
              </select>
            </label>
            <div className="md:col-span-2">
              <Textarea label={t('userDocuments.description')} value={form.description} onChange={(event) => updateField('description', event.target.value)} rows={3} />
            </div>
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-700">{t('userDocuments.file')}</span>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(event) => updateField('file', event.target.files?.[0] ?? null)} className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
              <span className="mt-2 block text-xs text-slate-500">{selectedFileName} - {t('userDocuments.fileHint')}</span>
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            {replaceTarget ? <Button onClick={resetForm}>{t('userDocuments.cancelReplace')}</Button> : null}
            <Button onClick={() => void saveDocument()} disabled={saving} variant="primary">
              <Upload className="h-4 w-4" />{saving ? t('common.saving') : replaceTarget ? t('userDocuments.replace') : t('userDocuments.upload')}
            </Button>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title={t('userDocuments.documents')}>
        <div className="mb-4 flex justify-end">
          <Button onClick={() => void loadDocuments()} disabled={loading}><RefreshCw className="h-4 w-4" />{loading ? t('common.loading') : t('common.refresh')}</Button>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
          <table className="min-w-[920px] w-full text-left text-sm text-slate-700 [&_tbody_tr:nth-child(even)]:bg-slate-50/45">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="border-b border-slate-200 px-5 py-3 font-semibold">{t('userDocuments.document')}</th>
                <th className="border-b border-slate-200 px-4 py-3 font-semibold">{t('userDocuments.category')}</th>
                <th className="border-b border-slate-200 px-4 py-3 font-semibold">{t('userDocuments.expires')}</th>
                <th className="border-b border-slate-200 px-4 py-3 font-semibold">{t('userDocuments.file')}</th>
                <th className="border-b border-slate-200 px-4 py-3 font-semibold">{t('userDocuments.operator')}</th>
                <th className="border-b border-slate-200 px-5 py-3 font-semibold text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {documents.length ? documents.map((document) => (
                <tr key={document.id} className="border-b border-slate-100 align-top transition-colors hover:bg-indigo-50/30">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-slate-900"><FileText className="mr-2 inline h-4 w-4" />{document.title}</p>
                    <p className="text-xs text-slate-500">{document.description || '-'}</p>
                    {document.replaces_document_id ? <p className="mt-1 text-xs text-slate-500">{t('userDocuments.replaces', { id: document.replaces_document_id })}</p> : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{t(`userDocuments.categories.${document.category}`)}</td>
                  <td className="px-4 py-3 text-slate-600">{document.expires_at ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    <p>{document.original_name}</p>
                    <p className="text-xs text-slate-500">{document.mime_type} - {formatBytes(document.size)}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{document.uploader ? `${document.uploader.first_name ?? ''} ${document.uploader.last_name ?? ''}`.trim() || document.uploader.email : '-'}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button onClick={() => void downloadDocument(document)} size="sm"><Download className="h-4 w-4" />{t('userDocuments.download')}</Button>
                      {canUpload ? <Button onClick={() => {
                        setReplaceTarget(document);
                        setForm({
                          category: document.category,
                          title: document.title,
                          description: document.description ?? '',
                          expires_at: document.expires_at ?? '',
                          location_id: document.location_id ? String(document.location_id) : '',
                          file: null,
                        });
                      }} size="sm"><RefreshCw className="h-4 w-4" />{t('userDocuments.replace')}</Button> : null}
                      {canDelete ? <Button onClick={() => void deleteDocument(document)} size="sm" variant="danger"><Trash2 className="h-4 w-4" />{t('common.delete')}</Button> : null}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">{loading ? t('userDocuments.loading') : t('userDocuments.empty')}</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
