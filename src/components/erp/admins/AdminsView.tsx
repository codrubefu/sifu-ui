import { UserManagementView } from '../members/MembersView';
import { useTranslation } from 'react-i18next';

export function AdminsView() {
  const { t } = useTranslation();
  return (
    <UserManagementView
      resource="administrators"
      title={t('admins.title')}
      addLabel={t('admins.add')}
      countLabel={t('admins.countLabel')}
      singularLabel={t('admins.singularLabel')}
      showGroupsInList
      useRelationTabs
    />
  );
}
