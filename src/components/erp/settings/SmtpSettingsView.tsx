import { Save, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/useAuth';
import {
  createSmtpSettings,
  deleteSmtpSettings,
  getSmtpSettings,
  updateSmtpSettings,
  type ApiSmtpSetting,
} from '../../../services/smtpSettingsService';
import { Alert, Input, SectionCard, Select, SuccessMessage } from '../../primitives';

type SmtpSettingForm = {
  host: string;
  port: string;
  username: string;
  password: string;
  encryption: '' | 'tls' | 'ssl';
  from_address: string;
  from_name: string;
  active: boolean;
};

const emptyForm: SmtpSettingForm = {
  host: '',
  port: '587',
  username: '',
  password: '',
  encryption: '',
  from_address: '',
  from_name: '',
  active: true,
};

function formFromSetting(setting: ApiSmtpSetting): SmtpSettingForm {
  return {
    host: setting.host,
    port: String(setting.port),
    username: setting.username ?? '',
    password: '',
    encryption: setting.encryption ?? '',
    from_address: setting.from_address,
    from_name: setting.from_name ?? '',
    active: setting.active,
  };
}

export function SmtpSettingsView() {
  const { t } = useTranslation();
  const { hasRight } = useAuth();
  const canManage = hasRight('smtp_settings.manage');

  const [setting, setSetting] = useState<ApiSmtpSetting | null>(null);
  const [form, setForm] = useState<SmtpSettingForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadSetting = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getSmtpSettings();
      setSetting(data);
      setForm(data ? formFromSetting(data) : emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('smtpSettings.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadSetting();
  }, [loadSetting]);

  const setField = <K extends keyof SmtpSettingForm>(field: K, value: SmtpSettingForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSuccess('');
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        host: form.host,
        port: Number(form.port) || 0,
        username: form.username || null,
        ...(form.password ? { password: form.password } : {}),
        encryption: form.encryption || null,
        from_address: form.from_address,
        from_name: form.from_name || null,
        active: form.active,
      };

      const saved = setting ? await updateSmtpSettings(payload) : await createSmtpSettings(payload);
      setSetting(saved);
      setForm(formFromSetting(saved));
      setSuccess(t('common.saved'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('smtpSettings.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(t('smtpSettings.deleteConfirm'))) return;
    setError('');
    setSuccess('');
    try {
      await deleteSmtpSettings();
      setSetting(null);
      setForm(emptyForm);
      setSuccess(t('smtpSettings.deleted'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('smtpSettings.deleteError'));
    }
  };

  return (
    <SectionCard title={t('smtpSettings.title')}>
      <p className="mb-6 text-sm text-slate-500">{t('smtpSettings.subtitle')}</p>

      {error ? <Alert tone="error" className="mb-4">{error}</Alert> : null}
      {success ? <SuccessMessage>{success}</SuccessMessage> : null}
      {!canManage ? <Alert tone="info" className="mb-4">{t('smtpSettings.viewOnlyNotice')}</Alert> : null}
      {!loading && !setting ? <Alert tone="warning" className="mb-4">{t('smtpSettings.notConfigured')}</Alert> : null}

      <form
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <Input label={t('smtpSettings.host')} value={form.host} onChange={(event) => setField('host', event.target.value)} disabled={!canManage} required />
        <Input label={t('smtpSettings.port')} type="number" min={1} max={65535} value={form.port} onChange={(event) => setField('port', event.target.value)} disabled={!canManage} required />
        <Input label={t('smtpSettings.username')} value={form.username} onChange={(event) => setField('username', event.target.value)} disabled={!canManage} />
        <div>
          <Input
            label={t('smtpSettings.password')}
            type="password"
            value={form.password}
            onChange={(event) => setField('password', event.target.value)}
            disabled={!canManage}
            placeholder={setting?.has_password ? '••••••••' : ''}
          />
          <p className="mt-1.5 text-xs text-slate-500">{setting?.has_password ? t('smtpSettings.currentlySet') : null} {t('smtpSettings.passwordHint')}</p>
        </div>
        <Select label={t('smtpSettings.encryption')} value={form.encryption} onChange={(event) => setField('encryption', event.target.value as SmtpSettingForm['encryption'])} disabled={!canManage}>
          <option value="">{t('smtpSettings.encryptionNone')}</option>
          <option value="tls">TLS</option>
          <option value="ssl">SSL</option>
        </Select>
        <Input label={t('smtpSettings.fromAddress')} type="email" value={form.from_address} onChange={(event) => setField('from_address', event.target.value)} disabled={!canManage} required />
        <Input label={t('smtpSettings.fromName')} value={form.from_name} onChange={(event) => setField('from_name', event.target.value)} disabled={!canManage} />

        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 md:col-span-2">
          <input type="checkbox" checked={form.active} onChange={(event) => setField('active', event.target.checked)} disabled={!canManage} className="h-4 w-4 accent-indigo-600" />
          {t('smtpSettings.active')}
        </label>

        {canManage ? (
          <div className="flex flex-wrap justify-end gap-2 md:col-span-2">
            {setting ? (
              <button type="button" onClick={() => void remove()} className="inline-flex items-center gap-2 rounded-lg border border-red-100 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
                {t('common.delete')}
              </button>
            ) : null}
            <button type="submit" disabled={saving || loading} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
              <Save className="h-4 w-4" />
              {saving ? t('common.saving') : t('smtpSettings.save')}
            </button>
          </div>
        ) : null}
      </form>
    </SectionCard>
  );
}
