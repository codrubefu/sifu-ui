export type RightName = string;

const impliedRights: Record<string, string[]> = {
  'users.manage': ['users.view', 'user-documents.view', 'user-documents.upload', 'user-documents.delete'],
  'articles.manage': ['articles.view', 'articles.create', 'articles.update', 'articles.delete'],
  'services.manage': ['services.view', 'services.create', 'services.update', 'services.delete', 'services.restore'],
  'groups.manage': ['groups.view'],
  'grades.manage': ['grades.view'],
  'rights.manage': ['rights.view'],
  'locations.manage': ['locations.view'],
  'location_groups.manage': ['location_groups.view'],
  'events.manage': ['events.view'],
  'event_participants.manage': ['event_participants.view'],
  'checkins.manage': ['event_participants.view'],
  'payments.manage': ['payments.view', 'payments.create', 'payments.update'],
  'sms.manage': ['sms.view'],
  'dashboard.manage': ['dashboard.view'],
  'reports.manage': ['reports.view', 'reports.export'],
  'segments.manage': ['segments.view'],
  'campaigns.manage': ['campaigns.view'],
  'gdpr.process': ['gdpr.export'],
  'smtp_settings.manage': ['smtp_settings.view'],
};

export function expandRights(rights: Iterable<RightName>) {
  const expanded = new Set(rights);
  let changed = true;

  while (changed) {
    changed = false;
    expanded.forEach((right) => {
      impliedRights[right]?.forEach((impliedRight) => {
        if (!expanded.has(impliedRight)) {
          expanded.add(impliedRight);
          changed = true;
        }
      });
    });
  }

  return expanded;
}

export function hasRight(rights: Set<RightName>, rightName: RightName) {
  return rights.has(rightName);
}

export function hasAnyRight(rights: Set<RightName>, rightNames: RightName[] = []) {
  return rightNames.length === 0 || rightNames.some((right) => hasRight(rights, right));
}

export function hasAllRights(rights: Set<RightName>, rightNames: RightName[] = []) {
  return rightNames.every((right) => hasRight(rights, right));
}

export function extractUserRights(user: { groups?: Array<{ rights?: Array<{ name?: string }> }> } | null | undefined) {
  const baseRights = new Set<string>();
  user?.groups?.forEach((group) => {
    group.rights?.forEach((right) => {
      if (right.name) baseRights.add(right.name);
    });
  });

  if (user && baseRights.size === 0) {
    baseRights.add('profile.view');
  }

  return expandRights(baseRights);
}
