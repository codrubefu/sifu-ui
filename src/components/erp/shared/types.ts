import type React from 'react';
import type {
  Announcement,
  AppPage,
  FormMode,
  FormType,
  Member,
  Payment,
  SectionId,
  Service,
} from '../../../types/erp';
import type { ActivityPoint } from '../../../services/ErpJsonDataService';

export type DashboardViewProps = {
  membersData?: Member[];
  servicesData?: Service[];
  paymentsData?: Payment[];
  activityData?: ActivityPoint[];
};

export type MembersViewProps = {
  items: Member[];
  onCreate: () => void;
  onEdit: (item: Member) => void;
};

export type BranchesViewProps = {
  branches: string[];
  membersData: Member[];
};

export type ServicesViewProps = {
  items: Service[];
  onCreate: () => void;
  onEdit: (item: Service) => void;
};

export type AnnouncementsViewProps = {
  items: Announcement[];
  onCreate: () => void;
  onEdit: (item: Announcement) => void;
};

export type PaymentsViewProps = {
  items: Payment[];
  onCreate: () => void;
  onEdit: (item: Payment) => void;
};

export type ReportsViewProps = {
  membersData: Member[];
  servicesData: Service[];
  paymentsData: Payment[];
  announcementsData: Announcement[];
};

export type PageShellProps = {
  title?: string;
  subtitle?: string;
  backLabel?: string;
  onBack?: () => void;
  children: React.ReactNode;
};

export type MemberFormPageProps = {
  mode: Exclude<FormMode, null>;
  data: Member;
  branchOptions: string[];
  serviceOptions: Service[];
  onChange: (field: keyof Member, value: string) => void;
  onBack: () => void;
  onSave: () => void;
  onSaveAndClose?: () => void;
};

export type ServiceFormPageProps = {
  mode: Exclude<FormMode, null>;
  data: Service;
  onChange: (field: keyof Service, value: string) => void;
  onBack: () => void;
  onSave: () => void;
  onSaveAndClose?: () => void;
};

export type AnnouncementFormPageProps = {
  mode: Exclude<FormMode, null>;
  data: Announcement;
  onChange: (field: keyof Announcement, value: string) => void;
  onBack: () => void;
  onSave: () => void;
  onSaveAndClose?: () => void;
  successMessage?: string;
};

export type PaymentFormPageProps = {
  mode: Exclude<FormMode, null>;
  data: Payment;
  onChange: (field: keyof Payment, value: string) => void;
  onBack: () => void;
  onSave: () => void;
  onSaveAndClose?: () => void;
  successMessage?: string;
};

export type QuickCreateMenuProps = {
  onNavigate: (type: FormType) => void;
};

export type ContentProps = {
  current: SectionId;
  profileChildId: number | null;
  page: AppPage;
  membersData: Member[];
  servicesData: Service[];
  announcementsData: Announcement[];
  paymentsData: Payment[];
  branchesData: string[];
  activityData: ActivityPoint[];
  navigateToForm: (type: FormType, mode?: Exclude<FormMode, null>, item?: Member | Service | Announcement | Payment | null) => void;
  memberForm: Member;
  setMemberForm: React.Dispatch<React.SetStateAction<Member>>;
  serviceForm: Service;
  setServiceForm: React.Dispatch<React.SetStateAction<Service>>;
  announcementForm: Announcement;
  setAnnouncementForm: React.Dispatch<React.SetStateAction<Announcement>>;
  paymentForm: Payment;
  setPaymentForm: React.Dispatch<React.SetStateAction<Payment>>;
  goBackToList: (targetSection: SectionId) => void;
  saveMember: () => void;
  saveService: () => void;
  saveAnnouncement: () => void;
  saveAnnouncementAndClose?: () => void;
  savePayment: () => void;
  savePaymentAndClose?: () => void;
  formSuccess?: string;
};
