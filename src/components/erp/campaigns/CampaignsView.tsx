import { CalendarClock, Eye, RefreshCw, Save, Send, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Input, SectionCard, Select, Textarea } from '../../primitives';
import { campaignsService, type Campaign, type CampaignChannel, type CampaignPayload, type CampaignPreview, type CampaignStatistics } from '../../../services/campaignsService';
import { segmentsService, type Segment } from '../../../services/segmentsService';

const emptyForm: CampaignPayload = {
  name: '',
  channel: 'mail',
  subject: '',
  content: '',
  segment_id: null,
};

function toLocalDateTime(value?: string | null) {
  return value ? value.replace(' ', 'T').slice(0, 16) : '';
}

function toApiDateTime(value: string) {
  return value.length === 16 ? `${value.replace('T', ' ')}:00` : value.replace('T', ' ');
}

function recipientName(user: CampaignPreview['data'][number]) {
  return `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email || `#${user.id}`;
}

function cleanPayload(form: CampaignPayload): CampaignPayload {
  return {
    name: form.name.trim(),
    channel: form.channel,
    subject: form.subject?.trim() || null,
    content: form.content.trim(),
    segment_id: form.segment_id || null,
  };
}

export function CampaignsView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [form, setForm] = useState<CampaignPayload>(emptyForm);
  const [scheduledAt, setScheduledAt] = useState('');
  const [preview, setPreview] = useState<CampaignPreview | null>(null);
  const [statistics, setStatistics] = useState<CampaignStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isDraft = !selected || selected.status === 'draft';

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextCampaigns, nextSegments] = await Promise.all([
        campaignsService.list(),
        segmentsService.list().catch(() => []),
      ]);
      setCampaigns(nextCampaigns);
      setSegments(nextSegments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu am putut incarca campaniile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  const selectCampaign = (campaign: Campaign) => {
    setSelected(campaign);
    setForm({
      name: campaign.name,
      channel: campaign.channel,
      subject: campaign.subject ?? '',
      content: campaign.content,
      segment_id: campaign.segment_id ?? null,
    });
    setScheduledAt(toLocalDateTime(campaign.scheduled_at));
    setPreview(null);
    setStatistics(null);
    setError('');
    setSuccess('');
  };

  const resetForm = () => {
    setSelected(null);
    setForm(emptyForm);
    setScheduledAt('');
    setPreview(null);
    setStatistics(null);
    setError('');
    setSuccess('');
  };

  const save = async () => {
    if (!form.name.trim() || !form.content.trim()) {
      setError('Numele si continutul campaniei sunt obligatorii.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const payload = cleanPayload(form);
      const saved = selected ? await campaignsService.update(selected.id, payload) : await campaignsService.create(payload);
      setSelected(saved);
      setSuccess('Campania a fost salvata.');
      await loadCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu am putut salva campania.');
    } finally {
      setLoading(false);
    }
  };

  const loadPreview = async (campaign: Campaign) => {
    setLoading(true);
    setError('');
    try {
      setPreview(await campaignsService.preview(campaign.id));
      setSelected(campaign);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu am putut incarca preview-ul.');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async (campaign: Campaign) => {
    setLoading(true);
    setError('');
    try {
      setStatistics(await campaignsService.statistics(campaign.id));
      setSelected(campaign);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu am putut incarca statisticile.');
    } finally {
      setLoading(false);
    }
  };

  const schedule = async () => {
    if (!selected || !scheduledAt) return;
    setLoading(true);
    setError('');
    try {
      const saved = await campaignsService.schedule(selected.id, toApiDateTime(scheduledAt));
      setSelected(saved);
      setSuccess('Campania a fost programata.');
      await loadCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu am putut programa campania.');
    } finally {
      setLoading(false);
    }
  };

  const cancel = async (campaign: Campaign) => {
    if (!window.confirm(`Anulezi campania "${campaign.name}"?`)) return;
    setLoading(true);
    setError('');
    try {
      const saved = await campaignsService.cancel(campaign.id);
      setSelected(saved);
      setSuccess('Campania a fost anulata.');
      await loadCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu am putut anula campania.');
    } finally {
      setLoading(false);
    }
  };

  const segmentName = useMemo(() => {
    const byId = new Map(segments.map((segment) => [segment.id, segment.name]));
    return (segmentId?: number | null) => (segmentId ? byId.get(segmentId) ?? `#${segmentId}` : 'Toti utilizatorii eligibili');
  }, [segments]);

  return (
    <div className="space-y-6">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}

      <SectionCard title="Campanii" action={<Button type="button" onClick={() => void loadCampaigns()} disabled={loading}><RefreshCw className="h-4 w-4" />Refresh</Button>}>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left text-sm text-slate-700 [&_tbody_tr:nth-child(even)]:bg-slate-50/45">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr><th className="border-b border-slate-200 px-5 py-3">Campanie</th><th className="border-b border-slate-200 px-4 py-3">Canal</th><th className="border-b border-slate-200 px-4 py-3">Status</th><th className="border-b border-slate-200 px-4 py-3">Programata</th><th className="border-b border-slate-200 px-5 py-3 text-right">Actiuni</th></tr>
              </thead>
              <tbody>
                {campaigns.length ? campaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-b border-slate-100 align-top transition-colors hover:bg-indigo-50/30">
                    <td className="px-5 py-3"><p className="font-semibold text-slate-900">{campaign.name}</p><p className="text-xs text-slate-500">{campaign.subject || segmentName(campaign.segment_id)}</p></td>
                    <td className="px-4 py-3 text-slate-600">{campaign.channel}</td>
                    <td className="px-4 py-3 text-slate-600">{campaign.status}</td>
                    <td className="px-4 py-3 text-slate-600">{campaign.scheduled_at?.slice(0, 16) ?? '-'}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button type="button" size="sm" onClick={() => selectCampaign(campaign)}>Edit</Button>
                        <Button type="button" size="sm" onClick={() => void loadPreview(campaign)}><Eye className="h-4 w-4" />Preview</Button>
                        <Button type="button" size="sm" onClick={() => void loadStatistics(campaign)}>Stats</Button>
                        {campaign.status === 'scheduled' ? <Button type="button" size="sm" variant="danger" onClick={() => void cancel(campaign)}><XCircle className="h-4 w-4" />Cancel</Button> : null}
                      </div>
                    </td>
                  </tr>
                )) : <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">{loading ? 'Se incarca...' : 'Nu exista campanii.'}</td></tr>}
              </tbody>
            </table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">{selected ? `#${selected.id}` : 'Campanie noua'}</h3>
                <Button type="button" size="sm" onClick={resetForm}>Noua</Button>
              </div>
              {!isDraft ? <Alert tone="warning" className="mb-3">Doar campaniile draft pot fi editate.</Alert> : null}
              <div className="space-y-3">
                <Input label="Nume" value={form.name} disabled={!isDraft} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
                <Select label="Canal" value={form.channel} disabled={!isDraft} onChange={(event) => setForm((prev) => ({ ...prev, channel: event.target.value as CampaignChannel }))}>
                  <option value="mail">Mail</option>
                  <option value="sms">SMS</option>
                </Select>
                <Input label="Subiect" value={form.subject ?? ''} disabled={!isDraft} onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))} />
                <Select label="Segment" value={form.segment_id ?? ''} disabled={!isDraft} onChange={(event) => setForm((prev) => ({ ...prev, segment_id: Number(event.target.value) || null }))}>
                  <option value="">Toti utilizatorii eligibili</option>
                  {segments.map((segment) => <option key={segment.id} value={segment.id}>{segment.name}</option>)}
                </Select>
                <Textarea label="Continut" rows={6} value={form.content} disabled={!isDraft} onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))} />
                <Button type="button" onClick={() => void save()} disabled={loading || !isDraft} variant="primary"><Save className="h-4 w-4" />Salveaza</Button>
              </div>
            </div>

            {selected ? (
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">Programare</h3>
                <div className="flex flex-wrap gap-2">
                  <Input label="scheduled_at" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} />
                  <div className="flex items-end"><Button type="button" onClick={() => void schedule()} disabled={loading || !scheduledAt}><CalendarClock className="h-4 w-4" />Programeaza</Button></div>
                  <div className="flex items-end"><Button type="button" onClick={() => void loadPreview(selected)} disabled={loading}><Send className="h-4 w-4" />Preview</Button></div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </SectionCard>

      {preview ? (
        <SectionCard title={`Preview destinatari (${preview.count})`}>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
            {preview.data.map((user) => <div key={user.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm"><p className="font-medium text-slate-900">{recipientName(user)}</p><p className="text-xs text-slate-500">{user.email}</p><p className="text-xs text-slate-500">{user.phone || '-'}</p></div>)}
          </div>
        </SectionCard>
      ) : null}

      {statistics ? (
        <SectionCard title="Statistici">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {Object.entries(statistics).map(([key, value]) => <div key={key} className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-xs uppercase text-slate-500">{key}</p><p className="text-2xl font-bold text-slate-900">{value}</p></div>)}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
