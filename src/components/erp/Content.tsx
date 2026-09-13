import { useMemo } from 'react';
import type { Announcement, FormType, Payment } from '../../types/erp';
import { GroupsRightsView } from './access/GroupsRightsView';
import { AdminsView } from './admins/AdminsView';
import { AnnouncementFormPage } from './announcements/AnnouncementFormPage';
import { AnnouncementsView } from './announcements/AnnouncementsView';
import { ArticlesModuleRoutes } from './articles/ArticlesModule';
import { BranchesView } from './branches/BranchesView';
import { CheckInView } from './check-in/CheckInView';
import { CustomFieldsView } from './custom-fields/CustomFieldsView';
import { GradesView } from './grades/GradesView';
import { DashboardView } from './dashboard/DashboardView';
import { EventsModuleRoutes } from './events/EventsModule';
import { LocationGroupsView } from './location-groups/LocationGroupsView';
import { PaymentFormPage } from './payments/PaymentFormPage';
import { PaymentsView } from './payments/PaymentsView';
import { ProfileDocumentsPage } from './profile/ProfileDocumentsPage';
import { ProfileAnnouncementsPage, ProfileCodePage, ProfileEventsPage, ProfileGradesPage, ProfileInfoPage, ProfilePrivacyPage, ProfileSecurityPage, ProfileServicesPage } from './profile/ProfilePages';
import { ReportsView } from './reports/ReportsView';
import { CampaignsView } from './campaigns/CampaignsView';
import { QuickCreateMenu } from './shared/QuickCreateMenu';
import type { ContentProps } from './shared/types';
import { EmailTemplatesView } from './settings/EmailTemplatesView';
import { SmtpSettingsView } from './settings/SmtpSettingsView';
import { SmsView } from './sms/SmsView';
import { ServicesView } from './services/ServicesView';
import { UsersView } from './users/UsersView';

export default function Content({ current, profileChildId, page, membersData, servicesData, announcementsData, paymentsData, activityData, navigateToForm, announcementForm, setAnnouncementForm, paymentForm, setPaymentForm, goBackToList, saveAnnouncement, saveAnnouncementAndClose, savePayment, savePaymentAndClose, formSuccess }: ContentProps) {
  const view = useMemo(() => {
    if (page.section === 'memberForm') {
      return <UsersView />;
    }
    if (page.section === 'serviceForm') {
      return <ServicesView openOnMount={page.mode === 'create'} />;
    }
    if (page.section === 'announcementForm') {
      return <AnnouncementFormPage mode={page.mode ?? 'create'} data={announcementForm} onChange={(field, value) => setAnnouncementForm((prev) => ({ ...prev, [field]: value } as Announcement))} onBack={() => goBackToList('announcements')} onSave={saveAnnouncement} onSaveAndClose={saveAnnouncementAndClose} successMessage={formSuccess} />;
    }
    if (page.section === 'paymentForm') {
      return <PaymentFormPage mode={page.mode ?? 'create'} data={paymentForm} onChange={(field, value) => setPaymentForm((prev) => ({ ...prev, [field]: value } as Payment))} onBack={() => goBackToList('payments')} onSave={savePayment} onSaveAndClose={savePaymentAndClose} successMessage={formSuccess} />;
    }

    switch (current) {
      case 'profile-info':
        return <ProfileInfoPage childId={profileChildId ?? undefined} />;
      case 'profile-security':
        return <ProfileSecurityPage />;
      case 'profile-privacy':
        return <ProfilePrivacyPage childId={profileChildId ?? undefined} />;
      case 'profile-announcements':
        return <ProfileAnnouncementsPage childId={profileChildId ?? undefined} />;
      case 'profile-events':
        return <ProfileEventsPage childId={profileChildId ?? undefined} />;
      case 'profile-services':
        return <ProfileServicesPage childId={profileChildId ?? undefined} />;
      case 'profile-code':
        return <ProfileCodePage childId={profileChildId ?? undefined} />;
      case 'profile-grades':
        return <ProfileGradesPage childId={profileChildId ?? undefined} />;
      case 'profile-documents':
        return <ProfileDocumentsPage childId={profileChildId ?? undefined} />;
      case 'members':
        return <UsersView />;
      case 'branches':
        return <BranchesView />;
      case 'location-groups':
        return <LocationGroupsView />;
      case 'admins':
        return <AdminsView />;
      case 'access':
        return <GroupsRightsView />;
      case 'custom-fields':
        return <CustomFieldsView />;
      case 'grades':
        return <GradesView />;
      case 'email-templates':
        return <EmailTemplatesView />;
      case 'smtp-settings':
        return <SmtpSettingsView />;
      case 'check-in':
        return <CheckInView />;
      case 'services':
        return <ServicesView />;
      case 'events':
      case 'events/calendar':
      case 'events/categories':
        return <EventsModuleRoutes />;
      case 'articles':
        return <ArticlesModuleRoutes />;
      case 'campaigns':
        return <CampaignsView />;
      case 'announcements':
        return <AnnouncementsView items={announcementsData} onCreate={() => navigateToForm('announcement', 'create')} onEdit={(item: Announcement) => navigateToForm('announcement', 'edit', item)} />;
      case 'sms':
        return <SmsView />;
      case 'payments':
        return <PaymentsView items={paymentsData} onCreate={() => navigateToForm('payment', 'create')} onEdit={(item: Payment) => navigateToForm('payment', 'edit', item)} />;
      case 'reports':
        return <ReportsView membersData={membersData} servicesData={servicesData} paymentsData={paymentsData} announcementsData={announcementsData} />;
      default:
        return (
          <div className="space-y-6">
            <QuickCreateMenu onNavigate={(type: FormType) => navigateToForm(type, 'create')} />
            <DashboardView membersData={membersData} servicesData={servicesData} paymentsData={paymentsData} activityData={activityData} />
          </div>
        );
    }
  }, [current, profileChildId, page, membersData, servicesData, announcementsData, paymentsData, activityData, navigateToForm, announcementForm, paymentForm, setAnnouncementForm, setPaymentForm, goBackToList, saveAnnouncement, saveAnnouncementAndClose, savePayment, savePaymentAndClose, formSuccess]);

  return <main className="mx-auto w-full max-w-[1540px] space-y-5 p-4 sm:p-5 lg:p-6 xl:p-7">{view}</main>;
}
