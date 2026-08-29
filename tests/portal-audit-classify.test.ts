import { describe, expect, it } from 'vitest';
import { classifyPortalAuditRow } from '../scripts/lib/portal-audit-classify.mjs';

describe('classifyPortalAuditRow', () => {
  it('fails rows that bounce back to login', () => {
    const result = classifyPortalAuditRow({
      path: '/admin',
      finalUrl: 'https://example.com/login?redirectTo=%2Fadmin',
      title: 'Login',
      documentStatus: 200,
      consoleErrors: [],
      pageErrors: [],
      bodyText: 'Sign in',
    });

    expect(result.ok).toBe(false);
    expect(result.failureReasons).toContain('login_redirect');
  });

  it('fails rows that render the shared route error fallback shell', () => {
    const result = classifyPortalAuditRow({
      path: '/partner',
      finalUrl: 'https://example.com/partner',
      title: 'Something went wrong',
      documentStatus: 200,
      consoleErrors: [],
      pageErrors: [],
      bodyText: 'Something went wrong The partner portal hit an unexpected error Please try again.',
    });

    expect(result.ok).toBe(false);
    expect(result.failureReasons).toContain('route_error_fallback');
  });

  it('fails rows that log runtime errors even if they stay off /login', () => {
    const result = classifyPortalAuditRow({
      path: '/dashboard',
      finalUrl: 'https://example.com/dashboard',
      title: 'Dashboard',
      documentStatus: 200,
      consoleErrors: ['TypeError: boom'],
      pageErrors: [],
      bodyText: 'Welcome back',
    });

    expect(result.ok).toBe(false);
    expect(result.failureReasons).toContain('console_errors');
  });

  it('fails rows that silently redirect to a different page', () => {
    const result = classifyPortalAuditRow({
      path: '/admin',
      finalUrl: 'https://example.com/en/dashboard',
      title: 'Your Dashboard',
      documentStatus: 200,
      consoleErrors: [],
      pageErrors: [],
      bodyText: 'Member dashboard',
    });

    expect(result.ok).toBe(false);
    expect(result.failureReasons).toContain('unexpected_redirect');
  });

  it('passes healthy rows', () => {
    const result = classifyPortalAuditRow({
      path: '/dashboard/jobs',
      finalUrl: 'https://example.com/dashboard/jobs',
      title: 'Jobs',
      documentStatus: 200,
      consoleErrors: [],
      pageErrors: [],
      bodyText: 'Browse jobs and save favorites',
      appReady: true,
      h1Count: 1,
    });

    expect(result.ok).toBe(true);
    expect(result.failureReasons).toEqual([]);
  });

  it('fails when a requested query variant is silently discarded', () => {
    const result = classifyPortalAuditRow({
      path: '/dashboard/ai-tools/resume-studio?view=coach',
      finalUrl: 'https://example.com/dashboard/ai-tools/resume-studio',
      queryVariantMatched: false,
      title: 'Resume Studio',
      documentStatus: 200,
      consoleErrors: [],
      pageErrors: [],
      bodyText: 'Resume coach workspace and editing tools',
      appReady: true,
      h1Count: 1,
    });

    expect(result.ok).toBe(false);
    expect(result.failureReasons).toContain('query_variant_mismatch');
  });

  it('passes a healthy query variant when the exact search state is retained', () => {
    const result = classifyPortalAuditRow({
      path: '/dashboard/ai-tools/resume-studio?view=coach',
      finalUrl: 'https://example.com/dashboard/ai-tools/resume-studio',
      queryVariantMatched: true,
      title: 'Resume Studio',
      documentStatus: 200,
      consoleErrors: [],
      pageErrors: [],
      bodyText: 'Resume coach workspace and editing tools',
      appReady: true,
      h1Count: 1,
    });

    expect(result.ok).toBe(true);
  });
});
