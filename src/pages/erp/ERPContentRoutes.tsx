import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import {
  AdminsView,
  AnnouncementFormPage,
  AnnouncementsView,
  ArticlesModuleRoutes,
  BranchesView,
  CheckInView,
  CustomFieldsView,
  DashboardView,
  EventsModuleRoutes,
  CampaignsView,
  GroupsRightsView,
  GradesView,
  LocationGroupsView,
  PaymentFormPage,
  PaymentsView,
  ProfileEventsPage,
  ProfileAnnouncementsPage,
  ProfileInfoPage,
  ProfilePrivacyPage,
  ProfileSecurityPage,
  ProfileServicesPage,
  QuickCreateMenu,
  ReportsView,
  SmsView,
  ServicesView,
  UsersView,
} from '../../components/erp';
import type {
  Announcement,
  FormMode,
  FormType,
  Member,
  Payment,
  SectionId,
  Service,
} from '../../types/erp';
import type { ActivityPoint } from '../../services/ErpJsonDataService';

type ERPContentRoutesProps = {
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
  savePayment: () => void;
  formSuccess?: string;
};

export default function ERPContentRoutes({
  membersData,
  servicesData,
  announcementsData,
  paymentsData,
  activityData,
  navigateToForm,
  announcementForm,
  setAnnouncementForm,
  paymentForm,
  setPaymentForm,
  goBackToList,
  saveAnnouncement,
  savePayment,
  formSuccess,
}: ERPContentRoutesProps) {
  return (
    <Routes>
      <Route
        path="dashboard"
        element={
          <div className="space-y-6">
            <QuickCreateMenu onNavigate={(type) => navigateToForm(type, 'create')} />
            <DashboardView membersData={membersData} servicesData={servicesData} paymentsData={paymentsData} activityData={activityData} />
          </div>
        }
      />

      <Route path="branches" element={<ProtectedRoute requiredRights={['locations.view', 'locations.manage']}><BranchesView /></ProtectedRoute>} />
      <Route path="location-groups" element={<ProtectedRoute requiredRights={['location_groups.view', 'location_groups.manage']}><LocationGroupsView /></ProtectedRoute>} />
      <Route path="profile-info" element={<ProfileInfoPage />} />
      <Route path="profile-security" element={<ProtectedRoute><ProfileSecurityPage /></ProtectedRoute>} />
      <Route path="profile-privacy" element={<ProtectedRoute><ProfilePrivacyPage /></ProtectedRoute>} />
      <Route path="profile-announcements" element={<ProtectedRoute><ProfileAnnouncementsPage /></ProtectedRoute>} />
      <Route path="profile-events" element={<ProtectedRoute requiredRights={['events.view', 'events.manage']}><ProfileEventsPage /></ProtectedRoute>} />
      <Route path="profile-services" element={<ProfileServicesPage />} />

      <Route path="profile/info" element={<ProfileInfoPage />} />
      <Route path="profile/security" element={<ProtectedRoute><ProfileSecurityPage /></ProtectedRoute>} />
      <Route path="profile/privacy" element={<ProtectedRoute><ProfilePrivacyPage /></ProtectedRoute>} />
      <Route path="profile/announcements" element={<ProtectedRoute><ProfileAnnouncementsPage /></ProtectedRoute>} />
      <Route path="profile/events" element={<ProtectedRoute requiredRights={['events.view', 'events.manage']}><ProfileEventsPage /></ProtectedRoute>} />
      <Route path="profile/services" element={<ProfileServicesPage />} />

      <Route path="admins" element={<ProtectedRoute requiredRights={['users.view', 'users.manage']}><AdminsView /></ProtectedRoute>} />
      <Route path="access" element={<ProtectedRoute requiredRights={['groups.view', 'groups.manage']}><GroupsRightsView /></ProtectedRoute>} />
      <Route path="custom-fields" element={<ProtectedRoute requiredRights={['custom-fields.view', 'custom-fields.manage']}><CustomFieldsView /></ProtectedRoute>} />
      <Route path="grades" element={<ProtectedRoute requiredRights={['grades.view', 'grades.manage']}><GradesView /></ProtectedRoute>} />
      <Route path="check-in" element={<ProtectedRoute requiredRights={['event_participants.manage', 'checkins.manage']}><CheckInView /></ProtectedRoute>} />

      <Route path="members" element={<UsersView />} />
      <Route path="members/:id" element={<UsersView />} />
      <Route path="members/new" element={<UsersView />} />
      <Route path="members/edit" element={<UsersView />} />

      <Route path="services" element={<ServicesView />} />
      <Route path="services/new" element={<ServicesView openOnMount />} />
      <Route path="services/edit" element={<ServicesView />} />
      <Route path="services/:id/members" element={<ServicesView />} />

      <Route path="events/*" element={<EventsModuleRoutes />} />
      <Route path="articles/*" element={<ArticlesModuleRoutes />} />
      <Route path="campaigns" element={<ProtectedRoute requiredRights={['campaigns.view', 'campaigns.manage', 'reports.manage', 'users.manage']}><CampaignsView /></ProtectedRoute>} />

      <Route path="announcements" element={<AnnouncementsView items={announcementsData} onCreate={() => navigateToForm('announcement', 'create')} onEdit={(item) => navigateToForm('announcement', 'edit', item)} />} />
      <Route path="announcements/new" element={<AnnouncementFormPage mode="create" data={announcementForm} onChange={(field, value) => setAnnouncementForm((prev) => ({ ...prev, [field]: value } as Announcement))} onBack={() => goBackToList('announcements')} onSave={saveAnnouncement} successMessage={formSuccess} />} />
      <Route path="announcements/edit" element={<AnnouncementFormPage mode="edit" data={announcementForm} onChange={(field, value) => setAnnouncementForm((prev) => ({ ...prev, [field]: value } as Announcement))} onBack={() => goBackToList('announcements')} onSave={saveAnnouncement} successMessage={formSuccess} />} />

      <Route path="sms" element={<SmsView />} />

      <Route path="payments" element={<PaymentsView items={paymentsData} onCreate={() => navigateToForm('payment', 'create')} onEdit={(item) => navigateToForm('payment', 'edit', item)} />} />
      <Route path="payments/new" element={<PaymentFormPage mode="create" data={paymentForm} onChange={(field, value) => setPaymentForm((prev) => ({ ...prev, [field]: value } as Payment))} onBack={() => goBackToList('payments')} onSave={savePayment} successMessage={formSuccess} />} />
      <Route path="payments/edit" element={<PaymentFormPage mode="edit" data={paymentForm} onChange={(field, value) => setPaymentForm((prev) => ({ ...prev, [field]: value } as Payment))} onBack={() => goBackToList('payments')} onSave={savePayment} successMessage={formSuccess} />} />

      <Route path="reports" element={<ReportsView membersData={membersData} servicesData={servicesData} paymentsData={paymentsData} announcementsData={announcementsData} />} />

      <Route path="" element={<Navigate to="dashboard" replace />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}
