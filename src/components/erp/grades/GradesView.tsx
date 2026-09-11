import { Award, Edit3, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { erpApiService, type ApiGrade, type ApiPaginated, type ApiUser, type ApiUserGrade } from '../../../services/ErpApiService';
import { useAuth } from '../../../context/useAuth';
import { DataTable, EmptyTableRow, Input, SectionCard, Select, SuccessMessage, TableCell, TableHeadCell, TableRow, TableShell, Textarea } from '../../primitives';
import { PageShell } from '../shared/PageShell';

type GradeForm = { name: string; description: string; is_active: boolean };
type UserGradeForm = { grade_id: string; obtained_at: string; description: string };
const emptyGrade: GradeForm = { name: '', description: '', is_active: true };
const emptyUserGrade: UserGradeForm = { grade_id: '', obtained_at: new Date().toISOString().slice(0, 10), description: '' };

function pageData<T>(payload: ApiPaginated<T>) {
  return { rows: payload.data ?? [], page: payload.meta?.current_page ?? payload.current_page ?? 1, lastPage: payload.meta?.last_page ?? payload.last_page ?? 1 };
}

export function GradesView() {
  const { t } = useTranslation();
  const { hasAnyRight } = useAuth();
  const canManage = hasAnyRight(['grades.manage']);
  const [grades, setGrades] = useState<ApiGrade[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<ApiGrade | null>(null);
  const [gradeUsers, setGradeUsers] = useState<ApiUser[]>([]);
  const [gradeUsersPage, setGradeUsersPage] = useState(1);
  const [gradeUsersLastPage, setGradeUsersLastPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);
  const [history, setHistory] = useState<ApiUserGrade[]>([]);
  const [editingGrade, setEditingGrade] = useState<ApiGrade | null>(null);
  const [editingHistory, setEditingHistory] = useState<ApiUserGrade | null>(null);
  const [gradeFormOpen, setGradeFormOpen] = useState(false);
  const [historyFormOpen, setHistoryFormOpen] = useState(false);
  const [gradeForm, setGradeForm] = useState<GradeForm>(emptyGrade);
  const [historyForm, setHistoryForm] = useState<UserGradeForm>(emptyUserGrade);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  const loadGrades = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await erpApiService.listPaginated<ApiGrade>('grades', { search, per_page: 100 });
      setGrades(payload.data ?? []);
      setSelectedGrade((current) => current && payload.data.some((grade) => grade.id === current.id) ? current : payload.data[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('grades.loadError'));
    } finally {
      setLoading(false);
    }
  }, [search, t]);

  const loadUsers = useCallback(async () => {
    try {
      const payload = await erpApiService.listPaginated<ApiUser>('users', { per_page: 100 });
      setUsers(payload.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('grades.loadError'));
    }
  }, [t]);

  const loadGradeUsers = useCallback(async (grade: ApiGrade, page: number) => {
    try {
      const payload = await erpApiService.listPaginated<ApiUser>(`grades/${grade.id}/users`, { page, per_page: 15 });
      const result = pageData(payload);
      setGradeUsers(result.rows);
      setGradeUsersPage(result.page);
      setGradeUsersLastPage(result.lastPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('grades.usersLoadError'));
    }
  }, [t]);

  const loadHistory = useCallback(async (user: ApiUser) => {
    try {
      const payload = await erpApiService.listPaginated<ApiUserGrade>(`users/${user.id}/grades`, { per_page: 100 });
      setHistory(payload.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('grades.historyLoadError'));
    }
  }, [t]);

  useEffect(() => { void loadGrades(); void loadUsers(); }, [loadGrades, loadUsers]);
  useEffect(() => { if (selectedGrade) void loadGradeUsers(selectedGrade, gradeUsersPage); }, [selectedGrade, loadGradeUsers, gradeUsersPage]);
  useEffect(() => { if (selectedUser) void loadHistory(selectedUser); else setHistory([]); }, [selectedUser, loadHistory]);

  const startCreateGrade = () => { setEditingGrade(null); setGradeForm(emptyGrade); setGradeFormOpen(true); setSuccess(''); };
  const startEditGrade = (grade: ApiGrade) => { setEditingGrade(grade); setGradeForm({ name: grade.name, description: grade.description ?? '', is_active: grade.is_active }); setGradeFormOpen(true); setSuccess(''); };
  const saveGrade = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      const saved = editingGrade
        ? await erpApiService.update<ApiGrade>('grades', editingGrade.id, gradeForm)
        : await erpApiService.create<ApiGrade>('grades', gradeForm);
      setSelectedGrade(saved); setSuccess(t('common.saved')); await loadGrades();
    } catch (err) { setError(err instanceof Error ? err.message : t('grades.saveError')); } finally { setSaving(false); }
  };
  const deleteGrade = async (grade: ApiGrade) => {
    if (!window.confirm(t('grades.deleteConfirm', { name: grade.name }))) return;
    try { await erpApiService.remove('grades', grade.id); setSelectedGrade(null); await loadGrades(); } catch (err) { setError(err instanceof Error ? err.message : t('grades.deleteError')); }
  };

  const saveHistory = async () => {
    if (!selectedUser) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const saved = editingHistory
        ? await erpApiService.update<ApiUserGrade>(`users/${selectedUser.id}/grades`, editingHistory.id, { ...historyForm, grade_id: Number(historyForm.grade_id) })
        : await erpApiService.create<ApiUserGrade>(`users/${selectedUser.id}/grades`, { ...historyForm, grade_id: Number(historyForm.grade_id) });
      setEditingHistory(saved); setSuccess(t('common.saved')); await loadHistory(selectedUser); if (selectedGrade) await loadGradeUsers(selectedGrade, gradeUsersPage);
    } catch (err) { setError(err instanceof Error ? err.message : t('grades.historySaveError')); } finally { setSaving(false); }
  };
  const deleteHistory = async (record: ApiUserGrade) => {
    if (!selectedUser || !window.confirm(t('grades.historyDeleteConfirm'))) return;
    try { await erpApiService.remove(`users/${selectedUser.id}/grades`, record.id); await loadHistory(selectedUser); if (selectedGrade) await loadGradeUsers(selectedGrade, gradeUsersPage); } catch (err) { setError(err instanceof Error ? err.message : t('grades.historyDeleteError')); }
  };

  return (
    <PageShell title={t('grades.title')} subtitle={t('grades.subtitle')}>
      {error ? <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
      {success ? <SuccessMessage fixed>{success}</SuccessMessage> : null}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <SectionCard title={t('grades.definitions')} action={canManage ? <button onClick={startCreateGrade} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white"><Plus className="mr-2 inline h-4 w-4" />{t('grades.add')}</button> : null}>
          <div className="mb-4 flex gap-2"><Input label={t('common.search')} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('grades.searchPlaceholder')} /><button onClick={() => void loadGrades()} className="mt-7 rounded-lg border border-slate-200 px-3"><RefreshCw className="h-4 w-4" /></button></div>
          <div className="space-y-2">
            {grades.map((grade) => <div key={grade.id} className={`flex items-center justify-between rounded-lg border p-3 ${selectedGrade?.id === grade.id ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200'}`}><button onClick={() => { setSelectedGrade(grade); setGradeUsersPage(1); }} className="min-w-0 flex-1 text-left"><span className="font-medium text-slate-900">{grade.name}</span><span className="ml-2 text-xs text-slate-500">{grade.users_count ?? 0} {t('grades.users').toLowerCase()}</span><p className="truncate text-sm text-slate-500">{grade.description || '-'}</p></button>{canManage ? <div className="flex gap-1"><button onClick={() => startEditGrade(grade)} className="rounded border p-2"><Edit3 className="h-4 w-4" /></button><button onClick={() => void deleteGrade(grade)} className="rounded border border-red-100 p-2 text-red-600"><Trash2 className="h-4 w-4" /></button></div> : null}</div>)}
            {!loading && grades.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">{t('grades.empty')}</p> : null}
          </div>
          {gradeFormOpen ? <div className="mt-5 border-t pt-5"><div className="grid gap-3"><Input label={t('grades.name')} value={gradeForm.name} onChange={(event) => setGradeForm((prev) => ({ ...prev, name: event.target.value }))} /><Textarea label={t('grades.description')} value={gradeForm.description} onChange={(event) => setGradeForm((prev) => ({ ...prev, description: event.target.value }))} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={gradeForm.is_active} onChange={(event) => setGradeForm((prev) => ({ ...prev, is_active: event.target.checked }))} />{t('grades.active')}</label><div className="flex justify-end gap-2"><button onClick={() => setGradeFormOpen(false)} className="rounded-lg border px-3 py-2 text-sm"><X className="mr-2 inline h-4 w-4" />{t('common.cancel')}</button><button onClick={() => void saveGrade()} disabled={saving} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white"><Save className="mr-2 inline h-4 w-4" />{t('grades.save')}</button></div></div></div> : null}
        </SectionCard>

        <SectionCard title={selectedGrade ? t('grades.usersFor', { name: selectedGrade.name }) : t('grades.selectGrade')}>
          {selectedGrade ? <><TableShell><DataTable><thead><tr><TableHeadCell>{t('grades.user')}</TableHeadCell><TableHeadCell>{t('grades.email')}</TableHeadCell><TableHeadCell align="right">{t('common.actions')}</TableHeadCell></tr></thead><tbody>{gradeUsers.map((user) => <TableRow key={user.id}><TableCell label={t('grades.user')} className="font-medium">{user.first_name} {user.last_name}</TableCell><TableCell label={t('grades.email')}>{user.email}</TableCell><TableCell label={t('common.actions')} align="right"><button onClick={() => { setSelectedUser(user); setHistoryForm({ ...emptyUserGrade, grade_id: String(selectedGrade.id) }); setEditingHistory(null); }} className="rounded-lg border px-3 py-2 text-sm">{t('grades.history')}</button></TableCell></TableRow>)}{gradeUsers.length === 0 ? <EmptyTableRow colSpan={3}>{t('grades.noUsers')}</EmptyTableRow> : null}</tbody></DataTable></TableShell><div className="mt-3 flex justify-end gap-2 text-sm"><button disabled={gradeUsersPage <= 1} onClick={() => setGradeUsersPage((page) => page - 1)} className="rounded border px-3 py-1 disabled:opacity-40">&lt;</button><span className="px-2 py-1">{gradeUsersPage} / {gradeUsersLastPage}</span><button disabled={gradeUsersPage >= gradeUsersLastPage} onClick={() => setGradeUsersPage((page) => page + 1)} className="rounded border px-3 py-1 disabled:opacity-40">&gt;</button></div></> : <p className="py-12 text-center text-sm text-slate-500"><Award className="mx-auto mb-2 h-8 w-8 text-slate-300" />{t('grades.selectGrade')}</p>}
        </SectionCard>
      </div>

      <SectionCard title={selectedUser ? t('grades.historyFor', { name: `${selectedUser.first_name} ${selectedUser.last_name}` }) : t('grades.selectUser')} action={canManage && selectedUser ? <button onClick={() => { setEditingHistory(null); setHistoryForm(emptyUserGrade); setHistoryFormOpen(true); }} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white"><Plus className="mr-2 inline h-4 w-4" />{t('grades.addHistory')}</button> : null}>
        <div className="mb-5 max-w-md"><Select label={t('grades.user')} value={selectedUser?.id ?? ''} onChange={(event) => { const user = users.find((candidate) => candidate.id === Number(event.target.value)) ?? null; setSelectedUser(user); setEditingHistory(null); setHistoryForm(emptyUserGrade); }}>{users.length === 0 ? <option value="">{t('grades.selectUser')}</option> : <><option value="">{t('grades.selectUser')}</option>{users.map((user) => <option key={user.id} value={user.id}>{user.first_name} {user.last_name} ({user.email})</option>)}</>}</Select></div>
        {selectedUser ? <><TableShell><DataTable><thead><tr><TableHeadCell>{t('grades.name')}</TableHeadCell><TableHeadCell>{t('grades.obtainedAt')}</TableHeadCell><TableHeadCell>{t('grades.description')}</TableHeadCell><TableHeadCell align="right">{t('common.actions')}</TableHeadCell></tr></thead><tbody>{history.map((record) => <TableRow key={record.id}><TableCell label={t('grades.name')} className="font-medium">{record.grade?.name ?? record.grade_id}</TableCell><TableCell label={t('grades.obtainedAt')}>{record.obtained_at}</TableCell><TableCell label={t('grades.description')}>{record.description || '-'}</TableCell><TableCell label={t('common.actions')} align="right">{canManage ? <div className="flex flex-wrap gap-2 sm:justify-end"><button onClick={() => { setEditingHistory(record); setHistoryForm({ grade_id: String(record.grade_id), obtained_at: record.obtained_at, description: record.description ?? '' }); setHistoryFormOpen(true); }} className="rounded border p-2"><Edit3 className="h-4 w-4" /></button><button onClick={() => void deleteHistory(record)} className="rounded border border-red-100 p-2 text-red-600"><Trash2 className="h-4 w-4" /></button></div> : null}</TableCell></TableRow>)}{history.length === 0 ? <EmptyTableRow colSpan={4}>{t('grades.historyEmpty')}</EmptyTableRow> : null}</tbody></DataTable></TableShell>{canManage && historyFormOpen ? <div className="mt-5 grid gap-3 border-t pt-5 md:grid-cols-3"><Select label={t('grades.name')} value={historyForm.grade_id} onChange={(event) => setHistoryForm((prev) => ({ ...prev, grade_id: event.target.value }))}><option value="">{t('grades.selectGrade')}</option>{grades.filter((grade) => grade.is_active).map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}</Select><Input type="date" label={t('grades.obtainedAt')} max={new Date().toISOString().slice(0, 10)} value={historyForm.obtained_at} onChange={(event) => setHistoryForm((prev) => ({ ...prev, obtained_at: event.target.value }))} /><Textarea label={t('grades.description')} value={historyForm.description} onChange={(event) => setHistoryForm((prev) => ({ ...prev, description: event.target.value }))} /><div className="md:col-span-3 flex justify-end"><button onClick={() => void saveHistory()} disabled={saving || !historyForm.grade_id} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white"><Save className="mr-2 inline h-4 w-4" />{t('grades.save')}</button></div></div> : null}</> : <p className="py-8 text-center text-sm text-slate-500">{t('grades.selectUser')}</p>}
      </SectionCard>
    </PageShell>
  );
}
