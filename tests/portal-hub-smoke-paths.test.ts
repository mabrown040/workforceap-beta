import { describe, expect, it } from 'vitest';
import {
  isPortalHubSmokePath,
  PORTAL_HUB_SMOKE_PATHS,
  PORTAL_HUB_SMOKE_ROLES,
} from '../scripts/lib/portal-hub-smoke-paths.mjs';
import { SECTION_LOGIN_REDIRECT } from '../scripts/lib/portal-audit-paths.mjs';

type PortalHubSmokeRole = keyof typeof PORTAL_HUB_SMOKE_PATHS;
const HUB_SMOKE_ROLES = PORTAL_HUB_SMOKE_ROLES as readonly PortalHubSmokeRole[];

describe('portal hub smoke paths', () => {
  it('covers member, counselor, and employer only', () => {
    expect([...HUB_SMOKE_ROLES]).toEqual(['member', 'counselor', 'employer']);
    expect((Object.keys(PORTAL_HUB_SMOKE_PATHS) as PortalHubSmokeRole[]).sort()).toEqual(
      [...HUB_SMOKE_ROLES].sort(),
    );
  });

  it('uses hub roots that match the portal audit login redirects', () => {
    for (const role of HUB_SMOKE_ROLES) {
      expect(PORTAL_HUB_SMOKE_PATHS[role].hub).toBe(SECTION_LOGIN_REDIRECT[role]);
    }
  });

  it('keeps each deep link inside its role root', () => {
    for (const role of HUB_SMOKE_ROLES) {
      const { hub, deepLink } = PORTAL_HUB_SMOKE_PATHS[role];
      expect(deepLink.startsWith(`${hub}/`)).toBe(true);
      expect(isPortalHubSmokePath(deepLink, role)).toBe(true);
      expect(isPortalHubSmokePath(hub, role)).toBe(true);
    }
  });

  it('rejects cross-portal paths', () => {
    expect(isPortalHubSmokePath('/employer/jobs', 'member')).toBe(false);
    expect(isPortalHubSmokePath('/dashboard/jobs', 'counselor')).toBe(false);
    expect(isPortalHubSmokePath('/counselor/inbox', 'employer')).toBe(false);
  });
});
