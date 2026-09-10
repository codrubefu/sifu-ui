export type MemberStatus = 'Activ' | 'Suspendat' | 'Expirat' | 'Rezervat';
export type ServiceStatus = 'Activ' | 'Expirat' | 'Suspendat' | 'Consumat' | 'Rezervat';
export type AnnouncementStatus = 'Draft' | 'Programat' | 'Publicat';
export type PaymentStatus = 'Plătit' | 'În așteptare' | 'Eșuat';
export type PaymentMethod = 'Card' | 'Numerar' | 'Transfer';

export type SectionId =
  | 'dashboard'
  | 'check-in'
  | 'profile-info'
  | 'profile-security'
  | 'profile-privacy'
  | 'profile-announcements'
  | 'profile-events'
  | 'profile-services'
  | 'profile-code'
  | 'profile-grades'
  | 'profile-documents'
  | 'branches'
  | 'location-groups'
  | 'admins'
  | 'access'
  | 'custom-fields'
  | 'grades'
  | 'smtp-settings'
  | 'members'
  | 'services'
  | 'events'
  | 'events/calendar'
  | 'events/categories'
  | 'articles'
  | 'campaigns'
  | 'announcements'
  | 'sms'
  | 'payments'
  | 'reports';

export type FormSection = 'list' | 'memberForm' | 'serviceForm' | 'announcementForm' | 'paymentForm';
export type FormMode = 'create' | 'edit' | null;
export type FormType = 'member' | 'service' | 'article' | 'announcement' | 'payment';

export type Credentials = {
  username: string;
  password: string;
};

export type Member = {
  id: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  status: MemberStatus;
  lastContact: string;
  address: string;
  notes: string;
  branch: string;
};

export type Service = {
  id: number | string;
  name: string;
  description: string | null;
  price: string | number;
  currency: string;
  duration_days: number | null;
  max_users: number | null;
  is_active: boolean;
  users_count?: number;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
};

export type UserServiceAssignment = {
  id: number;
  start_date?: string;
};

export type UserServiceHistory = {
  id: number | null;
  service_id: number;
  name: string;
  start_date: string | null;
  expires_at: string | null;
  is_active: boolean;
};

export type Announcement = {
  id: string;
  title: string;
  audience: string;
  scheduled: string;
  status: AnnouncementStatus;
  content: string;
};

export type Payment = {
  id: string;
  invoice: string;
  member: string;
  amount: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionDate: string;
};

export type AppPage = {
  section: FormSection;
  mode: FormMode;
};
