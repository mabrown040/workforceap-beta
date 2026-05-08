#!/usr/bin/env tsx
/**
 * End-to-end integration test runner for the Coursera integration.
 *
 * Verifies all three credential paths actually work:
 *   1. Inbound xAPI  — Coursera → /api/xapi/oauth/token, /api/xapi/statements (we PRETEND to be Coursera)
 *   2. Outbound B4B  — we → api.coursera.org/oauth2/client_credentials/token + business endpoints
 *   3. Reverse-engineer which Coursera For Business endpoints are reachable for our org
 *
 * Reads credentials EXCLUSIVELY from environment variables. Refuses to run if any are missing
 * (per-section). Never prints raw secrets — only short obfuscated previews.
 *
 * Run:
 *   npm run coursera:test
 *
 * Required env vars (see docs/COURSERA-INTEGRATION-TEST.md for how to get each):
 *   COURSERA_XAPI_CLIENT_ID
 *   COURSERA_XAPI_CLIENT_SECRET
 *   COURSERA_B4B_CLIENT_ID
 *   COURSERA_B4B_CLIENT_SECRET
 *
 * Optional:
 *   COURSERA_TARGET_BASE_URL        defaults to http://localhost:3000
 *   COURSERA_ORG_ID                 defaults to 8R2W4McwOMWJp9cCBV1kvw  (WorkforceAP org id)
 *   COURSERA_ORG_SLUG               defaults to workforce-advancement
 *   COURSERA_OAUTH_TOKEN_URL        defaults to https://api.coursera.com/oauth2/client_credentials/token
 *   COURSERA_API_BASE_URL           defaults to https://api.coursera.com
 */

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';

const PASS = `${GREEN}PASS${RESET}`;
const FAIL = `${RED}FAIL${RESET}`;
const SKIP = `${YELLOW}SKIP${RESET}`;

const DEFAULT_TARGET_BASE_URL = 'http://localhost:3000';
const DEFAULT_ORG_ID = '8R2W4McwOMWJp9cCBV1kvw';
const DEFAULT_ORG_SLUG = 'workforce-advancement';
const DEFAULT_COURSERA_OAUTH_URL = 'https://api.coursera.com/oauth2/client_credentials/token';
const DEFAULT_COURSERA_API_BASE = 'https://api.coursera.com';

type EndpointResult = {
  url: string;
  status: number | 'ERROR';
  message?: string;
  payloadPreview?: string;
};

type Findings = {
  inboundTokenOk: boolean | null;
  inboundTokenDetail: string;
  inboundStatementOk: boolean | null;
  inboundStatementDetail: string;
  outboundTokenOk: boolean | null;
  outboundTokenScope: string | null;
  outboundTokenDetail: string;
  endpoints: EndpointResult[];
  recommendations: string[];
};

const findings: Findings = {
  inboundTokenOk: null,
  inboundTokenDetail: '',
  inboundStatementOk: null,
  inboundStatementDetail: '',
  outboundTokenOk: null,
  outboundTokenScope: null,
  outboundTokenDetail: '',
  endpoints: [],
  recommendations: [],
};

function obfuscate(value: string | undefined | null): string {
  if (!value) return '<missing>';
  if (value.length <= 8) return `${value.slice(0, 1)}***`;
  return `${value.slice(0, 4)}…${value.slice(-2)} (len=${value.length})`;
}

function previewJson(value: unknown, max = 320): string {
  let str: string;
  try {
    str = typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    str = String(value);
  }
  return str.length > max ? `${str.slice(0, max)}… <truncated>` : str;
}

function requireEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  if (!value) return null;
  return value;
}

function logSection(title: string) {
  console.log(`\n${BOLD}${CYAN}=== ${title} ===${RESET}`);
}

function logRow(label: string, status: 'pass' | 'fail' | 'skip', detail: string) {
  const tag = status === 'pass' ? PASS : status === 'fail' ? FAIL : SKIP;
  console.log(`  ${tag}  ${label}${detail ? `  ${DIM}${detail}${RESET}` : ''}`);
}

async function readBody(response: Response): Promise<{ text: string; json: unknown | null }> {
  const text = await response.text();
  let json: unknown | null = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { text, json };
}

// ----- (a) Inbound xAPI test -----

async function runInboundTokenTest(targetBase: string, clientId: string, clientSecret: string) {
  const url = `${targetBase}/api/xapi/oauth/token`;
  const formBody = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody.toString(),
    });
  } catch (error) {
    findings.inboundTokenOk = false;
    findings.inboundTokenDetail = `network error: ${error instanceof Error ? error.message : String(error)}`;
    logRow(`POST ${url}`, 'fail', findings.inboundTokenDetail);
    return null;
  }

  const { text, json } = await readBody(response);
  if (!response.ok) {
    findings.inboundTokenOk = false;
    findings.inboundTokenDetail = `HTTP ${response.status} — ${previewJson(text, 200)}`;
    logRow(`POST ${url}`, 'fail', findings.inboundTokenDetail);
    return null;
  }

  const body = json as Record<string, unknown> | null;
  const accessToken = typeof body?.access_token === 'string' ? body.access_token : '';
  if (!accessToken) {
    findings.inboundTokenOk = false;
    findings.inboundTokenDetail = `200 but no access_token — ${previewJson(text, 200)}`;
    logRow(`POST ${url}`, 'fail', findings.inboundTokenDetail);
    return null;
  }

  const tokenType = body?.token_type || 'unknown';
  const expiresIn = body?.expires_in;
  const scope = typeof body?.scope === 'string' ? body.scope : null;
  const isJwt = accessToken.split('.').length === 3;
  findings.inboundTokenOk = true;
  findings.inboundTokenDetail = `token_type=${tokenType} expires_in=${expiresIn ?? '?'} scope=${scope ?? '?'} format=${isJwt ? 'JWT' : 'opaque'}`;
  logRow(`POST ${url}`, 'pass', findings.inboundTokenDetail);
  return accessToken;
}

async function runInboundStatementTest(targetBase: string, accessToken: string) {
  // Try /api/xapi/statements first (canonical), fall back to /api/xapi if it 404s.
  const candidates = [`${targetBase}/api/xapi/statements`, `${targetBase}/api/xapi`];
  const sampleStatement = {
    id: `urn:uuid:${cryptoRandomUuid()}`,
    actor: {
      objectType: 'Agent',
      mbox: 'mailto:integration-test@workforceap.org',
      name: 'Integration Test Actor',
    },
    verb: {
      id: 'http://adlnet.gov/expapi/verbs/completed',
      display: { 'en-US': 'completed' },
    },
    object: {
      objectType: 'Activity',
      id: 'https://www.coursera.org/learn/integration-test-course',
      definition: {
        name: { 'en-US': 'Integration Test Course' },
        type: 'http://adlnet.gov/expapi/activities/course',
      },
    },
    result: {
      completion: true,
      success: true,
      score: { scaled: 1, raw: 100, min: 0, max: 100 },
    },
    timestamp: new Date().toISOString(),
  };

  for (const url of candidates) {
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'X-Experience-API-Version': '1.0.3',
        },
        body: JSON.stringify(sampleStatement),
      });
    } catch (error) {
      findings.inboundStatementOk = false;
      findings.inboundStatementDetail = `network error to ${url}: ${error instanceof Error ? error.message : String(error)}`;
      logRow(`POST ${url}`, 'fail', findings.inboundStatementDetail);
      continue;
    }

    const { text, json } = await readBody(response);

    if (response.status === 404) {
      logRow(`POST ${url}`, 'skip', '404 — trying next candidate');
      continue;
    }

    if (response.ok || response.status === 204) {
      findings.inboundStatementOk = true;
      findings.inboundStatementDetail = `HTTP ${response.status} — ${previewJson(json ?? text, 200)}`;
      logRow(`POST ${url}`, 'pass', findings.inboundStatementDetail);
      return;
    }

    findings.inboundStatementOk = false;
    findings.inboundStatementDetail = `HTTP ${response.status} — ${previewJson(text, 200)}`;
    logRow(`POST ${url}`, 'fail', findings.inboundStatementDetail);
    return;
  }

  if (findings.inboundStatementOk == null) {
    findings.inboundStatementOk = false;
    findings.inboundStatementDetail = findings.inboundStatementDetail || 'no candidate endpoint reachable';
  }
}

// ----- (b) Outbound For Business API test -----

async function runOutboundOauth(b4bId: string, b4bSecret: string, oauthUrl: string) {
  const body = new URLSearchParams({ grant_type: 'client_credentials' });
  const basic = Buffer.from(`${b4bId}:${b4bSecret}`).toString('base64');

  let response: Response;
  try {
    response = await fetch(oauthUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });
  } catch (error) {
    findings.outboundTokenOk = false;
    findings.outboundTokenDetail = `network error: ${error instanceof Error ? error.message : String(error)}`;
    logRow(`POST ${oauthUrl}`, 'fail', findings.outboundTokenDetail);
    return null;
  }

  const { text, json } = await readBody(response);
  if (!response.ok) {
    findings.outboundTokenOk = false;
    findings.outboundTokenDetail = `HTTP ${response.status} — ${previewJson(text, 240)}`;
    logRow(`POST ${oauthUrl}`, 'fail', findings.outboundTokenDetail);
    return null;
  }

  const payload = (json ?? {}) as Record<string, unknown>;
  const accessToken = typeof payload.access_token === 'string' ? payload.access_token : '';
  const scope = typeof payload.scope === 'string' ? payload.scope : null;
  if (!accessToken) {
    findings.outboundTokenOk = false;
    findings.outboundTokenDetail = `200 but no access_token — ${previewJson(text, 200)}`;
    logRow(`POST ${oauthUrl}`, 'fail', findings.outboundTokenDetail);
    return null;
  }

  findings.outboundTokenOk = true;
  findings.outboundTokenScope = scope;
  findings.outboundTokenDetail = `token=${obfuscate(accessToken)} scope=${scope ?? '<none reported>'} expires_in=${payload.expires_in ?? '?'}`;
  logRow(`POST ${oauthUrl}`, 'pass', findings.outboundTokenDetail);
  return accessToken;
}

async function probeEndpoint(label: string, url: string, accessToken: string) {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });
  } catch (error) {
    const result: EndpointResult = {
      url,
      status: 'ERROR',
      message: `network error: ${error instanceof Error ? error.message : String(error)}`,
    };
    findings.endpoints.push(result);
    logRow(`GET ${label}`, 'fail', result.message ?? '');
    return result;
  }

  const { text, json } = await readBody(response);
  const result: EndpointResult = {
    url,
    status: response.status,
    payloadPreview: response.ok ? previewJson(json ?? text, 240) : previewJson(text, 200),
  };
  findings.endpoints.push(result);

  const status =
    response.status === 200 ? 'pass' : response.status === 401 || response.status === 403 ? 'fail' : 'skip';
  const detail = `${response.status} — ${result.payloadPreview ?? ''}`;
  logRow(`GET ${label}`, status, detail);
  return result;
}

// ----- (d) Extras -----

async function probeStatementsRetrieval(apiBase: string, accessToken: string) {
  // Some LRS implementations expose GET /xAPI/statements for retrieval.
  // Check whether Coursera's For Business API exposes a similar endpoint.
  const candidates = [
    `${apiBase}/api/businesses.v1/xAPI/statements?limit=1`,
    `${apiBase}/xAPI/statements?limit=1`,
  ];
  for (const url of candidates) {
    await probeEndpoint(`xAPI retrieval candidate ${url.replace(apiBase, '')}`, url, accessToken);
  }
}

// ----- helpers -----

function cryptoRandomUuid(): string {
  // Avoid pulling node:crypto import to keep the top of the file clean for env-checks.
  // Falls back to a simple 16-byte hex if randomUUID isn't available.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const cryptoModule = require('node:crypto') as typeof import('node:crypto');
  if (typeof cryptoModule.randomUUID === 'function') return cryptoModule.randomUUID();
  return cryptoModule.randomBytes(16).toString('hex');
}

function buildEndpointCatalog(apiBase: string, orgId: string, orgSlug: string) {
  const idEncoded = encodeURIComponent(orgId);
  const slugEncoded = encodeURIComponent(orgSlug);
  // These are the standard Coursera For Business REST shapes we have seen
  // documented or referenced. Many will 404 — that's the point of the probe.
  return [
    {
      label: `/api/businesses.v1/orgs/${orgId}`,
      url: `${apiBase}/api/businesses.v1/orgs/${idEncoded}`,
    },
    {
      label: `/api/businesses.v1/orgs/${orgSlug}`,
      url: `${apiBase}/api/businesses.v1/orgs/${slugEncoded}`,
    },
    {
      label: `/api/businesses.v1/orgs/${orgId}/learners?limit=5`,
      url: `${apiBase}/api/businesses.v1/orgs/${idEncoded}/learners?limit=5`,
    },
    {
      label: `/api/businesses.v1/orgs/${orgId}/programs?limit=5`,
      url: `${apiBase}/api/businesses.v1/orgs/${idEncoded}/programs?limit=5`,
    },
    {
      label: `/api/businesses.v1/orgs/${orgId}/enrollments?limit=5`,
      url: `${apiBase}/api/businesses.v1/orgs/${idEncoded}/enrollments?limit=5`,
    },
    {
      label: `/api/businesses.v1/orgs/${orgId}/completions?limit=5`,
      url: `${apiBase}/api/businesses.v1/orgs/${idEncoded}/completions?limit=5`,
    },
    {
      label: `/api/businesses.v1/contents.search?q.id=${orgId}&q.start=0&q.limit=5`,
      url: `${apiBase}/api/businesses.v1/contents.search?q.id=${idEncoded}&q.start=0&q.limit=5`,
    },
    {
      label: `/api/businesses.v1/contents?q=byOrg&orgId=${orgId}&limit=5`,
      url: `${apiBase}/api/businesses.v1/contents?q=byOrg&orgId=${idEncoded}&limit=5`,
    },
    // The legacy enterprise REST surface we already use for skillsets.
    {
      label: `/ent/api/rest/v1/enterprise/programs (legacy)`,
      url: `${apiBase}/ent/api/rest/v1/enterprise/programs?limit=5`,
    },
  ];
}

// ----- main -----

async function main() {
  console.log(`${BOLD}Coursera integration test runner${RESET}`);
  console.log(`${DIM}now=${new Date().toISOString()}${RESET}`);

  const targetBase = (process.env.COURSERA_TARGET_BASE_URL?.trim() || DEFAULT_TARGET_BASE_URL).replace(/\/$/, '');
  const orgId = process.env.COURSERA_ORG_ID?.trim() || DEFAULT_ORG_ID;
  const orgSlug = process.env.COURSERA_ORG_SLUG?.trim() || DEFAULT_ORG_SLUG;
  const oauthUrl = process.env.COURSERA_OAUTH_TOKEN_URL?.trim() || DEFAULT_COURSERA_OAUTH_URL;
  const apiBase = (process.env.COURSERA_API_BASE_URL?.trim() || DEFAULT_COURSERA_API_BASE).replace(/\/$/, '');

  console.log(`${DIM}target=${targetBase} orgId=${orgId} orgSlug=${orgSlug}${RESET}`);
  console.log(`${DIM}coursera oauth=${oauthUrl} api=${apiBase}${RESET}`);

  const xapiId = requireEnv('COURSERA_XAPI_CLIENT_ID');
  const xapiSecret = requireEnv('COURSERA_XAPI_CLIENT_SECRET');
  const b4bId = requireEnv('COURSERA_B4B_CLIENT_ID');
  const b4bSecret = requireEnv('COURSERA_B4B_CLIENT_SECRET');

  const missing: string[] = [];
  if (!xapiId) missing.push('COURSERA_XAPI_CLIENT_ID');
  if (!xapiSecret) missing.push('COURSERA_XAPI_CLIENT_SECRET');
  if (!b4bId) missing.push('COURSERA_B4B_CLIENT_ID');
  if (!b4bSecret) missing.push('COURSERA_B4B_CLIENT_SECRET');

  if (missing.length === 4) {
    console.log(`\n${RED}${BOLD}All credential env vars are missing. Aborting.${RESET}`);
    console.log(`Set the following before running:`);
    for (const name of missing) console.log(`  - ${name}`);
    process.exit(2);
  }

  // ----- (a) inbound -----
  logSection('(a) INBOUND xAPI — pretend to be Coursera');
  if (!xapiId || !xapiSecret) {
    logRow('inbound credentials check', 'skip', 'COURSERA_XAPI_CLIENT_ID/SECRET not set');
    findings.inboundTokenOk = null;
    findings.inboundStatementOk = null;
  } else {
    console.log(`  ${DIM}using client_id=${obfuscate(xapiId)}${RESET}`);
    const inboundToken = await runInboundTokenTest(targetBase, xapiId, xapiSecret);
    if (inboundToken) {
      await runInboundStatementTest(targetBase, inboundToken);
    } else {
      logRow('inbound statement POST', 'skip', 'no token to authorize with');
      findings.inboundStatementOk = false;
      findings.inboundStatementDetail = 'token endpoint did not return a usable token';
    }
  }

  // ----- (b) outbound -----
  logSection('(b) OUTBOUND For Business API — we call Coursera');
  let outboundToken: string | null = null;
  if (!b4bId || !b4bSecret) {
    logRow('outbound credentials check', 'skip', 'COURSERA_B4B_CLIENT_ID/SECRET not set');
    findings.outboundTokenOk = null;
  } else {
    console.log(`  ${DIM}using client_id=${obfuscate(b4bId)}${RESET}`);
    outboundToken = await runOutboundOauth(b4bId, b4bSecret, oauthUrl);
  }

  // ----- (c) reverse-engineer endpoints -----
  logSection('(c) REVERSE-ENGINEER B4B endpoints');
  if (!outboundToken) {
    logRow('endpoint probes', 'skip', 'no outbound access token');
  } else {
    const catalog = buildEndpointCatalog(apiBase, orgId, orgSlug);
    for (const entry of catalog) {
      await probeEndpoint(entry.label, entry.url, outboundToken);
    }

    // ----- (d) extras -----
    logSection('(d) EXTRAS — xAPI retrieval / scope inspection');
    await probeStatementsRetrieval(apiBase, outboundToken);
    if (findings.outboundTokenScope) {
      logRow('OAuth granted scopes', 'pass', findings.outboundTokenScope);
    } else {
      logRow('OAuth granted scopes', 'skip', 'response did not include a scope field');
    }
  }

  // ----- final report -----
  printFinalReport();

  // Exit non-zero if any non-skipped check failed.
  const hadFail =
    findings.inboundTokenOk === false ||
    findings.inboundStatementOk === false ||
    findings.outboundTokenOk === false;
  process.exit(hadFail ? 1 : 0);
}

function printFinalReport() {
  console.log(`\n${BOLD}${CYAN}============================================================${RESET}`);
  console.log(`${BOLD}${CYAN}  FINAL REPORT${RESET}`);
  console.log(`${BOLD}${CYAN}============================================================${RESET}`);

  console.log(`\n${BOLD}=== INBOUND xAPI ===${RESET}`);
  console.log(
    `  ${formatStatus(findings.inboundTokenOk)} /api/xapi/oauth/token returns valid token  ${DIM}${findings.inboundTokenDetail}${RESET}`
  );
  console.log(
    `  ${formatStatus(findings.inboundStatementOk)} /api/xapi/statements accepts a sample statement  ${DIM}${findings.inboundStatementDetail}${RESET}`
  );

  console.log(`\n${BOLD}=== OUTBOUND For Business API ===${RESET}`);
  console.log(
    `  ${formatStatus(findings.outboundTokenOk)} OAuth token  ${DIM}scope=${findings.outboundTokenScope ?? '<none>'} ${findings.outboundTokenDetail}${RESET}`
  );
  console.log(`\n  ${BOLD}ENDPOINTS:${RESET}`);
  if (findings.endpoints.length === 0) {
    console.log(`    ${DIM}(none probed — outbound OAuth failed)${RESET}`);
  } else {
    for (const entry of findings.endpoints) {
      const tag =
        entry.status === 200
          ? GREEN
          : entry.status === 401 || entry.status === 403
            ? RED
            : YELLOW;
      console.log(
        `    ${tag}${String(entry.status).padEnd(5)}${RESET} ${entry.url}\n         ${DIM}${entry.payloadPreview ?? entry.message ?? ''}${RESET}`
      );
    }
  }

  console.log(`\n${BOLD}=== RECOMMENDATIONS ===${RESET}`);
  const okEndpoints = findings.endpoints.filter((e) => e.status === 200).map((e) => e.url);
  if (okEndpoints.length > 0) {
    console.log(`  - Build a B4B puller against these working endpoints:`);
    for (const url of okEndpoints) console.log(`      • ${url}`);
    console.log(
      `  - Wire the puller into the xAPI auto-heal path: when /api/xapi/statements is missing data, backfill from the authoritative B4B response.`
    );
  } else {
    console.log(`  - No B4B endpoints returned 200 with the supplied credentials.`);
    console.log(`    Likely causes: dev app missing 'For Business API' product enablement, or wrong org id.`);
  }

  if (findings.inboundTokenOk && findings.inboundStatementOk) {
    console.log(`  - Inbound xAPI is healthy. Coursera-issued statements should be accepted in production.`);
  } else if (findings.inboundTokenOk === false) {
    console.log(`  - Inbound OAuth is failing. Verify XAPI_CLIENT_ID / XAPI_CLIENT_SECRET (or COURSERA_APP_ID/SECRET) on the WorkforceAP server match the values you handed to Coursera.`);
  } else if (findings.inboundStatementOk === false) {
    console.log(`  - Inbound OAuth works but statement ingestion is failing. Inspect the response body above and check lib/xapi/inboundStatementPipeline.ts.`);
  }

  if (findings.outboundTokenScope) {
    console.log(`  - OAuth granted scopes: ${findings.outboundTokenScope}. Cross-check this against which endpoints returned 200 to see whether the dev app needs additional product access.`);
  }
  console.log('');
}

function formatStatus(ok: boolean | null): string {
  if (ok === true) return PASS;
  if (ok === false) return FAIL;
  return SKIP;
}

main().catch((error) => {
  console.error(`${RED}${BOLD}Unhandled error:${RESET}`, error);
  process.exit(1);
});
