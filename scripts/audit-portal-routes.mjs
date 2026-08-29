/**
 * Five-role authenticated portal audit.
 *
 * Security contract:
 * - validate an exact trusted origin before reading credentials or launching a browser;
 * - use one distinct account and one in-memory storage state per role;
 * - run exhaustive desktop/mobile coverage only against an isolated preview;
 * - keep production to the explicit, read-only root canary plus access probes.
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DYNAMIC_PATHS,
  PRODUCTION_CANARY_PATHS,
  REDIRECT_ONLY_PATHS,
  ROLE_ACCESS_MATRIX,
  SECTION_LOGIN_REDIRECT,
  STATIC_PATHS,
} from './lib/portal-audit-paths.mjs';
import {
  loadPortalAuditEnvFile,
  validateDedicatedPortalCredentials,
} from './lib/portal-audit-auth.mjs';
import { canonicalPathname, classifyPortalAuditRow } from './lib/portal-audit-classify.mjs';
import {
  PORTAL_AUDIT_NAVIGATION_TIMEOUT_MS,
  PORTAL_AUDIT_VIEWPORTS,
  inspectPortalPage,
  pendingDynamicRoutes,
  sanitizeAuditDiagnostic,
  sanitizeAuditUrl,
  waitForPortalReady,
} from './lib/portal-audit-browser.mjs';
import {
  auditPortalRouteInventory,
  formatPortalRouteInventoryDrift,
} from './lib/portal-audit-inventory.mjs';
import {
  formatPortalAuditTargetErrors,
  validatePortalAuditTarget,
} from './lib/portal-audit-target.mjs';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const root = join(scriptDirectory, '..');
const rawBaseURL = process.env.PLAYWRIGHT_BASE_URL?.trim() || 'http://localhost:3000';
const requestedMode =
  process.env.PORTAL_AUDIT_MODE?.trim().toLowerCase() ||
  (rawBaseURL.startsWith('http://localhost:') || rawBaseURL.startsWith('http://127.0.0.1:')
    ? 'local'
    : '');
const sectionArg = (process.env.PORTAL_AUDIT_SECTION ?? 'all').trim().toLowerCase();
const outputPath = process.env.PORTAL_AUDIT_OUTPUT
  ? resolve(root, process.env.PORTAL_AUDIT_OUTPUT)
  : join(root, 'test-results', 'portal-audit-results.json');
const routeConcurrency = Math.min(
  12,
  Math.max(1, Number.parseInt(process.env.PORTAL_AUDIT_ROUTE_CONCURRENCY ?? '8', 10) || 8)
);
const runStartedAt = Date.now();
let deadlineAt = runStartedAt + 25 * 60_000;
let trustedOrigin = null;

const allDynamicPatterns = Object.values(DYNAMIC_PATHS).flat();

function emptyInventory() {
  return {
    ok: false,
    generatedAt: new Date().toISOString(),
    sections: {},
    unexpectedManifestSections: [],
    status: 'not_run',
  };
}

function emptySummary() {
  return {
    totalStaticChecks: 0,
    passedStaticChecks: 0,
    failedStaticChecks: 0,
    failedRoles: 0,
    totalAccessProbes: 0,
    failedAccessProbes: 0,
    pendingDynamicRoutes: 0,
  };
}

const artifact = {
  $schema: '../docs/portal-audit-results.schema.json',
  schemaVersion: '2.0.0',
  // A run starts failed/incomplete. Only a complete green run changes this to passed,
  // so a killed process can never leave a stale success artifact behind.
  status: 'failed',
  baseURL: null,
  generatedAt: new Date(runStartedAt).toISOString(),
  completedAt: null,
  requestedSections: [],
  viewports: [],
  targetValidation: {
    ok: false,
    mode: requestedMode || null,
    targetClass: null,
    errors: ['not_validated'],
  },
  inventory: emptyInventory(),
  credentialValidation: {
    ok: false,
    errors: [],
    sources: {},
    authenticatedIdentitiesDistinct: null,
  },
  executionPolicy: {
    mode: requestedMode || null,
    mutations: 'none',
    authState: 'in_memory_per_role',
    dynamicRoutes: 'pending_without_safe_discoverable_fixture',
    routeConcurrency,
    deadlineMs: null,
  },
  accessMatrix: {
    policy: ROLE_ACCESS_MATRIX,
    probes: [],
    summary: { total: 0, passed: 0, failed: 0 },
  },
  roles: {},
  summary: emptySummary(),
  fatalError: 'audit_did_not_complete',
};

function writeArtifact() {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
}

function sectionsToRun(mode) {
  const roles = Object.keys(STATIC_PATHS);
  if (mode !== 'local' && sectionArg !== 'all') {
    throw new Error('Trusted preview and production audits must run the complete five-role matrix');
  }
  if (sectionArg === 'all') return roles;
  if (roles.includes(sectionArg)) return [sectionArg];
  throw new Error(`PORTAL_AUDIT_SECTION must be one of: all, ${roles.join(', ')}`);
}

function routesForRole(role, mode) {
  return mode === 'production_canary' ? PRODUCTION_CANARY_PATHS[role] : STATIC_PATHS[role];
}

function viewportsForMode(mode) {
  return mode === 'production_canary' ? [PORTAL_AUDIT_VIEWPORTS[0]] : PORTAL_AUDIT_VIEWPORTS;
}

function routeURL(path) {
  return new URL(path, `${trustedOrigin}/`).toString();
}

function queryVariantMatches(requestedPath, finalUrl) {
  const requested = new URL(requestedPath, `${trustedOrigin}/`);
  if (!requested.search) return true;
  const final = new URL(finalUrl);
  const normalize = (params) => [...params.entries()]
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue));
  return JSON.stringify(normalize(requested.searchParams))
    === JSON.stringify(normalize(final.searchParams));
}

function pathIsInRole(url, role) {
  const pathname = canonicalPathname(url);
  const rootPath = SECTION_LOGIN_REDIRECT[role];
  return pathname === rootPath || pathname.startsWith(`${rootPath}/`);
}

function remainingTimeout(maximum = PORTAL_AUDIT_NAVIGATION_TIMEOUT_MS) {
  const remaining = deadlineAt - Date.now();
  if (remaining <= 0) throw new Error('portal_audit_deadline_exceeded');
  return Math.max(1_000, Math.min(maximum, remaining));
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

function createLimiter(limit) {
  let active = 0;
  const queue = [];
  const drain = () => {
    while (active < limit && queue.length > 0) {
      const next = queue.shift();
      active += 1;
      Promise.resolve()
        .then(next.task)
        .then(next.resolve, next.reject)
        .finally(() => {
          active -= 1;
          drain();
        });
    }
  };
  return (task) =>
    new Promise((resolvePromise, rejectPromise) => {
      queue.push({ task, resolve: resolvePromise, reject: rejectPromise });
      drain();
    });
}

async function dismissCookieBanner(page) {
  await page.getByRole('button', { name: /decline/i }).click().catch(() => {});
}

async function captureRoleStorageState(browser, role, credential) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    const entry = SECTION_LOGIN_REDIRECT[role];
    await page.goto(routeURL(`/login?redirectTo=${encodeURIComponent(entry)}`), {
      waitUntil: 'domcontentloaded',
      timeout: remainingTimeout(),
    });
    await waitForPortalReady(page, remainingTimeout(5_000));
    await dismissCookieBanner(page);
    await page.locator('#email').fill(credential.email);
    await page.locator('#password').fill(credential.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL((url) => canonicalPathname(url.toString()) !== '/login', {
      timeout: remainingTimeout(45_000),
    });

    if (!pathIsInRole(page.url(), role)) {
      await page.goto(routeURL(entry), {
        waitUntil: 'domcontentloaded',
        timeout: remainingTimeout(),
      });
    }
    await waitForPortalReady(page, remainingTimeout(5_000));

    if (!pathIsInRole(page.url(), role)) {
      throw new Error(
        `Dedicated ${role} login landed on ${canonicalPathname(page.url())}, outside ${entry}`
      );
    }

    const identityResponse = await page.request.get(routeURL('/api/member/profile'), {
      timeout: remainingTimeout(10_000),
      failOnStatusCode: false,
    });
    const identityBody = await identityResponse.json().catch(() => null);
    const identityId = identityBody?.user?.id;
    if (!identityResponse.ok() || typeof identityId !== 'string' || !identityId) {
      throw new Error(`Unable to verify the authenticated ${role} identity`);
    }

    return {
      storageState: await context.storageState(),
      finalPathname: canonicalPathname(page.url()),
      identityId,
    };
  } finally {
    await context.close();
  }
}

function uniqueDiagnostics(values) {
  return [...new Set(values.map(sanitizeAuditDiagnostic).filter(Boolean))].slice(0, 20);
}

async function auditRoute(context, role, viewportName, path) {
  const page = await context.newPage();
  const startedAt = Date.now();
  const consoleErrors = [];
  const pageErrors = [];
  const documentResponses = [];
  const handleConsole = (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  };
  const handlePageError = (error) => pageErrors.push(error?.message ?? String(error));
  const handleResponse = (response) => {
    if (response.request().resourceType() === 'document') {
      documentResponses.push({ status: response.status(), url: response.url() });
    }
  };

  page.on('console', handleConsole);
  page.on('pageerror', handlePageError);
  page.on('response', handleResponse);

  try {
    try {
      await page.goto(routeURL(path), {
        waitUntil: 'domcontentloaded',
        timeout: remainingTimeout(),
      });
      await waitForPortalReady(page, remainingTimeout(5_000));
    } catch (error) {
      const message = error?.message ?? String(error);
      const recoverable =
        message.includes('net::ERR_ABORTED') || message.includes('interrupted by another navigation');
      if (!recoverable) pageErrors.push(`Navigation failed: ${message}`);
      await waitForPortalReady(page, remainingTimeout(3_000)).catch(() => {});
    }

    let inspection;
    try {
      inspection = await inspectPortalPage(page, allDynamicPatterns);
    } catch (error) {
      pageErrors.push(`Page inspection failed: ${error?.message ?? String(error)}`);
      inspection = {
        bodyText: '',
        appReady: false,
        h1Count: 0,
        horizontalOverflowPx: 0,
        interactiveControlCount: 0,
        unnamedInteractiveControlCount: 0,
        unnamedInteractiveControls: [],
      };
    }

    const finalUrl = page.url();
    const finalDocument =
      [...documentResponses].reverse().find((response) => response.url === finalUrl) ??
      documentResponses.at(-1) ??
      null;

    return classifyPortalAuditRow({
      role,
      viewport: viewportName,
      path,
      sectionRoot: SECTION_LOGIN_REDIRECT[role],
      finalUrl: sanitizeAuditUrl(finalUrl),
      queryVariantMatched: queryVariantMatches(path, finalUrl),
      title: sanitizeAuditDiagnostic(await page.title().catch(() => '')),
      bodyText: inspection.bodyText,
      appReady: inspection.appReady,
      documentStatus: finalDocument?.status ?? null,
      consoleErrors: uniqueDiagnostics(consoleErrors),
      pageErrors: uniqueDiagnostics(pageErrors),
      h1Count: inspection.h1Count,
      horizontalOverflowPx: inspection.horizontalOverflowPx,
      interactiveControlCount: inspection.interactiveControlCount,
      unnamedInteractiveControlCount: inspection.unnamedInteractiveControlCount,
      unnamedInteractiveControls: inspection.unnamedInteractiveControls,
      durationMs: Date.now() - startedAt,
    });
  } finally {
    page.off('console', handleConsole);
    page.off('pageerror', handlePageError);
    page.off('response', handleResponse);
    await page.close();
  }
}

async function auditViewport(browser, role, storageState, viewport, paths, limit) {
  const context = await browser.newContext({
    storageState,
    viewport: { width: viewport.width, height: viewport.height },
  });
  try {
    const rows = await Promise.all(
      paths.map((path) => limit(() => auditRoute(context, role, viewport.name, path)))
    );
    const failed = rows.filter((row) => !row.ok).length;
    return {
      viewport,
      summary: { total: rows.length, passed: rows.length - failed, failed },
      rows,
    };
  } finally {
    await context.close();
  }
}

async function probeRoleAccess(browser, sourceRole, storageState, targetRole, expectation, limit) {
  return limit(async () => {
    const context = await browser.newContext({
      storageState,
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    try {
      const targetRoot = SECTION_LOGIN_REDIRECT[targetRole];
      await page.goto(routeURL(targetRoot), {
        waitUntil: 'domcontentloaded',
        timeout: remainingTimeout(),
      });
      await waitForPortalReady(page, remainingTimeout(5_000));
      const finalPathname = canonicalPathname(page.url());
      const insideTarget = pathIsInRole(page.url(), targetRole);
      const ok = expectation === 'allowed' ? insideTarget : !insideTarget;
      return {
        sourceRole,
        targetRole,
        expectation,
        requestedPath: targetRoot,
        finalPathname,
        ok,
      };
    } catch (error) {
      return {
        sourceRole,
        targetRole,
        expectation,
        requestedPath: SECTION_LOGIN_REDIRECT[targetRole],
        finalPathname: null,
        ok: false,
        error: sanitizeAuditDiagnostic(error?.message ?? String(error)),
      };
    } finally {
      await context.close();
    }
  });
}

function summarize() {
  let total = 0;
  let passed = 0;
  let failed = 0;
  let failedRoles = 0;
  let pendingDynamicRoutes = 0;
  for (const role of Object.values(artifact.roles)) {
    if (role.status !== 'passed') failedRoles += 1;
    for (const viewport of Object.values(role.viewports ?? {})) {
      total += viewport.summary.total;
      passed += viewport.summary.passed;
      failed += viewport.summary.failed;
    }
    pendingDynamicRoutes += role.dynamicRoutes?.filter((route) => route.status === 'pending').length ?? 0;
  }
  return {
    totalStaticChecks: total,
    passedStaticChecks: passed,
    failedStaticChecks: failed,
    failedRoles,
    totalAccessProbes: artifact.accessMatrix.summary.total,
    failedAccessProbes: artifact.accessMatrix.summary.failed,
    pendingDynamicRoutes,
  };
}

function checkpoint() {
  artifact.summary = summarize();
  writeArtifact();
}

async function run() {
  writeArtifact();

  try {
    const targetValidation = validatePortalAuditTarget({
      baseURL: rawBaseURL,
      mode: requestedMode,
      trustedPreviewOrigin: process.env.PORTAL_AUDIT_TRUSTED_PREVIEW_ORIGIN,
    });
    artifact.targetValidation = {
      ok: targetValidation.ok,
      mode: targetValidation.mode,
      targetClass: targetValidation.targetClass,
      errors: targetValidation.errors,
    };
    artifact.baseURL = targetValidation.origin;
    artifact.executionPolicy.mode = targetValidation.mode;
    if (!targetValidation.ok) {
      artifact.status = 'blocked';
      throw new Error(formatPortalAuditTargetErrors(targetValidation));
    }

    trustedOrigin = targetValidation.origin;
    deadlineAt =
      runStartedAt + (targetValidation.mode === 'production_canary' ? 6 * 60_000 : 25 * 60_000);
    artifact.executionPolicy.deadlineMs = deadlineAt - runStartedAt;
    const sections = sectionsToRun(targetValidation.mode);
    const viewports = viewportsForMode(targetValidation.mode);
    artifact.requestedSections = sections;
    artifact.viewports = viewports;

    const inventory = auditPortalRouteInventory({
      appRoot: join(root, 'app'),
      staticPaths: STATIC_PATHS,
      dynamicPaths: DYNAMIC_PATHS,
      redirectOnlyPaths: REDIRECT_ONLY_PATHS,
    });
    artifact.inventory = { ...inventory, status: inventory.ok ? 'passed' : 'failed' };
    checkpoint();

    if (!inventory.ok) {
      console.error(formatPortalRouteInventoryDrift(inventory));
      throw new Error('portal_route_inventory_drift');
    }

    if (process.env.PORTAL_AUDIT_INVENTORY_ONLY === '1') {
      artifact.status = 'partial';
      artifact.fatalError = 'inventory_only_not_release_evidence';
      return;
    }

    // Target trust is established. It is now safe to load and resolve credentials.
    loadPortalAuditEnvFile(join(root, '.env.e2e.local'));
    const validation = validateDedicatedPortalCredentials(sections, process.env);
    artifact.credentialValidation = {
      ok: validation.ok,
      errors: validation.errors,
      sources: Object.fromEntries(
        sections.map((role) => [role, validation.credentials[role]?.source ?? 'missing'])
      ),
      authenticatedIdentitiesDistinct: null,
    };
    checkpoint();

    if (!validation.ok) {
      artifact.status = 'blocked';
      for (const error of validation.errors) {
        console.error(`${error.role}: ${error.code}; set ${error.required.join(' and ')}`);
      }
      throw new Error('dedicated_portal_credentials_invalid');
    }

    const browser = await chromium.launch({ headless: true });
    try {
      const authByRole = {};
      const loginResults = await mapWithConcurrency(sections, 2, async (role) => {
        console.error(`Authenticating dedicated ${role} account`);
        return [role, await captureRoleStorageState(browser, role, validation.credentials[role])];
      });
      for (const [role, auth] of loginResults) authByRole[role] = auth;

      const identityOwners = new Map();
      const authenticatedIdentityErrors = [];
      for (const role of sections) {
        const identityId = authByRole[role].identityId;
        const previousRole = identityOwners.get(identityId);
        if (previousRole) {
          authenticatedIdentityErrors.push({
            role,
            code: 'authenticated_identity_reused',
            conflictsWith: previousRole,
            required: [],
          });
        } else {
          identityOwners.set(identityId, role);
        }
      }
      artifact.credentialValidation.authenticatedIdentitiesDistinct =
        authenticatedIdentityErrors.length === 0;
      artifact.credentialValidation.errors.push(...authenticatedIdentityErrors);
      artifact.credentialValidation.ok = authenticatedIdentityErrors.length === 0;
      checkpoint();
      if (authenticatedIdentityErrors.length > 0) {
        artifact.status = 'blocked';
        throw new Error('authenticated_portal_identities_are_not_distinct');
      }

      const limit = createLimiter(routeConcurrency);
      const probePromises = [];
      for (const sourceRole of sections) {
        const policy = ROLE_ACCESS_MATRIX[sourceRole];
        for (const targetRole of policy.allowed) {
          probePromises.push(
            probeRoleAccess(
              browser,
              sourceRole,
              authByRole[sourceRole].storageState,
              targetRole,
              'allowed',
              limit
            )
          );
        }
        for (const targetRole of policy.denied) {
          probePromises.push(
            probeRoleAccess(
              browser,
              sourceRole,
              authByRole[sourceRole].storageState,
              targetRole,
              'denied',
              limit
            )
          );
        }
      }
      artifact.accessMatrix.probes = await Promise.all(probePromises);
      const failedProbes = artifact.accessMatrix.probes.filter((probe) => !probe.ok);
      artifact.accessMatrix.summary = {
        total: artifact.accessMatrix.probes.length,
        passed: artifact.accessMatrix.probes.length - failedProbes.length,
        failed: failedProbes.length,
      };
      checkpoint();

      await Promise.all(
        sections.map(async (role) => {
          const paths = routesForRole(role, targetValidation.mode);
          const roleResult = {
            status: 'running',
            loginRedirect: SECTION_LOGIN_REDIRECT[role],
            auth: {
              credentialSource: validation.credentials[role].source,
              storageState: 'captured_in_memory',
              loginFinalPathname: authByRole[role].finalPathname,
              identityVerification: 'server_user_id_distinct',
            },
            dynamicRoutes: pendingDynamicRoutes(DYNAMIC_PATHS[role]),
            accessProbeFailures: failedProbes.filter((probe) => probe.sourceRole === role).length,
            viewports: {},
            error: null,
          };
          artifact.roles[role] = roleResult;
          checkpoint();

          try {
            console.error(
              `Auditing ${role}: ${paths.length} routes x ${viewports.length} viewport(s)`
            );
            const viewportResults = await Promise.all(
              viewports.map(async (viewport) => [
                viewport.name,
                await auditViewport(
                  browser,
                  role,
                  authByRole[role].storageState,
                  viewport,
                  paths,
                  limit
                ),
              ])
            );
            roleResult.viewports = Object.fromEntries(viewportResults);
            roleResult.status =
              roleResult.accessProbeFailures === 0 &&
              Object.values(roleResult.viewports).every((entry) => entry.summary.failed === 0)
                ? 'passed'
                : 'failed';
          } catch (error) {
            roleResult.status = 'failed';
            roleResult.error = sanitizeAuditDiagnostic(error?.message ?? String(error));
          } finally {
            checkpoint();
          }
        })
      );
    } finally {
      await browser.close();
    }

    artifact.summary = summarize();
    const staticAndAccessPassed =
      artifact.summary.failedRoles === 0 &&
      artifact.summary.failedStaticChecks === 0 &&
      artifact.summary.failedAccessProbes === 0;
    artifact.status = !staticAndAccessPassed
      ? 'failed'
      : artifact.summary.pendingDynamicRoutes > 0
        ? 'partial'
        : 'passed';
    artifact.fatalError = artifact.status === 'passed'
      ? null
      : artifact.status === 'partial'
        ? 'dynamic_action_coverage_pending'
        : 'portal_audit_checks_failed';
  } catch (error) {
    if (artifact.status !== 'blocked') artifact.status = 'failed';
    artifact.fatalError = sanitizeAuditDiagnostic(error?.message ?? String(error));
    console.error(artifact.fatalError);
  } finally {
    artifact.completedAt = new Date().toISOString();
    artifact.summary = summarize();
    writeArtifact();
    console.log(`Wrote ${outputPath}`);
    console.log(JSON.stringify(artifact.summary));
    if (artifact.status !== 'passed') process.exitCode = 1;
  }
}

await run();
