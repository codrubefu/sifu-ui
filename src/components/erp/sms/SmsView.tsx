import { ChevronLeft, ChevronRight, Filter, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, SectionCard, StatusBadge } from '../../primitives';
import { erpApiService, type ApiPaginated } from '../../../services/ErpApiService';
import { formatDeviceDateTime } from '../../../utils/erp/formatters';

type SmsMessage = {
  id: number;
  user_id?: number | null;
  service_id?: number | null;
  type: string;
  destination: string;
  message: string;
  status: string;
  sent_at?: string | null;
  created_at?: string | null;
  user?: {
    id: number;
    user_code?: string | null;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string | null;
  } | null;
  service?: {
    id: number;
    name: string;
    is_active: boolean;
  } | null;
};

function paginationFrom<T>(payload: ApiPaginated<T>, fallbackPage: number, fallbackPerPage: number) {
  return {
    current_page: payload.meta?.current_page ?? payload.current_page ?? fallbackPage,
    last_page: payload.meta?.last_page ?? payload.last_page ?? 1,
    per_page: payload.meta?.per_page ?? payload.per_page ?? fallbackPerPage,
    total: payload.meta?.total ?? payload.total ?? payload.data.length,
  };
}

function userName(message: SmsMessage) {
  if (!message.user) return '-';
  return `${message.user.first_name ?? ''} ${message.user.last_name ?? ''}`.trim() || message.user.email || `#${message.user.id}`;
}

export function SmsView() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [perPage, setPerPage] = useState(15);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchMessages = useCallback(async (nextPage: number, nextPerPage: number, nextSearch: string, nextStatus: string, nextType: string) => {
    setLoading(true);
    setError('');
    try {
      const payload = await erpApiService.listPaginated<SmsMessage>('sms-messages', {
        search: nextSearch.trim(),
        status: nextStatus,
        type: nextType,
        page: nextPage,
        per_page: nextPerPage,
      });
      const nextPagination = paginationFrom(payload, nextPage, nextPerPage);
      setMessages(payload.data);
      setPagination(nextPagination);
      setPage(nextPagination.current_page);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('sms.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchMessages(1, 15, '', '', '');
  }, [fetchMessages]);

  const applyFilters = () => {
    setPage(1);
    void fetchMessages(1, perPage, searchTerm, status, type);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatus('');
    setType('');
    setPerPage(15);
    setPage(1);
    void fetchMessages(1, 15, '', '', '');
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title={t('sms.title')}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={resetFilters} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
              <Filter className="mr-2 inline h-4 w-4" />{t('users.resetFilters')}
            </button>
            <button onClick={() => void fetchMessages(page, perPage, searchTerm, status, type)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
              <RefreshCw className="mr-2 inline h-4 w-4" />{t('common.refresh')}
            </button>
          </div>
        }
      >
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_150px_210px_120px_auto]">
          <Input
            label={t('common.search')}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') applyFilters();
            }}
            placeholder={t('sms.searchPlaceholder')}
          />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">{t('common.status')}</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none">
              <option value="">{t('common.all')}</option>
              {['sent', 'pending', 'failed', 'draft'].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <Input label={t('sms.type')} value={type} onChange={(event) => setType(event.target.value)} placeholder="service_expiring" />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">{t('users.perPage')}</span>
            <select
              value={perPage}
              onChange={(event) => {
                const nextPerPage = Number(event.target.value);
                setPerPage(nextPerPage);
                setPage(1);
                void fetchMessages(1, nextPerPage, searchTerm, status, type);
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
            >
              {[10, 15, 25, 50].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <div className="flex items-end">
            <button onClick={applyFilters} className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white">{t('common.search')}</button>
          </div>
        </div>

        {error ? <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}

        <div className="mb-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {t('sms.showingCount', { count: pagination.total || messages.length })}
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm text-slate-700 [&_tbody_tr:nth-child(even)]:bg-slate-50/45">
            <thead>
              <tr className="bg-slate-50 text-xs normal-case text-slate-500">
                <th className="border-b border-slate-200 px-5 py-3 font-medium">{t('sms.recipient')}</th>
                <th className="border-b border-slate-200 px-4 py-3 font-medium">{t('sms.destination')}</th>
                <th className="border-b border-slate-200 px-4 py-3 font-medium">{t('sms.message')}</th>
                <th className="border-b border-slate-200 px-4 py-3 font-medium">{t('sms.service')}</th>
                <th className="border-b border-slate-200 px-4 py-3 font-medium">{t('sms.type')}</th>
                <th className="border-b border-slate-200 px-4 py-3 font-medium">{t('common.status')}</th>
                <th className="border-b border-slate-200 px-5 py-3 font-medium">{t('sms.sentAt')}</th>
              </tr>
            </thead>
            <tbody>
              {messages.length ? messages.map((message) => (
                <tr key={message.id} className="border-b border-slate-100 align-top transition-colors hover:bg-indigo-50/30">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900">{userName(message)}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{message.destination || '-'}</td>
                  <td className="max-w-[420px] px-4 py-3 text-slate-600">{message.message || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{message.service?.name || (message.service_id ? `#${message.service_id}` : '-')}</td>
                  <td className="px-4 py-3 text-slate-600">{message.type || '-'}</td>
                  <td className="px-4 py-3"><StatusBadge status={message.status || '-'} /></td>
                  <td className="px-5 py-3 text-slate-600">{formatDeviceDateTime(message.sent_at ?? message.created_at)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-slate-500">{loading ? t('sms.loadingList') : t('sms.empty')}</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
          <span>{t('users.pageOf', { page: pagination.current_page, lastPage: pagination.last_page })}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void fetchMessages(page - 1, perPage, searchTerm, status, type)}
              disabled={loading || page <= 1}
              className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />{t('users.previousPage')}
            </button>
            <button
              onClick={() => void fetchMessages(page + 1, perPage, searchTerm, status, type)}
              disabled={loading || page >= pagination.last_page}
              className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t('users.nextPage')}<ChevronRight className="ml-1 h-4 w-4" />
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
