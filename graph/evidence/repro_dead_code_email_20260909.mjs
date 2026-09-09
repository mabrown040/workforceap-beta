// Audit-only hermetic probes. No network, Auth, email, or database operations.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
import * as crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

function load(path, stubs, extra = {}) {
  const source = fs.readFileSync(path, 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(js, {
    exports, require: name => {
      if (name === 'server-only') return {};
      if (!(name in stubs)) throw new Error(`Unexpected dependency: ${name}`);
      return stubs[name];
    },
    process: { env: { RESEND_API_KEY: 'synthetic-only' } },
    console: { error() {}, warn() {}, log() {} },
    Date, Promise, ...extra,
  }, { filename: path });
  return exports;
}

async function partner() {
  let sends = 0; let loggedErrors = 0;
  const mod = load('lib/notifications/partner-notify.ts', {
    resend: { Resend: class { emails = { send: async () => { sends++; return { data: null, error: { name: 'rate_limit_exceeded', message: 'Synthetic provider rejection' } }; } }; } },
    '@/lib/db/prisma': { prisma: {
      partnerReferral: { findFirst: async () => ({ member: { fullName: 'Synthetic Member' }, partner: { name: 'Synthetic Partner', contactEmail: 'partner@example.invalid', notifyOnEnrollment: true } }) },
      user: { findUnique: async () => ({ fullName: 'Synthetic Member' }) },
      partner: { findUnique: async () => ({ name: 'Synthetic Partner', contactEmail: 'partner@example.invalid' }) },
    } },
    '@/lib/email/escapeHtml': { sanitizeEmailSubjectLine: x => x },
    '@/lib/diagnostics': { recordWorkflowDiagnostic: async () => {} },
  }, { console: { error() { loggedErrors++; }, warn() {} } });
  let failuresSurfaced = 0;
  for (const action of [() => mod.sendPartnerMilestoneEmail('synthetic-member', 'Program enrollment'), () => mod.sendPartnerNewMemberAssignedEmail('synthetic-member', 'synthetic-partner')]) {
    try { const result = await action(); if (result?.ok === false) failuresSurfaced++; } catch { failuresSurfaced++; }
  }
  console.log(JSON.stringify({ case: 'partner provider resolved errors', rejectedProviderSends: sends, failuresSurfaced, loggedErrors }));
  assert.equal(failuresSurfaced, 2, 'Both provider rejections must surface a failed result or throw; silently resolving loses retry/failure handling');
}

async function milestone() {
  const drafts = [{ type: 'celebrate_milestone', channel: 'email', subject: 'Synthetic', body: 'Synthetic', rationale: 'Synthetic', confidence: 1 }];
  let row = { id: 'synthetic-cascade', status: 'awaiting_approval', drafts, dispatchState: null, expiresAt: new Date(Date.now() + 86400000), user: { email: 'member@example.invalid', deletedAt: null } };
  let persisted; let providerCalls = 0;
  const db = { milestoneCascade: {
    findFirst: async () => structuredClone(row),
    updateMany: async ({ where, data }) => {
      const matches = row.dispatchState === null ? where.dispatchState.equals === Prisma.DbNull : JSON.stringify(where.dispatchState.equals) === JSON.stringify(row.dispatchState);
      assert.ok(matches && where.status === row.status, 'Dispatch writes must compare the persisted status and ledger');
      persisted = structuredClone(data); row = { ...row, ...persisted }; return { count: 1 };
    },
  } };
  const mod = load('lib/milestoneCascade/sendApprovedCascade.ts', {
    'node:crypto': crypto, '@prisma/client': { Prisma },
    './dispatchState': load('lib/milestoneCascade/dispatchState.ts', { zod: { z } }),
    '@/lib/db/prisma': { prisma: { $transaction: async callback => callback(db) } },
    '@/lib/email': { sendMilestoneCascadeEmail: async () => { providerCalls++; return { ok: false, error: 'Synthetic provider rejection' }; } },
  });
  const result = await mod.dispatchApprovedCascade({ cascadeId: row.id, drafts, recipientEmail: row.user.email, approvedByUserId: 'synthetic-admin', sourceDrafts: drafts });
  console.log(JSON.stringify({ case: 'all cascade sends fail', providerCalls, emailsSent: result.emailsSent, emailsFailed: result.emailsFailed, persistedStatus: persisted.status, persistedHasOutcomes: Array.isArray(persisted.dispatchState?.entries) }));
  assert.notEqual(persisted.status, 'sent', 'A cascade with zero accepted messages and one failure must not persist sent status');
  assert.equal(providerCalls, 1); assert.equal(result.emailsFailed, 1);
  assert.equal(persisted.dispatchState.entries[0].status, 'failed');
}

async function diagnostics() {
  const mod = load('app/admin/diagnostics/page.tsx', {
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'next/navigation': { redirect: () => { throw new Error('Unexpected redirect'); } },
    'next/headers': { headers: async () => ({}) },
    '@/app/seo': { buildPageMetadataAsync: async () => ({}) },
    '@/lib/auth/server': { getUser: async () => ({ id: 'synthetic-admin' }) },
    '@/lib/tenant/adminPageScope': { resolveAdminPageTenant: async () => ({ ok: true }) },
    '@/lib/db/prisma': { prisma: { $queryRaw: async () => [{ ok: 1 }], workflowDiagnostic: { findMany: async () => { throw new Error('Synthetic diagnostics read failure'); } } } },
    '@/lib/events/catalog': { FUNNEL_DEFINITIONS: [] },
    '@/lib/diagnostics': { recordWorkflowDiagnostic: async () => {} },
    '@/lib/audit/readOnlyPortalAudit': { isReadOnlyPortalAuditHeader: () => true },
    '@/components/portal/PageHeader': {}, '@/components/portal/ui/DataTable': {},
    '@/components/portal/kit/pages/admin-subviews/DiagnosticsKit': { DiagnosticsKit: 'SyntheticDiagnosticsKit' },
  });
  const page = await mod.default({ searchParams: Promise.resolve({}) });
  const tiles = page.props.tiles;
  console.log(JSON.stringify({ case: 'diagnostics SELECTs fail while ping succeeds', tiles }));
  for (const name of ['Email Queue', 'Integrations']) {
    assert.notEqual(tiles.find(t => t.name === name).status, 'No recent activity', `${name} read failure must be distinguishable from a successful empty result`);
  }
}

const cases = { partner, milestone, diagnostics };
if (!cases[process.argv[2]]) throw new Error('Choose partner, milestone, or diagnostics');
await cases[process.argv[2]]();
