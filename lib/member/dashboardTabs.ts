export type MemberDashboardTab = 'home' | 'learning' | 'opportunities';

export type MemberDashboardTabLink = {
  id: MemberDashboardTab;
  label: string;
  href: string;
};

type ResolveMemberDashboardTabsArgs = {
  requestedTab: string | null | undefined;
  learningAvailable: boolean;
  opportunitiesAvailable: boolean;
  programSlug?: string | null;
};

const TAB_LABELS: Record<MemberDashboardTab, string> = {
  home: 'Home',
  learning: 'Learning',
  opportunities: 'Opportunities',
};

function normalizeRequestedTab(tab: string | null | undefined): MemberDashboardTab {
  if (tab === 'learning' || tab === 'opportunities') return tab;
  return 'home';
}

function tabHref(tab: MemberDashboardTab, programSlug?: string | null): string {
  const params = new URLSearchParams();
  if (programSlug) params.set('program', programSlug);
  if (tab !== 'home') params.set('tab', tab);
  const query = params.toString();
  return query ? `/dashboard?${query}` : '/dashboard';
}

export function resolveMemberDashboardTabs({
  requestedTab,
  learningAvailable,
  opportunitiesAvailable,
  programSlug,
}: ResolveMemberDashboardTabsArgs): {
  activeTab: MemberDashboardTab;
  availableTabs: MemberDashboardTabLink[];
} {
  const availableIds: MemberDashboardTab[] = [
    'home',
    ...(learningAvailable ? (['learning'] as const) : []),
    ...(opportunitiesAvailable ? (['opportunities'] as const) : []),
  ];
  const requested = normalizeRequestedTab(requestedTab);
  const activeTab = availableIds.includes(requested) ? requested : 'home';

  return {
    activeTab,
    availableTabs: availableIds.map((id) => ({
      id,
      label: TAB_LABELS[id],
      href: tabHref(id, programSlug),
    })),
  };
}
