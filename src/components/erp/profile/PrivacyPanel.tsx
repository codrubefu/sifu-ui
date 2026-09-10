import { Download, RefreshCw, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Input, SectionCard, Select } from '../../primitives';
import { gdprService, type ConsentRecord, type GdprDataAccess, type GdprExport, type GdprRequest } from '../../../services/gdprService';
import type { NotificationChannel } from '../../../services/notificationService';
import { formatDeviceDateTime } from '../../../utils/erp/formatters';

type PrivacyPanelProps = {
  userId?: number;
  childId?: number;
  administrative?: boolean;
  canExport?: boolean;
  canProcess?: boolean;
};

const channels: NotificationChannel[] = ['sms', 'mail'];

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function formatDate(value?: string | null) {
  return formatDeviceDateTime(value);
}

export function PrivacyPanel({ userId, childId, administrative = false, canExport = true, canProcess = true }: PrivacyPanelProps) {
  const readOnly = Boolean(childId);
  canExport = readOnly ? false : canExport;
  canProcess = readOnly ? false : canProcess;
  const [data, setData] = useState<GdprDataAccess | null>(null);
  const [exportRecord, setExportRecord] = useState<GdprExport | null>(null);
  const [erasureRequest, setErasureRequest] = useState<GdprRequest | null>(null);
  const [rectification, setRectification] = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [consent, setConsent] = useState<{ purpose: string; channel: NotificationChannel; policy_version: string; granted: boolean }>({
    purpose: 'notifications',
    channel: 'mail',
    policy_version: '2026-08',
    granted: true,
  });
  const [requestIdToProcess, setRequestIdToProcess] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const nextData = await gdprService.access(userId, childId);
      setData(nextData);
      setRectification({
        first_name: nextData.profile.first_name ?? '',
        last_name: nextData.profile.last_name ?? '',
        email: nextData.profile.email ?? '',
        phone: nextData.profile.phone ?? '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu am putut incarca datele GDPR.');
    } finally {
      setLoading(false);
    }
  }, [userId, childId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const createExport = async () => {
    if (!canExport) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      setExportRecord(await gdprService.createExport(userId));
      setSuccess('Exportul a fost pornit.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu am putut porni exportul.');
    } finally {
      setLoading(false);
    }
  };

  const refreshExport = async () => {
    if (!exportRecord) return;
    setLoading(true);
    setError('');
    try {
      setExportRecord(await gdprService.exportStatus(exportRecord.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu am putut verifica exportul.');
    } finally {
      setLoading(false);
    }
  };

  const downloadExport = async () => {
    if (!exportRecord) return;
    setLoading(true);
    setError('');
    try {
      const blob = exportRecord.download_url ? await gdprService.downloadFromUrl(exportRecord.download_url) : await gdprService.downloadExport(exportRecord.id);
      downloadBlob(blob, 'personal-data.json');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu am putut descarca exportul.');
    } finally {
      setLoading(false);
    }
  };

  const saveRectification = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await gdprService.rectify(rectification, userId);
      setSuccess('Datele au fost rectificate.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu am putut rectifica datele.');
    } finally {
      setLoading(false);
    }
  };

  const recordConsent = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await gdprService.consent({ ...consent, source: administrative ? 'administrative' : 'self_service' }, userId);
      setSuccess('Consimtamantul a fost inregistrat.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu am putut inregistra consimtamantul.');
    } finally {
      setLoading(false);
    }
  };

  const requestErasure = async () => {
    if (!window.confirm('Creezi o cerere de stergere GDPR?')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const request = await gdprService.requestErasure(userId);
      setErasureRequest(request);
      setRequestIdToProcess(request.id);
      setSuccess('Cererea de stergere a fost creata.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu am putut crea cererea de stergere.');
    } finally {
      setLoading(false);
    }
  };

  const processErasure = async () => {
    if (!canProcess || !requestIdToProcess.trim()) return;
    if (!window.confirm('Procesezi cererea de stergere GDPR?')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      setErasureRequest(await gdprService.processErasure(requestIdToProcess.trim()));
      setSuccess('Cererea de stergere a fost procesata.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu am putut procesa cererea de stergere.');
    } finally {
      setLoading(false);
    }
  };

  const consents: ConsentRecord[] = data?.consents ?? [];

  return (
    <div className="space-y-6">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}

      <SectionCard title={administrative ? 'GDPR utilizator' : 'Confidentialitate'} action={<Button type="button" onClick={() => void loadData()} disabled={loading}><RefreshCw className="h-4 w-4" />Refresh</Button>}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input label="Prenume" value={rectification.first_name} disabled={readOnly} onChange={(event) => setRectification((prev) => ({ ...prev, first_name: event.target.value }))} />
          <Input label="Nume" value={rectification.last_name} disabled={readOnly} onChange={(event) => setRectification((prev) => ({ ...prev, last_name: event.target.value }))} />
          <Input label="Email" type="email" value={rectification.email} disabled={readOnly} onChange={(event) => setRectification((prev) => ({ ...prev, email: event.target.value }))} />
          <Input label="Telefon" value={rectification.phone} disabled={readOnly} onChange={(event) => setRectification((prev) => ({ ...prev, phone: event.target.value }))} />
        </div>
        {!readOnly ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={() => void saveRectification()} disabled={loading} variant="primary"><Save className="h-4 w-4" />Rectifica date</Button>
            {canExport ? <Button type="button" onClick={() => void createExport()} disabled={loading}><Download className="h-4 w-4" />Creeaza export</Button> : null}
            <Button type="button" onClick={() => void requestErasure()} disabled={loading} variant="danger"><Trash2 className="h-4 w-4" />Cerere stergere</Button>
          </div>
        ) : null}
      </SectionCard>

      {exportRecord ? (
        <SectionCard title="Export date">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <div><p className="font-semibold text-slate-900">#{exportRecord.id}</p><p className="text-slate-600">{exportRecord.status} - expira: {formatDate(exportRecord.expires_at)}</p></div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void refreshExport()} disabled={loading}><RefreshCw className="h-4 w-4" />Status</Button>
              {exportRecord.status === 'ready' ? <Button type="button" onClick={() => void downloadExport()} disabled={loading} variant="primary"><Download className="h-4 w-4" />Download</Button> : null}
            </div>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Consimtaminte">
        {!readOnly ? (
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-5">
            <Input label="Scop" value={consent.purpose} onChange={(event) => setConsent((prev) => ({ ...prev, purpose: event.target.value }))} />
            <Select label="Canal" value={consent.channel} onChange={(event) => setConsent((prev) => ({ ...prev, channel: event.target.value as NotificationChannel }))}>
              {channels.map((channel) => <option key={channel} value={channel}>{channel}</option>)}
            </Select>
            <Input label="Versiune politica" value={consent.policy_version} onChange={(event) => setConsent((prev) => ({ ...prev, policy_version: event.target.value }))} />
            <Select label="Status" value={String(consent.granted)} onChange={(event) => setConsent((prev) => ({ ...prev, granted: event.target.value === 'true' }))}>
              <option value="true">Granted</option>
              <option value="false">Withdrawn</option>
            </Select>
            <div className="flex items-end"><Button type="button" onClick={() => void recordConsent()} disabled={loading} className="w-full"><ShieldCheck className="h-4 w-4" />Inregistreaza</Button></div>
          </div>
        ) : null}
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-sm text-slate-700 [&_tbody_tr:nth-child(even)]:bg-slate-50/45">
            <thead className="bg-slate-50 text-slate-500"><tr><th className="border-b border-slate-200 px-5 py-3">Scop</th><th className="border-b border-slate-200 px-4 py-3">Canal</th><th className="border-b border-slate-200 px-4 py-3">Versiune</th><th className="border-b border-slate-200 px-4 py-3">Status</th><th className="border-b border-slate-200 px-5 py-3">Data</th></tr></thead>
            <tbody>
              {consents.length ? consents.map((item) => <tr key={item.id} className="border-b border-slate-100 transition-colors hover:bg-indigo-50/30"><td className="px-5 py-3">{item.purpose}</td><td className="px-4 py-3">{item.channel}</td><td className="px-4 py-3">{item.policy_version}</td><td className="px-4 py-3">{item.granted ? 'granted' : 'withdrawn'}</td><td className="px-5 py-3">{formatDate(item.occurred_at)}</td></tr>) : <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">{loading ? 'Se incarca...' : 'Nu exista consimtaminte.'}</td></tr>}
            </tbody>
          </table>
          </div>
        </div>
      </SectionCard>

      {administrative && canProcess ? (
        <SectionCard title="Procesare stergere">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <Input label="GDPR request id" value={requestIdToProcess} onChange={(event) => setRequestIdToProcess(event.target.value)} placeholder={erasureRequest?.id ?? 'uuid'} />
            <div className="flex items-end"><Button type="button" onClick={() => void processErasure()} disabled={loading || !requestIdToProcess.trim()} variant="danger">Proceseaza</Button></div>
          </div>
          {erasureRequest ? <pre className="mt-4 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">{JSON.stringify(erasureRequest, null, 2)}</pre> : null}
        </SectionCard>
      ) : null}
    </div>
  );
}
