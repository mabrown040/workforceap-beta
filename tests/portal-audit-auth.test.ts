import { describe, expect, it } from 'vitest';
import { resolveMemberPortalCredentials } from '../scripts/lib/portal-audit-auth.mjs';

describe('resolveMemberPortalCredentials', () => {
  it('prefers canonical E2E_* credentials when both canonical and legacy aliases exist', () => {
    const creds = resolveMemberPortalCredentials({
      E2E_MEMBER_EMAIL: 'canonical@example.com',
      E2E_MEMBER_PASSWORD: 'canonical-secret',
      PLAYWRIGHT_MEMBER_EMAIL: 'legacy@example.com',
      PLAYWRIGHT_PORTAL_PASSWORD: 'legacy-secret',
    });

    expect(creds).toEqual({
      email: 'canonical@example.com',
      password: 'canonical-secret',
      source: 'canonical',
    });
  });

  it('falls back to legacy PLAYWRIGHT_* aliases for backward compatibility', () => {
    const creds = resolveMemberPortalCredentials({
      PLAYWRIGHT_MEMBER_EMAIL: 'legacy@example.com',
      PLAYWRIGHT_PORTAL_PASSWORD: 'legacy-secret',
    });

    expect(creds).toEqual({
      email: 'legacy@example.com',
      password: 'legacy-secret',
      source: 'legacy',
    });
  });

  it('returns nulls when neither credential pair is fully present', () => {
    const creds = resolveMemberPortalCredentials({
      E2E_MEMBER_EMAIL: 'missing-password@example.com',
    });

    expect(creds).toEqual({
      email: '',
      password: '',
      source: 'missing',
    });
  });
});
