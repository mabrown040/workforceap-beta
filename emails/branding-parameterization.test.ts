/**
 * Track E (Sprint E.1 PR 2) — verify that the email body builders we
 * migrated in this PR substitute branding values into their output rather
 * than hardcoding "WorkforceAP" / `info@workforceap.org` / `#ad2c4d`.
 *
 * These are intentionally string-contains assertions (not snapshot tests)
 * so that incidental rewording does not churn the test, but a regression
 * that re-hardcodes a brand string DOES.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { applicationAcceptedHtml } from './application-accepted';
import { jobApprovedHtml } from './job-approved';
import { jobRejectedHtml } from './job-rejected';
import { invitationHtml } from './invitation';
import { counselorAssignedHtml } from './counselor-assigned';
import type { OrganizationBranding } from '@/lib/tenant/organizationBranding';

const AAUL: OrganizationBranding = {
  orgId: 'org-aaul',
  name: 'AAUL',
  logoUrl: 'https://cdn.example.com/aaul-logo.png',
  primaryColor: '#0066ff',
  supportEmail: 'support@aaul.example.com',
  domain: 'https://aaul.example.com',
  domainLabel: 'aaul.example.com',
};

// applicationAcceptedHtml -------------------------------------------------

test('applicationAcceptedHtml uses org name when branding is supplied', () => {
  const html = applicationAcceptedHtml({ firstName: 'Sam', branding: AAUL });
  assert.ok(html.includes('AAUL'), 'should include org name');
  assert.ok(!html.includes('to WorkforceAP'), 'should NOT include hardcoded WorkforceAP');
});

test('applicationAcceptedHtml uses branded support email', () => {
  const html = applicationAcceptedHtml({ firstName: 'Sam', branding: AAUL });
  assert.ok(html.includes('support@aaul.example.com'), 'should include AAUL support email');
  assert.ok(!html.includes('info@workforceap.org'), 'should NOT include WorkforceAP info email');
});

test('applicationAcceptedHtml falls back to WorkforceAP defaults without branding', () => {
  const html = applicationAcceptedHtml({ firstName: 'Sam' });
  assert.ok(html.includes('WorkforceAP'));
  assert.ok(html.includes('info@workforceap.org'));
});

// jobApprovedHtml ----------------------------------------------------------

test('jobApprovedHtml says "{org name} job board" when branding is supplied', () => {
  const html = jobApprovedHtml({
    jobTitle: 'Customer Success Lead',
    companyName: 'Acme Inc',
    branding: AAUL,
  });
  assert.ok(html.includes('AAUL job board'), 'should reference AAUL job board');
  assert.ok(!html.includes('WorkforceAP job board'), 'should NOT mention WorkforceAP job board');
});

// jobRejectedHtml ----------------------------------------------------------

test('jobRejectedHtml uses branded support email', () => {
  const html = jobRejectedHtml({
    jobTitle: 'Customer Success Lead',
    companyName: 'Acme Inc',
    reason: 'Out of region',
    branding: AAUL,
  });
  assert.ok(html.includes('support@aaul.example.com'));
  assert.ok(!html.includes('info@workforceap.org'));
});

// invitationHtml -----------------------------------------------------------

test('invitationHtml says "join {org name}" when branding is supplied', () => {
  const html = invitationHtml({
    inviterName: 'Jordan Lee',
    role: 'admin',
    branding: AAUL,
  });
  assert.ok(html.includes('join AAUL'));
  assert.ok(!html.includes('join WorkforceAP'));
});

// counselorAssignedHtml ----------------------------------------------------

test('counselorAssignedHtml uses org primary color for the link accent', () => {
  const html = counselorAssignedHtml({
    firstName: 'Sam',
    counselorName: 'Maria',
    messagesUrl: 'https://aaul.example.com/dashboard/messages',
    branding: AAUL,
  });
  assert.ok(html.includes('color: #0066ff'), 'should style link with branded primary color');
  assert.ok(!html.includes('color: #ad2c4d'), 'should NOT style link with WorkforceAP maroon');
});

test('counselorAssignedHtml falls back to WorkforceAP accent without branding', () => {
  const html = counselorAssignedHtml({
    firstName: 'Sam',
    counselorName: 'Maria',
    messagesUrl: 'https://www.workforceap.org/dashboard/messages',
  });
  assert.ok(html.includes('color: #ad2c4d'));
});

// branded layout (smoke test) ---------------------------------------------

test('brandedEmailLayout interpolates branded logo + footer when branding is passed', async () => {
  // Lazy import: the layout module pulls in @/lib/email/escapeHtml which is
  // a regular module, so this is safe to import top-level — we keep it
  // colocated with the other layout assertions for discoverability.
  const { brandedEmailLayout } = await import('@/lib/email/template');
  const html = brandedEmailLayout({
    title: 'Hello',
    bodyHtml: '<p>body</p>',
    branding: AAUL,
  });
  assert.ok(html.includes('https://cdn.example.com/aaul-logo.png'), 'should use branded logo URL');
  assert.ok(html.includes('AAUL'), 'should use org name in alt + footer');
  assert.ok(html.includes('aaul.example.com'), 'should use branded domain label in footer link');
  assert.ok(!html.includes('Workforce Advancement Project'), 'should NOT include hardcoded org name');
  assert.ok(!html.includes('wap_logo.png'), 'should NOT include hardcoded logo path');
});

test('brandedEmailLayout retains WorkforceAP defaults when branding is omitted', async () => {
  const { brandedEmailLayout } = await import('@/lib/email/template');
  const html = brandedEmailLayout({
    title: 'Hello',
    bodyHtml: '<p>body</p>',
  });
  assert.ok(html.includes('Workforce Advancement Project'));
  assert.ok(html.includes('wap_logo.png'));
});
