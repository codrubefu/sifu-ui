import { TOKEN_KEY, apiHeaders, clearApiToken, endpoint, extractErrorMessage, parseJsonResponse, unwrapApiPayload, type ApiEnvelope } from '../api/apiCore';

export type ApiUser = {
  id: number;
  user_code?: string | null;
  first_name: string;
  last_name: string;
  phone: string | null;
  notification_consents?: ApiNotificationConsents;
  active: boolean;
  email: string | null;
  email_verified_at?: string | null;
  parent_user_id?: number | null;
  parent?: ApiUser | null;
  groups?: ApiGroup[];
  locations?: ApiLocation[];
  services?: ApiUserService[];
  active_services?: ApiUserService[];
  service_history?: ApiUserServiceHistory[];
  active_grade?: ApiGrade | null;
  grade_history?: ApiUserGrade[];
  has_active_service?: boolean;
  custom_fields?: Record<string, unknown> | ApiCustomFieldValue[];
  custom_field_values?: Record<string, unknown> | ApiCustomFieldValue[];
  created_at?: string | null;
  updated_at?: string | null;
};

export type ApiGrade = {
  id: number;
  organization_id?: number;
  name: string;
  description: string | null;
  is_active: boolean;
  users_count?: number;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
};

export type ApiUserGrade = {
  id: number;
  organization_id?: number;
  user_id: number;
  grade_id: number;
  grade?: ApiGrade | null;
  obtained_at: string;
  description: string | null;
  created_by?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ApiUserEvent = {
  id: number;
  event_id: number;
  occurrence_date: string;
  start_datetime: string;
  end_datetime: string;
  status: string;
  participant_status?: string | null;
  registered_at?: string | null;
  notes?: string | null;
  event?: {
    id?: number;
    title?: string;
    category?: { name?: string; color?: string | null } | null;
  } | null;
};

export type ApiNotificationConsents = {
  sms?: boolean;
  mail?: boolean;
};

export type ApiCustomFieldType = 'text' | 'textarea' | 'number' | 'date' | 'datetime' | 'email' | 'phone' | 'select' | 'multi_select' | 'checkbox' | 'boolean' | 'file';

export type ApiCustomFieldOption = {
  label: string;
  value: string;
};

export type ApiCustomField = {
  id: number;
  entity_type: string;
  name: string;
  slug: string;
  type: ApiCustomFieldType;
  options?: { choices?: ApiCustomFieldOption[] } | null;
  validation_rules?: string[] | null;
  is_required?: boolean;
  sort_order?: number;
};

export type ApiCustomFieldValue = {
  custom_field_id?: number;
  field_id?: number;
  custom_field?: ApiCustomField;
  slug?: string;
  value?: unknown;
};

export type ApiCustomFieldValues = Record<string, unknown> | ApiCustomFieldValue[];

export type ApiGroup = {
  id: number;
  name: string;
  label: string;
  description: string | null;
  rights?: ApiRight[];
  users_count?: number;
};

export type ApiRight = {
  id: number;
  name: string;
  label: string;
  description: string | null;
  groups_count?: number;
};

export type ApiLocation = {
  id: number;
  name: string;
  description: string | null;
  location_group_id?: number | null;
  location_group?: ApiLocationGroup | null;
  users_count?: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ApiLocationGroup = {
  id: number;
  name: string;
  description: string | null;
  locations?: ApiLocation[];
  created_at?: string | null;
  updated_at?: string | null;
};

export type ServiceType = 'membership' | 'access_pass';
export type ServiceExpirationRule = 'duration' | 'fixed_date' | 'none';
export type ServiceAssignmentStatus = 'pending' | 'active' | 'expired' | 'suspended' | 'consumed' | 'reserved';

export type ApiUserService = {
  id: number;
  name: string;
  description?: string | null;
  type?: ServiceType;
  price?: string | number;
  currency?: string;
  duration_days?: number | null;
  expiration_rule?: ServiceExpirationRule;
  fixed_expires_at?: string | null;
  grace_period_days?: number;
  max_accesses?: number | null;
  max_users?: number | null;
  is_active?: boolean;
  assignment_id?: number | null;
  invoice_number?: string | null;
  bill_number?: string | null;
  start_date?: string | null;
  expires_at?: string | null;
  status?: ServiceAssignmentStatus | null;
  accesses_used?: number | null;
  activated_at?: string | null;
  suspended_at?: string | null;
  resume_at?: string | null;
  status_reason?: string | null;
  activation_payment_id?: number | null;
  is_currently_active?: boolean;
  pivot?: ApiUserServicePivot;
};

export type ApiUserServiceAssignment = {
  id: number;
  start_date?: string;
  service_user_id?: number | null;
  invoice_number?: string | null;
  bill_number?: string | null;
  status?: ServiceAssignmentStatus | null;
  expires_at?: string | null;
  accesses_used?: number | null;
  suspended_at?: string | null;
  resume_at?: string | null;
  status_reason?: string | null;
  activation_payment_id?: number | null;
};

export type ApiUserServicePivot = {
  id?: number | null;
  user_id?: number;
  service_id?: number;
  invoice_number?: string | null;
  bill_number?: string | null;
  status?: ServiceAssignmentStatus;
  start_date?: string | null;
  expires_at?: string | null;
  accesses_used?: number;
  activated_at?: string | null;
  suspended_at?: string | null;
  resume_at?: string | null;
  status_reason?: string | null;
  activation_payment_id?: number | null;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ApiUserServiceHistory = {
  id: number | null;
  service_id: number;
  name: string;
  invoice_number?: string | null;
  bill_number?: string | null;
  start_date: string | null;
  expires_at: string | null;
  status?: ServiceAssignmentStatus | null;
  accesses_used?: number | null;
  suspended_at?: string | null;
  resume_at?: string | null;
  status_reason?: string | null;
  activation_payment_id?: number | null;
  is_active: boolean;
  is_currently_active?: boolean;
};

export type ApiServiceAssignment = {
  id: number;
  service_id: number;
  user_id: number;
  invoice_number?: string | null;
  bill_number?: string | null;
  status: ServiceAssignmentStatus;
  start_date?: string | null;
  expires_at?: string | null;
  accesses_used: number;
  activated_at?: string | null;
  suspended_at?: string | null;
  resume_at?: string | null;
  status_reason?: string | null;
  activation_payment_id?: number | null;
  service?: ApiService | ApiUserService | null;
  user?: ApiUser | ApiServiceUser | null;
};

export type ApiServiceUser = {
  id: number;
  user_code?: string | null;
  first_name: string;
  last_name: string;
  phone: string | null;
  active: boolean;
  email: string;
};

export type ApiService = {
  id: number;
  name: string;
  description: string | null;
  type?: ServiceType;
  price: string | number;
  currency: string;
  duration_days: number | null;
  expiration_rule?: ServiceExpirationRule;
  fixed_expires_at?: string | null;
  grace_period_days?: number;
  max_accesses?: number | null;
  max_users: number | null;
  is_active: boolean;
  users?: ApiServiceUser[];
  users_count?: number;
  start_date?: string | null;
  expires_at?: string | null;
  status?: ServiceAssignmentStatus | null;
  accesses_used?: number | null;
  suspended_at?: string | null;
  resume_at?: string | null;
  status_reason?: string | null;
  activation_payment_id?: number | null;
  is_currently_active?: boolean;
  pivot?: ApiUserServicePivot;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
};

export type ApiPayment = {
  id: number;
  user_id?: number | null;
  user?: ApiUser | ApiServiceUser | null;
  first_name: string;
  last_name: string;
  payment_type_id: 1 | 2 | 3;
  payment_type?: 'cash' | 'card' | 'bank_transfer';
  organization_id?: number | null;
  location_id?: number | null;
  status?: 'initiated' | 'pending' | 'confirmed' | 'failed' | 'refunded' | 'cancelled';
  external_reference?: string | null;
  receipt_number?: string | null;
  provider?: string | null;
  provider_transaction_id?: string | null;
  bank_reference?: string | null;
  reconciled_at?: string | null;
  model_type: 'service_user' | 'event_occurrence_user';
  model_id?: number | null;
  service_id: number | null;
  service?: ApiService | ApiUserService | null;
  amount: string;
  paid_at: string | null;
  confirmed_at?: string | null;
  failed_at?: string | null;
  refunded_at?: string | null;
  cancelled_at?: string | null;
  failure_reason?: string | null;
  admin_id?: number | null;
  admin?: AuthenticatedUser | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ApiActivity = {
  id: number;
  type: string;
  actor_id?: number | null;
  subject_user_id?: number | null;
  model_type?: string | null;
  model_id?: number | null;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  created_at?: string | null;
};

export type ApiUserDocumentCategory =
  | 'membership_request'
  | 'identity_document'
  | 'gdpr_agreement'
  | 'certificate'
  | 'contract'
  | 'photo'
  | 'other';

export type ApiUserDocument = {
  id: number;
  user_id: number;
  organization_id: number;
  location_id?: number | null;
  category: ApiUserDocumentCategory;
  title: string;
  description?: string | null;
  expires_at?: string | null;
  original_name: string;
  mime_type: string;
  extension: string;
  size: number;
  checksum: string;
  status: 'active' | 'replaced' | 'deleted';
  uploaded_by?: number | null;
  uploader?: ApiUser | null;
  location?: ApiLocation | null;
  replaces_document_id?: number | null;
  versions?: ApiUserDocument[];
  scanned_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ApiUserDocumentPayload = {
  file: File;
  category: ApiUserDocumentCategory;
  title: string;
  description?: string;
  expires_at?: string;
  location_id?: string | number;
};

export type AuthenticatedUser = ApiUser | {
  id?: number;
  name?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
};

export type ApiPaginated<T> = {
  data: T[];
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

export type LoginResult = {
  token: string;
  user: AuthenticatedUser | null;
};

export { API_BASE_URL, TOKEN_KEY, getApiBaseUrl } from '../api/apiCore';

function unwrapUser(payload: AuthenticatedUser | ApiEnvelope<AuthenticatedUser>): AuthenticatedUser {
  if (payload && typeof payload === 'object' && 'user' in payload && payload.user) {
    return payload.user;
  }
  if (payload && typeof payload === 'object' && 'data' in payload && payload.data) {
    return payload.data;
  }
  return payload as AuthenticatedUser;
}

export class ErpApiService {
  getToken() {
    return window.localStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string) {
    window.localStorage.setItem(TOKEN_KEY, token);
  }

  clearToken() {
    clearApiToken();
  }

  private async requestRaw<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = apiHeaders(options);

    const response = await fetch(endpoint(path), {
      ...options,
      headers,
    });

    const payload = await parseJsonResponse(response);

    if (!response.ok) {
      if (response.status === 401) this.clearToken();
      throw new Error(extractErrorMessage(payload, `Cererea a esuat (${response.status}).`));
    }

    return payload as T;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    return unwrapApiPayload<T>(await this.requestRaw<T | ApiEnvelope<T>>(path, options));
  }

  async login(email: string, password: string, organizationId: string | number): Promise<LoginResult> {
    const payload = await this.requestRaw<ApiEnvelope<AuthenticatedUser> & Record<string, unknown>>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, organization_id: organizationId }),
    });

    const data = payload.data as (AuthenticatedUser & { token?: string }) | undefined;
    const userPayload = payload.user as (AuthenticatedUser & { token?: string }) | undefined;
    const token = String(payload.token ?? payload.access_token ?? payload.bearer_token ?? data?.token ?? userPayload?.token ?? '');
    if (!token) {
      throw new Error('Raspunsul de login nu contine bearer token.');
    }

    this.setToken(token);
    let user: AuthenticatedUser | null = null;
    try {
      user = await this.me();
    } catch {
      user = (payload.user as AuthenticatedUser | undefined) ?? (payload.data as AuthenticatedUser | undefined) ?? null;
    }

    return { token, user };
  }

  async me() {
    const payload = await this.request<AuthenticatedUser | ApiEnvelope<AuthenticatedUser>>('/me');
    return unwrapUser(payload);
  }

  async logout() {
    try {
      await this.request('/logout', { method: 'POST' });
    } finally {
      this.clearToken();
    }
  }

  async list<T>(resource: string, params: Record<string, string | number | undefined> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') query.set(key, String(value));
    });
    return this.request<T[]>(`/${resource}${query.size ? `?${query.toString()}` : ''}`);
  }

  async listPaginated<T>(resource: string, params: Record<string, string | number | undefined> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') query.set(key, String(value));
    });
    const payload = await this.requestRaw<ApiPaginated<T> | T[]>(`/${resource}${query.size ? `?${query.toString()}` : ''}`);
    return Array.isArray(payload)
      ? { data: payload, current_page: 1, last_page: 1, per_page: payload.length, total: payload.length }
      : payload;
  }

  async searchUsersByCode(search: string, page = 1, perPage = 15) {
    const query = new URLSearchParams();
    query.set('search', search);
    query.set('per_page', String(perPage));
    query.set('page', String(page));
    const payload = await this.requestRaw<ApiUser[] | ApiPaginated<ApiUser>>(`/users/search/user-code?${query.toString()}`);
    return Array.isArray(payload)
      ? { data: payload, current_page: page, last_page: 1, per_page: perPage, total: payload.length }
      : payload;
  }

  async get<T>(resource: string, id: number) {
    return this.request<T>(`/${resource}/${id}`);
  }

  async create<T>(resource: string, data: Record<string, unknown>) {
    return this.request<T>(`/${resource}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async update<T>(resource: string, id: number, data: Record<string, unknown>) {
    return this.request<T>(`/${resource}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async listGrades(params: Record<string, string | number | undefined> = {}) {
    return this.listPaginated<ApiGrade>('grades', params);
  }

  async listGradeUsers(gradeId: number, params: Record<string, string | number | undefined> = {}) {
    return this.listPaginated<ApiUser>(`grades/${gradeId}/users`, params);
  }

  async listUserGrades(userId: number, params: Record<string, string | number | undefined> = {}) {
    return this.listPaginated<ApiUserGrade>(`users/${userId}/grades`, params);
  }

  async listUserEvents(userId: number, params: Record<string, string | number | undefined> = {}) {
    return this.listPaginated<ApiUserEvent>(`users/${userId}/events`, params);
  }

  async syncUserServices<T>(userId: number, services: ApiUserServiceAssignment[]) {
    return this.request<T>(`/users/service/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        services: services.map((service) => ({
          id: service.id,
          start_date: service.start_date,
        })),
      }),
    });
  }

  async attachPaymentModel<T>(paymentId: number, data: { model_type: ApiPayment['model_type']; model_id: number }) {
    return this.request<T>(`/payments/${paymentId}/attach-model`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async downloadPaymentReceipt(paymentId: number) {
    const response = await fetch(endpoint(`/payments/${paymentId}/receipt`), {
      headers: apiHeaders(),
    });

    if (!response.ok) {
      const payload = await parseJsonResponse(response);
      throw new Error(extractErrorMessage(payload, `Cererea a esuat (${response.status}).`));
    }

    return response.blob();
  }

  async downloadServicePaymentNote(assignmentId: number) {
    const response = await fetch(endpoint(`/service-assignments/${assignmentId}/payment-note`), {
      headers: apiHeaders(),
    });

    if (!response.ok) {
      const payload = await parseJsonResponse(response);
      throw new Error(extractErrorMessage(payload, `Cererea a esuat (${response.status}).`));
    }

    return response.blob();
  }

  async downloadServiceInvoice(assignmentId: number, format: 'pdf' | 'xml' = 'pdf') {
    const response = await fetch(endpoint(`/service-assignments/${assignmentId}/invoice/${format}`), {
      headers: apiHeaders(),
    });

    if (!response.ok) {
      const payload = await parseJsonResponse(response);
      throw new Error(extractErrorMessage(payload, `Cererea a esuat (${response.status}).`));
    }

    return response.blob();
  }

  async listUserDocuments(userId: number, page = 1, perPage = 15) {
    const payload = await this.requestRaw<ApiPaginated<ApiUserDocument> | ApiUserDocument[]>(`/users/${userId}/documents?page=${page}&per_page=${perPage}`);
    return Array.isArray(payload)
      ? { data: payload, current_page: 1, last_page: 1, per_page: payload.length, total: payload.length }
      : payload;
  }

  async uploadUserDocument(userId: number, data: ApiUserDocumentPayload) {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('category', data.category);
    formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    if (data.expires_at) formData.append('expires_at', data.expires_at);
    if (data.location_id) formData.append('location_id', String(data.location_id));

    return this.request<ApiUserDocument>(`/users/${userId}/documents`, {
      method: 'POST',
      body: formData,
    });
  }

  async replaceUserDocument(userId: number, documentId: number, data: ApiUserDocumentPayload) {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('category', data.category);
    formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    if (data.expires_at) formData.append('expires_at', data.expires_at);
    if (data.location_id) formData.append('location_id', String(data.location_id));

    return this.request<ApiUserDocument>(`/users/${userId}/documents/${documentId}/replace`, {
      method: 'POST',
      body: formData,
    });
  }

  async getUserDocumentDownloadUrl(userId: number, documentId: number) {
    return this.request<{ download_url: string; expires_at: string }>(`/users/${userId}/documents/${documentId}/download-url`, {
      method: 'POST',
    });
  }

  async downloadUserDocument(userId: number, documentId: number) {
    const { download_url } = await this.getUserDocumentDownloadUrl(userId, documentId);
    const response = await fetch(download_url, { headers: apiHeaders() });
    if (!response.ok) {
      const payload = await parseJsonResponse(response);
      throw new Error(extractErrorMessage(payload, `Cererea a esuat (${response.status}).`));
    }
    return response.blob();
  }

  async deleteUserDocument(userId: number, documentId: number) {
    await this.request(`/users/${userId}/documents/${documentId}`, { method: 'DELETE' });
  }

  async userActivity(userId: number, params: Record<string, string | number | undefined> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') query.set(key, String(value));
    });
    const payload = await this.requestRaw<ApiPaginated<ApiActivity> | ApiActivity[]>(`/users/${userId}/activity${query.size ? `?${query.toString()}` : ''}`);
    return Array.isArray(payload)
      ? { data: payload, current_page: 1, last_page: 1, per_page: payload.length, total: payload.length }
      : payload;
  }

  async saveEntityCustomFieldValues<T>(entityType: string, entityId: number, values: Record<string, unknown>) {
    return this.request<T>(`/${entityType}/${entityId}/custom-field-values`, {
      method: 'POST',
      body: JSON.stringify({ values }),
    });
  }

  async getEntityCustomFieldValues(entityType: string, entityId: number) {
    return this.request<ApiCustomFieldValues>(`/${entityType}/${entityId}/custom-field-values`);
  }

  async remove(resource: string, id: number) {
    await this.request(`/${resource}/${id}`, { method: 'DELETE' });
  }
}

export const erpApiService = new ErpApiService();
