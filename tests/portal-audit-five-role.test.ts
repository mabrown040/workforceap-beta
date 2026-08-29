import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import {
  resolvePortalRoleCredentials,
  validateDedicatedPortalCredentials,
} from '../scripts/lib/portal-audit-auth.mjs';
import {
  pendingDynamicRoutes,
  redactDynamicHrefPath,
  sanitizeAuditDiagnostic,
} from '../scripts/lib/portal-audit-browser.mjs';
import { classifyPortalAuditRow } from '../scripts/lib/portal-audit-classify.mjs';
import {
  auditPortalRouteInventory,
  comparePortalRouteInventory,
} from '../scripts/lib/portal-audit-inventory.mjs';
import {
  DYNAMIC_PATHS,
  REDIRECT_ONLY_PATHS,
  ROLE_ACCESS_MATRIX,
  STATIC_PATHS,
} from '../scripts/lib/portal-audit-paths.mjs';
import { validatePortalAuditTarget } from '../scripts/lib/portal-audit-target.mjs';

const roles = ['member', 'admin', 'employer', 'partner', 'counselor'];

function completeEnvironment(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'test',
    ...Object.fromEntries(
      roles.flatMap((role) => [
        [`E2E_${role.toUpperCase()}_EMAIL`, `${role}@example.test`],
        [`E2E_${role.toUpperCase()}_PASSWORD`, `${role}-secret`],
      ]),
    ),
  };
}

describe('five-role portal audit credentials', () => {
  it('requires a dedicated complete pair for every requested role', () => {
    const result = validateDedicatedPortalCredentials(roles, completeEnvironment());
    expect(result.ok).toBe(true);
    expect(Object.keys(result.credentials)).toEqual(roles);
    expect(result.errors).toEqual([]);
  });

  it('does not silently reuse member credentials for another role', () => {
    const result = validateDedicatedPortalCredentials(['member', 'partner'], {
      NODE_ENV: 'test',
      E2E_MEMBER_EMAIL: 'member@example.test',
      E2E_MEMBER_PASSWORD: 'member-secret',
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual({
      role: 'partner',
      code: 'missing_credentials',
      required: ['E2E_PARTNER_EMAIL', 'E2E_PARTNER_PASSWORD'],
    });
    expect(resolvePortalRoleCredentials('partner', completeEnvironment()).source).toBe('canonical');
  });

  it('rejects one identity reused across two role variables', () => {
    const env = completeEnvironment();
    env.E2E_ADMIN_EMAIL = env.E2E_MEMBER_EMAIL;
    const result = validateDedicatedPortalCredentials(roles, env);
    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual({
      role: 'admin',
      code: 'reused_identity',
      conflictsWith: 'member',
      required: ['E2E_ADMIN_EMAIL', 'E2E_ADMIN_PASSWORD'],
    });
  });
});

describe('portal route inventory gate', () => {
  it('matches every five-role App Router page to the checked-in manifest', () => {
    const result = auditPortalRouteInventory({
      appRoot: join(process.cwd(), 'app'),
      staticPaths: STATIC_PATHS,
      dynamicPaths: DYNAMIC_PATHS,
      redirectOnlyPaths: REDIRECT_ONLY_PATHS,
    });
    expect(result.ok).toBe(true);
    expect(result.sections).toMatchObject({
      member: { discoveredStaticCount: expect.any(Number) },
      admin: { discoveredDynamicCount: expect.any(Number) },
    });
  });

  it('reports missing static and dynamic routes instead of treating them as covered', () => {
    const result = comparePortalRouteInventory({
      discovered: {
        member: { static: ['/dashboard', '/dashboard/new'], dynamic: ['/dashboard/jobs/[id]'] },
      },
      staticPaths: { member: ['/dashboard'] },
      dynamicPaths: { member: [] },
      redirectOnlyPaths: {},
    });
    expect(result.ok).toBe(false);
    expect(result.sections).toMatchObject({
      member: {
        missingStatic: ['/dashboard/new'],
        missingDynamic: ['/dashboard/jobs/[id]'],
      },
    });
  });

  it('inventories intentional redirect pages without browser-auditing them', () => {
    expect(STATIC_PATHS.member).toContain('/dashboard/assessment');
    expect(STATIC_PATHS.member).not.toContain('/dashboard/assessments');
    expect(STATIC_PATHS.partner).not.toContain('/partner/members');
    expect(DYNAMIC_PATHS.partner).not.toContain('/partner/members/[id]');
    expect(REDIRECT_ONLY_PATHS.member).toContainEqual({
      path: '/dashboard/assessments',
      target: '/dashboard/assessment',
      reason: 'legacy_plural_alias',
    });
    expect(REDIRECT_ONLY_PATHS.partner).toContainEqual({
      path: '/partner/members',
      target: '/partner/referred-members',
      reason: 'renamed_route_alias',
    });
    expect(
      Object.values(REDIRECT_ONLY_PATHS)
        .flat()
        .every((entry) => entry.path && entry.target && entry.reason),
    ).toBe(true);
  });

  it('counts redirect-only pages as discovered inventory coverage and rejects overlap', () => {
    const covered = comparePortalRouteInventory({
      discovered: {
        member: { static: ['/dashboard', '/dashboard/legacy'], dynamic: [] },
      },
      staticPaths: { member: ['/dashboard'] },
      dynamicPaths: { member: [] },
      redirectOnlyPaths: {
        member: [{ path: '/dashboard/legacy', target: '/dashboard', reason: 'legacy_alias' }],
      },
    });
    expect((covered.sections as Record<string, any>).member).toMatchObject({
      ok: true,
      auditedStaticCount: 1,
      redirectOnlyStaticCount: 1,
    });

    const overlapped = comparePortalRouteInventory({
      discovered: { member: { static: ['/dashboard'], dynamic: [] } },
      staticPaths: { member: ['/dashboard'] },
      dynamicPaths: { member: [] },
      redirectOnlyPaths: {
        member: [{ path: '/dashboard', target: '/dashboard/home', reason: 'bad_overlap' }],
      },
    });
    expect((overlapped.sections as Record<string, any>).member.overlappingStatic).toEqual([
      '/dashboard',
    ]);
    expect(overlapped.ok).toBe(false);
  });

  it('keeps undiscovered dynamic routes explicitly pending', () => {
    expect(pendingDynamicRoutes(['/admin/members/[id]'])).toEqual([
      {
        pattern: '/admin/members/[id]',
        status: 'pending',
        reason: 'requires_discoverable_safe_fixture',
      },
    ]);
  });
});

describe('portal row quality signals', () => {
  it('detects wrong-role redirects, overflow, duplicate h1s, and unnamed controls', () => {
    const result = classifyPortalAuditRow({
      role: 'partner',
      sectionRoot: '/partner',
      path: '/partner/settings',
      finalUrl: 'https://example.test/dashboard',
      title: 'Dashboard',
      bodyText: 'Private portal text must not be copied into the artifact',
      documentStatus: 200,
      consoleErrors: [],
      pageErrors: [],
      appReady: true,
      h1Count: 2,
      horizontalOverflowPx: 24,
      unnamedInteractiveControls: [{ tag: 'button', role: null, hrefPath: null }],
    });
    expect(result.failureReasons).toEqual(
      expect.arrayContaining([
        'wrong_role_redirect',
        'unexpected_redirect',
        'horizontal_overflow',
        'multiple_h1',
        'unnamed_interactive_controls',
      ])
    );
    expect(result).not.toHaveProperty('bodyText');
  });

  it('fails a blank or half-hydrated 200 page', () => {
    const result = classifyPortalAuditRow({
      role: 'member',
      sectionRoot: '/dashboard',
      path: '/dashboard',
      finalUrl: 'https://example.test/dashboard',
      title: '',
      bodyText: '',
      documentStatus: 200,
      consoleErrors: [],
      pageErrors: [],
      appReady: false,
      h1Count: 0,
      horizontalOverflowPx: 0,
      interactiveControlCount: 0,
      unnamedInteractiveControls: [],
    });
    expect(result.ok).toBe(false);
    expect(result.failureReasons).toEqual(
      expect.arrayContaining(['app_not_ready', 'missing_h1']),
    );
  });

  it('redacts credentials, tokens, contact details, identifiers, and URL secrets from diagnostics', () => {
    const diagnostic = sanitizeAuditDiagnostic(
      'Bearer abcdef email=user@example.test phone=512-825-2896 member=550e8400-e29b-41d4-a716-446655440000 ' +
        'https://example.test/admin/members/550e8400-e29b-41d4-a716-446655440000?access_token=secret password=hunter2'
    );
    expect(diagnostic).not.toContain('abcdef');
    expect(diagnostic).not.toContain('user@example.test');
    expect(diagnostic).not.toContain('secret');
    expect(diagnostic).not.toContain('hunter2');
    expect(diagnostic).not.toContain('512-825-2896');
    expect(diagnostic).not.toContain('550e8400-e29b-41d4-a716-446655440000');
    expect(diagnostic).toContain('/admin/members/[redacted]');
  });

  it('redacts identifiers from dynamic unnamed-control hrefs', () => {
    expect(
      redactDynamicHrefPath('/admin/members/550e8400-e29b-41d4-a716-446655440000', [
        '/admin/members/[id]',
      ]),
    ).toBe('/admin/members/[redacted]');
    expect(
      redactDynamicHrefPath('/partner/referred-members/private-member-slug', [
        '/partner/referred-members/[memberId]',
      ]),
    ).toBe('/partner/referred-members/[redacted]');
  });

  it('ships a machine-readable result artifact schema', () => {
    const schema = JSON.parse(
      readFileSync(join(process.cwd(), 'docs', 'portal-audit-results.schema.json'), 'utf8')
    );
    expect(schema.$schema).toContain('2020-12');
    expect(schema.required).toEqual(
      expect.arrayContaining([
        'schemaVersion',
        'status',
        'targetValidation',
        'inventory',
        'accessMatrix',
        'roles',
        'summary',
      ])
    );
    expect(schema.properties.schemaVersion.const).toBe('2.0.0');
  });
});

describe('portal target and workflow trust gate', () => {
  it('accepts only the exact configured preview origin', () => {
    expect(
      validatePortalAuditTarget({
        baseURL: 'https://preview-123.vercel.app',
        mode: 'isolated_preview',
        trustedPreviewOrigin: 'https://preview-123.vercel.app',
      }).ok,
    ).toBe(true);
    expect(
      validatePortalAuditTarget({
        baseURL: 'https://attacker.vercel.app',
        mode: 'isolated_preview',
        trustedPreviewOrigin: 'https://preview-123.vercel.app',
      }),
    ).toMatchObject({ ok: false, errors: ['target_does_not_match_trusted_preview'] });
    expect(
      validatePortalAuditTarget({
        baseURL: 'https://workforceap.org',
        mode: 'isolated_preview',
        trustedPreviewOrigin: 'https://workforceap.org',
      }).errors,
    ).toContain('preview_target_must_not_be_production');
  });

  it('allows only exact WorkforceAP production origins and loopback local targets', () => {
    expect(
      validatePortalAuditTarget({
        baseURL: 'https://workforceap.org',
        mode: 'production_canary',
      }).ok,
    ).toBe(true);
    expect(
      validatePortalAuditTarget({
        baseURL: 'https://workforceap.org.evil.test',
        mode: 'production_canary',
      }).errors,
    ).toContain('production_target_not_allowlisted');
    expect(
      validatePortalAuditTarget({ baseURL: 'http://localhost:3000', mode: 'local' }).ok,
    ).toBe(true);
    expect(
      validatePortalAuditTarget({ baseURL: 'http://192.168.1.2:3000', mode: 'local' }).ok,
    ).toBe(false);
  });

  it('writes a fresh blocked artifact when target trust fails before credentials', () => {
    const directory = mkdtempSync(join(tmpdir(), 'portal-audit-target-'));
    const output = join(directory, 'result.json');
    const run = spawnSync(process.execPath, ['scripts/audit-portal-routes.mjs'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORTAL_AUDIT_MODE: 'isolated_preview',
        PLAYWRIGHT_BASE_URL: 'https://attacker.vercel.app',
        PORTAL_AUDIT_TRUSTED_PREVIEW_ORIGIN: 'https://trusted-preview.vercel.app',
        PORTAL_AUDIT_OUTPUT: output,
        E2E_MEMBER_EMAIL: 'must-not-be-used@example.test',
        E2E_MEMBER_PASSWORD: 'must-not-be-used',
      },
      encoding: 'utf8',
    });
    expect(run.status).toBe(1);
    expect(existsSync(output)).toBe(true);
    const result = JSON.parse(readFileSync(output, 'utf8'));
    expect(result).toMatchObject({
      status: 'blocked',
      baseURL: 'https://attacker.vercel.app',
      targetValidation: {
        ok: false,
        errors: ['target_does_not_match_trusted_preview'],
      },
      credentialValidation: { authenticatedIdentitiesDistinct: null },
    });
    expect(result.completedAt).toEqual(expect.any(String));
  });

  it('pins the credentialed workflow to trusted master and fixed target choices', () => {
    const workflow = readFileSync(
      join(process.cwd(), '.github', 'workflows', 'authenticated-portal-smoke.yml'),
      'utf8',
    );
    expect(workflow).not.toContain('base_url:');
    expect(workflow).toContain("github.ref == 'refs/heads/master'");
    expect(workflow).toContain('${{ secrets.PREVIEW_SITE_URL }}');
    expect(workflow).toContain("if-no-files-found: error");
    expect(workflow).not.toMatch(/\*\.vercel\.app/);
    expect(existsSync(join(process.cwd(), 'docs', 'portal-audit-results.json'))).toBe(false);
  });

  it('declares an explicit allowed and denied target set for every role', () => {
    for (const role of roles) {
      const policy = ROLE_ACCESS_MATRIX[role as keyof typeof ROLE_ACCESS_MATRIX];
      expect(policy.allowed).toContain(role);
      expect(new Set([...policy.allowed, ...policy.denied]).size).toBe(roles.length);
      expect(policy.allowed.filter((target) => policy.denied.includes(target))).toEqual([]);
    }
    expect(ROLE_ACCESS_MATRIX.admin.allowed).toContain('counselor');
  });
});
