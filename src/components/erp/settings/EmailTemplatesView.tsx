import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiClientError } from '../../../api/apiClient';
import { useAuth } from '../../../context/useAuth';
import { createEmailTemplate, deleteEmailTemplate, getEmailTemplates, getEmailTemplateTypes, updateEmailTemplate, type EmailTemplate, type EmailTemplateType } from '../../../services/emailTemplatesService';
import { Alert, Button, Input, SectionCard, SuccessMessage, Textarea } from '../../primitives';

export function EmailTemplatesView() {
  const { t } = useTranslation();
  const { hasRight } = useAuth();
  const canManage = hasRight('email_templates.manage');
  const canView = canManage || hasRight('email_templates.view');
  const [catalog, setCatalog] = useState<EmailTemplateType[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selected, setSelected] = useState<EmailTemplateType | null>(null);
  const [form, setForm] = useState({ subject: '', body: '' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const customization = templates.find(item => item.type === selected?.type);

  const reload = useCallback(async () => {
    const [types, items] = await Promise.all([getEmailTemplateTypes(), getEmailTemplates()]);
    setCatalog(types);
    setTemplates(items);
    return { types, items };
  }, []);

  useEffect(() => {
    if (!canView) return;
    let active = true;
    Promise.all([getEmailTemplateTypes(), getEmailTemplates()]).then(([types, items]) => {
      if (active) { setCatalog(types); setTemplates(items); }
    }).catch(err => {
      if (active) setError(err instanceof Error ? err.message : t('emailTemplates.error'));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [canView, t]);

  const reportError = (err: unknown) => {
    setError(err instanceof Error ? err.message : t('emailTemplates.error'));
    if (err instanceof ApiClientError) setFieldErrors(err.errors ?? {});
  };

  const save = async (close: boolean) => {
    if (!canManage || !selected || busy) return;
    const errors: Record<string, string[]> = {};
    for (const field of ['subject', 'body'] as const) {
      const value = form[field];
      if (!value.trim() || [...value].length > (field === 'subject' ? 255 : 20000) || (field === 'subject' && /[\r\n]/.test(value))) {
        errors[field] = [t('emailTemplates.invalidText')];
      }
      const tokens = [...value.matchAll(/{{(.*?)}}/gs)];
      if (tokens.some(match => !selected.variables.includes(match[1]))) errors[field] = [t('emailTemplates.invalidVariable')];
    }
    if (selected.type === 'account.created' && !form.body.includes('{{setup_url}}')) errors.body = [t('emailTemplates.setupRequired', { setup_url: '{{setup_url}}' })];
    setFieldErrors(errors);
    setError('');
    setSuccess('');
    if (Object.keys(errors).length) return;
    setBusy(true);
    try {
      const saved = customization ? await updateEmailTemplate(customization.id, form) : await createEmailTemplate({ type: selected.type, ...form });
      // Keep the returned ID even if the subsequent refresh fails.
      setTemplates(items => [...items.filter(item => item.type !== saved.type), saved]);
      setForm({ subject: saved.subject, body: saved.body });
      await reload();
      setSuccess(t('common.saved'));
      if (close) setSelected(null);
    } catch (err) { reportError(err); }
    finally { setBusy(false); }
  };

  const reset = async () => {
    if (!canManage || !customization || busy || !window.confirm(t('emailTemplates.resetConfirm'))) return;
    setBusy(true); setError(''); setSuccess(''); setFieldErrors({});
    try {
      await deleteEmailTemplate(customization.id);
      setTemplates(items => items.filter(item => item.id !== customization.id));
      if (selected) setForm({ subject: selected.subject, body: selected.body });
      const { types } = await reload();
      const defaults = types.find(item => item.type === selected?.type);
      if (defaults) { setSelected(defaults); setForm({ subject: defaults.subject, body: defaults.body }); }
      setSuccess(t('emailTemplates.resetDone'));
    } catch (err) { reportError(err); }
    finally { setBusy(false); }
  };

  if (!canView) return <Alert tone="error">{t('emailTemplates.noAccess')}</Alert>;
  return (
    <SectionCard title={t('emailTemplates.title')}>
      <p className="mb-4 text-sm text-slate-500">{t('emailTemplates.subtitle')}</p>
      {error && <Alert tone="error">{error}</Alert>}
      {success && <SuccessMessage>{success}</SuccessMessage>}
      {!canManage && <Alert tone="info">{t('emailTemplates.viewOnly')}</Alert>}
      {loading ? <p>{t('common.loading')}</p> : selected ? (
        <form className="mt-4 space-y-4" onSubmit={event => { event.preventDefault(); void save(false); }}>
          <h3 className="font-semibold">{t(`emailTemplates.types.${selected.type.replace('.', '_')}`, { defaultValue: selected.type })}</h3>
          <p className="text-sm text-slate-500">{t(customization ? 'emailTemplates.customized' : 'emailTemplates.default')}</p>
          <p className="text-sm">{t('emailTemplates.variables')} <span className="break-words font-mono">{selected.variables.map(variable => `{{${variable}}}`).join(', ')}</span></p>
          {selected.type === 'account.created' && <Alert tone="info">{t('emailTemplates.setupRequired', { setup_url: '{{setup_url}}' })}</Alert>}
          <Input label={t('emailTemplates.subject')} value={form.subject} maxLength={255} required disabled={!canManage || busy} onChange={event => setForm({ ...form, subject: event.target.value })} />
          {fieldErrors.subject?.map(message => <Alert key={message} tone="error">{message}</Alert>)}
          <Textarea label={t('emailTemplates.body')} value={form.body} rows={12} maxLength={20000} required disabled={!canManage || busy} onChange={event => setForm({ ...form, body: event.target.value })} />
          {fieldErrors.body?.map(message => <Alert key={message} tone="error">{message}</Alert>)}
          {fieldErrors.type?.map(message => <Alert key={message} tone="error">{message}</Alert>)}
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={() => { setSelected(null); setError(''); setFieldErrors({}); }}>{t('common.back')}</Button>
            {canManage && <>
              <Button type="submit" variant="primary" disabled={busy}>{t(busy ? 'common.saving' : customization ? 'common.save' : 'emailTemplates.customize')}</Button>
              <Button type="submit" disabled={busy} onClick={event => { if (event.currentTarget.form?.reportValidity()) { event.preventDefault(); void save(true); } }}>{t('common.saveAndClose')}</Button>
              {customization && <Button type="button" variant="danger" disabled={busy} onClick={() => void reset()}>{t('emailTemplates.reset')}</Button>}
            </>}
          </div>
        </form>
      ) : <div className="mt-4 space-y-3">
        {catalog.map(type => <div key={type.type} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4">
          <div><h3 className="font-semibold">{t(`emailTemplates.types.${type.type.replace('.', '_')}`, { defaultValue: type.type })}</h3><p className="text-sm text-slate-500">{t(templates.some(item => item.type === type.type) ? 'emailTemplates.customized' : 'emailTemplates.default')}</p></div>
          <Button onClick={() => { const content = templates.find(item => item.type === type.type) ?? type; setSelected(type); setForm({ subject: content.subject, body: content.body }); setError(''); setSuccess(''); setFieldErrors({}); }}>{t(canManage ? templates.some(item => item.type === type.type) ? 'common.edit' : 'emailTemplates.customize' : 'emailTemplates.view')}</Button>
        </div>)}
        <Button onClick={() => { setLoading(true); setError(''); void reload().catch(reportError).finally(() => setLoading(false)); }}>{t('emailTemplates.refresh')}</Button>
      </div>}
    </SectionCard>
  );
}
