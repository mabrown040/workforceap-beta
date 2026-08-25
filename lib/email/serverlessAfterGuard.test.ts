/**
 * Regression guard: user-facing / staff-notify emails scheduled from API
 * routes must use next/server `after()` (or await before responding).
 * Bare `sendX(...).catch` after the success path freezes on Vercel serverless.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '../..');

function read(rel: string) {
  return readFileSync(join(ROOT, rel), 'utf8');
}

const ROUTES_REQUIRING_AFTER = [
  {
    path: 'app/api/apply/signup/route.ts',
    symbols: ['sendApplicationConfirmationEmail', 'sendNewApplicationAdminEmail'],
  },
  {
    path: 'app/api/member/eligibility/route.ts',
    symbols: [
      'sendEligibilityScreeningConfirmationEmail',
      'sendEligibilityScreeningAdminEmail',
    ],
  },
  {
    path: 'app/api/q/[token]/submit/route.ts',
    symbols: [
      'sendEligibilityScreeningConfirmationEmail',
      'sendEligibilityScreeningAdminEmail',
    ],
  },
  {
    path: 'app/api/member/pre-screening/route.ts',
    symbols: ['sendPreScreeningReadyEmail'],
  },
  {
    path: 'app/api/employer/signup/route.ts',
    symbols: ['sendEmployerWelcomeEmail', 'sendEmployerSignupAdminAlertEmail'],
  },
  {
    path: 'app/api/admin/employers/[id]/approve/route.ts',
    symbols: ['sendEmployerApprovedEmail'],
  },
  {
    path: 'app/api/admin/employers/[id]/reject/route.ts',
    symbols: ['sendEmployerRejectedEmail'],
  },
  {
    path: 'app/api/invite/accept/route.ts',
    symbols: ['sendInvitationAcceptedEmail'],
  },
] as const;

test('email hot-path routes import after from next/server', () => {
  for (const route of ROUTES_REQUIRING_AFTER) {
    const src = read(route.path);
    assert.match(
      src,
      /import\s*\{[^}]*\bafter\b[^}]*\}\s*from\s*['"]next\/server['"]/,
      `${route.path} must import after from next/server`,
    );
  }
});

test('email hot-path routes wrap Resend sends in after()', () => {
  for (const route of ROUTES_REQUIRING_AFTER) {
    const src = read(route.path);
    for (const symbol of route.symbols) {
      const callRe = new RegExp(String.raw`\b${symbol}\s*\(`, 'g');
      const calls = [...src.matchAll(callRe)];
      const callSites = calls.filter((m) => {
        const idx = m.index ?? 0;
        const lineStart = src.lastIndexOf('\n', idx - 1) + 1;
        const line = src.slice(lineStart, src.indexOf('\n', idx));
        // Skip import / type-only mentions.
        return !/^\s*import\b/.test(line) && !/\bfrom\s+['"]/.test(line);
      });
      assert.ok(
        callSites.length > 0,
        `${route.path}: expected runtime call to ${symbol}`,
      );
      for (const m of callSites) {
        const idx = m.index ?? 0;
        const window = src.slice(Math.max(0, idx - 160), idx);
        assert.match(
          window,
          /after\s*\(\s*\(\s*\)\s*=>\s*$/,
          `${route.path}: ${symbol} at offset ${idx} must be immediately inside after(() =>`,
        );
      }
    }
  }
});

test('contact form awaits Resend before responding', () => {
  const src = read('app/api/contact/route.ts');
  assert.match(src, /await\s+resend\.emails\.send\s*\(/);
});
