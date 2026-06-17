import { describe, expect, it } from 'vitest';
import { resolveMemberDashboardTabs } from './dashboardTabs';

describe('resolveMemberDashboardTabs', () => {
  it('shows only home for a new member with no learning or opportunities content', () => {
    const state = resolveMemberDashboardTabs({
      requestedTab: 'learning',
      learningAvailable: false,
      opportunitiesAvailable: false,
    });

    expect(state.activeTab).toBe('home');
    expect(state.availableTabs.map((tab) => tab.id)).toEqual(['home']);
  });

  it('deep-links to learning when learning content is available', () => {
    const state = resolveMemberDashboardTabs({
      requestedTab: 'learning',
      learningAvailable: true,
      opportunitiesAvailable: true,
    });

    expect(state.activeTab).toBe('learning');
    expect(state.availableTabs.map((tab) => tab.id)).toEqual(['home', 'learning', 'opportunities']);
  });

  it('falls back to home when a requested tab has no content', () => {
    const state = resolveMemberDashboardTabs({
      requestedTab: 'opportunities',
      learningAvailable: true,
      opportunitiesAvailable: false,
    });

    expect(state.activeTab).toBe('home');
    expect(state.availableTabs.map((tab) => tab.id)).toEqual(['home', 'learning']);
  });

  it('preserves the selected program slug in tab links', () => {
    const state = resolveMemberDashboardTabs({
      requestedTab: null,
      learningAvailable: true,
      opportunitiesAvailable: true,
      programSlug: 'it-support',
    });

    expect(state.availableTabs.map((tab) => tab.href)).toEqual([
      '/dashboard?program=it-support',
      '/dashboard?program=it-support&tab=learning',
      '/dashboard?program=it-support&tab=opportunities',
    ]);
  });
});
