import { UserManagementView } from '../members/MembersView';

export function UsersView() {
  return <UserManagementView resource="clients" useRelationTabs />;
}
