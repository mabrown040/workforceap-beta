/**
 * Coursera For Business (B4B) typed REST client.
 *
 * Intentionally does NOT `import 'server-only'`: the module uses Buffer
 * and process.env so it would never run in the browser anyway, and
 * dropping the marker makes the helper unit-testable under
 * `node --test` / `tsx` (matches the testAccountHeuristic.ts /
 * csvImport.ts pattern).
 *
 * Wraps the production B4B REST API with:
 *   - module-scope OAuth token cache (refresh when within 60s of expiry)
 *   - typed responses for the 6 endpoints we use today
 *   - automatic Authorization header injection on every request
 *   - structured `B4BApiError` on non-2xx responses
 *
 * Endpoints (all confirmed live on prod against org "Workforce Advancement
 * Project" / id `8R2W4McwOMWJp9cCBV1kvw`):
 *
 *   GET /api/businesses.v1/{orgId}                                     → org info
 *   GET /api/businesses.v1/{orgId}/users                                → roster
 *   GET /api/businesses.v1/{orgId}/programs?excludeContent=true         → programs
 *   GET /api/businesses.v1/{orgId}/contents                             → catalog
 *   GET /api/businesses.v1/{orgId}/enrollmentReports                    → progress
 *   GET /api/businesses.v1/{orgId}/courseGradebookReports?q=search      → grades
 *
 * Auth: `POST https://api.coursera.com/oauth2/client_credentials/token`
 * with HTTP Basic (clientId:clientSecret) and form body
 * `grant_type=client_credentials`. Returns a Bearer token good for ~1799s.
 *
 * Reads env on each call (never cached globally) so credentials can be
 * rotated without a process restart. Throws if either credential is missing.
 */

const DEFAULT_OAUTH_URL = 'https://api.coursera.com/oauth2/client_credentials/token';
const DEFAULT_API_BASE = 'https://api.coursera.com/ent';
const DEFAULT_ORG_ID = '8R2W4McwOMWJp9cCBV1kvw';

const TOKEN_REFRESH_SAFETY_MS = 60_000;

// Allow tests to swap the global fetch.
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

let cachedToken: { token: string; expiresAt: number } | null = null;
let injectedFetch: FetchLike | null = null;

/* ------------------------------------------------------------------ */
/*  Public types                                                       */
/* ------------------------------------------------------------------ */

/** Coursera-style paging envelope. Both fields are optional in practice. */
export type B4BPaging = {
  next?: number;
  total?: number;
};

export type B4BUser = {
  id?: string;
  externalId?: string;
  email?: string;
  fullName?: string;
  membershipState?: string;
  membershipProgramIds?: string[];
  joinedAt?: number;
  lastLoginAt?: number;
};

export type B4BProgram = {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  state?: string;
  /** When `excludeContent=false` was passed; we always pass true so this is rare. */
  contents?: unknown[];
};

export type B4BContent = {
  id: string;
  contentType?: string;
  name?: string;
  slug?: string;
  description?: string;
};

export type B4BEnrollmentReport = {
  id?: string;
  programId: string;
  externalId: string; // typically the learner's email
  contentId: string;
  contentType?: string;
  isCompleted: boolean;
  lastActivity?: number;
  enrolledAt?: number;
  overallProgress?: number;
  membershipState?: string;
  updatedAt?: number;
  contentName?: string;
  contentSlug?: string;
  fullName?: string;
  email?: string;
  programName?: string;
  programSlug?: string;
};

export type B4BGradebookReport = {
  externalId?: string;
  email?: string;
  fullName?: string;
  programId?: string;
  courseId?: string;
  courseName?: string;
  totalLearningHours?: number;
  /** Raw item-level breakdown (Coursera shape varies). */
  items?: Array<Record<string, unknown>>;
};

export type B4BOrgInfo = {
  id: string;
  name: string;
  slug?: string;
  description?: string;
};

export type B4BPageEnvelope<T> = {
  elements: T[];
  paging: B4BPaging;
  /** Coursera's `linked` block — rarely used by callers but preserved for debugging. */
  linked?: Record<string, unknown>;
};

/* ------------------------------------------------------------------ */
/*  Errors                                                             */
/* ------------------------------------------------------------------ */

export class B4BApiError extends Error {
  readonly status: number;
  readonly body: string;
  readonly url: string;

  constructor(args: { status: number; body: string; url: string; message?: string }) {
    super(
      args.message ??
        `Coursera B4B API error (${args.status}) at ${args.url}: ${args.body.slice(0, 240)}`,
    );
    this.name = 'B4BApiError';
    this.status = args.status;
    this.body = args.body;
    this.url = args.url;
  }
}

/* ------------------------------------------------------------------ */
/*  Internals                                                          */
/* ------------------------------------------------------------------ */

/**
 * Reads credentials from env at the moment of the first OAuth fetch.
 * We deliberately don't throw at module-load: this module gets imported
 * by the admin pages, by the self-test, and by tests that mock fetch.
 * Module-load throws would break test discovery and make the import a
 * landmine. Instead the first real network call surfaces the error.
 */
function getCredentials() {
  const clientId = process.env.COURSERA_B4B_CLIENT_ID?.trim();
  const clientSecret = process.env.COURSERA_B4B_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      '[b4bClient] COURSERA_B4B_CLIENT_ID and COURSERA_B4B_CLIENT_SECRET must be set',
    );
  }
  return { clientId, clientSecret };
}

function getApiBase(): string {
  const raw = process.env.COURSERA_API_BASE_URL?.trim() || DEFAULT_API_BASE;
  return raw.replace(/\/$/, '');
}

function getOauthUrl(): string {
  return process.env.COURSERA_OAUTH_TOKEN_URL?.trim() || DEFAULT_OAUTH_URL;
}

export function getB4BOrgId(): string {
  return process.env.COURSERA_ORG_ID?.trim() || DEFAULT_ORG_ID;
}

function fetchImpl(): FetchLike {
  if (injectedFetch) return injectedFetch;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (globalThis as any).fetch as FetchLike;
}

/** Test-only: substitute fetch + reset the cached token. */
export function _setFetchForTesting(impl: FetchLike | null) {
  injectedFetch = impl;
  cachedToken = null;
}

/** Test-only: inspect the current token cache state. */
export function _getCachedTokenForTesting(): { token: string; expiresAt: number } | null {
  return cachedToken;
}

/** Test-only: clear the token cache. */
export function _resetTokenCacheForTesting() {
  cachedToken = null;
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + TOKEN_REFRESH_SAFETY_MS) {
    return cachedToken.token;
  }

  const { clientId, clientSecret } = getCredentials();
  const url = getOauthUrl();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetchImpl()(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: 'grant_type=client_credentials',
  });

  const text = await response.text();
  if (!response.ok) {
    throw new B4BApiError({
      status: response.status,
      body: text,
      url,
      message: `Coursera B4B OAuth failed (${response.status}): ${text.slice(0, 240)}`,
    });
  }

  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    throw new B4BApiError({
      status: response.status,
      body: text,
      url,
      message: 'Coursera B4B OAuth response was not valid JSON',
    });
  }

  const accessToken = typeof json.access_token === 'string' ? json.access_token : '';
  if (!accessToken) {
    throw new B4BApiError({
      status: response.status,
      body: text,
      url,
      message: 'Coursera B4B OAuth response missing access_token',
    });
  }
  const expiresIn = typeof json.expires_in === 'number' ? json.expires_in : 1800;

  cachedToken = {
    token: accessToken,
    expiresAt: now + expiresIn * 1000,
  };

  return accessToken;
}

/**
 * Internal helper. Issues a request against the B4B API with auto auth.
 * Path may be absolute (`https://...`) or relative to the API base
 * (`/api/businesses.v1/...`).
 */
export async function fetchB4B(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const url = path.startsWith('http://') || path.startsWith('https://')
    ? path
    : `${getApiBase()}${path.startsWith('/') ? '' : '/'}${path}`;

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Accept', 'application/json');

  return fetchImpl()(url, { ...init, headers });
}

async function getJsonOrThrow<T>(path: string): Promise<T> {
  const response = await fetchB4B(path);
  const text = await response.text();
  if (!response.ok) {
    throw new B4BApiError({ status: response.status, body: text, url: path });
  }
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new B4BApiError({
      status: response.status,
      body: text,
      url: path,
      message: 'Coursera B4B response was not valid JSON',
    });
  }
}

function appendPagination(
  params: URLSearchParams,
  opts: { start?: number; limit?: number } | undefined,
) {
  if (opts?.start != null && Number.isFinite(opts.start) && opts.start >= 0) {
    params.set('start', String(opts.start));
  }
  if (opts?.limit != null && Number.isFinite(opts.limit) && opts.limit > 0) {
    params.set('limit', String(opts.limit));
  }
}

function buildOrgPath(suffix: string): string {
  const orgId = encodeURIComponent(getB4BOrgId());
  return `/api/businesses.v1/${orgId}${suffix}`;
}

function envelopeFrom<T>(payload: unknown): B4BPageEnvelope<T> {
  const obj =
    payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const elements = Array.isArray(obj.elements) ? (obj.elements as T[]) : [];
  const paging =
    obj.paging && typeof obj.paging === 'object' ? (obj.paging as B4BPaging) : {};
  const linked =
    obj.linked && typeof obj.linked === 'object'
      ? (obj.linked as Record<string, unknown>)
      : undefined;
  return { elements, paging, linked };
}

/* ------------------------------------------------------------------ */
/*  Public methods                                                     */
/* ------------------------------------------------------------------ */

export async function getOrgInfo(): Promise<B4BOrgInfo> {
  return getJsonOrThrow<B4BOrgInfo>(buildOrgPath(''));
}

export async function listUsers(
  opts: { start?: number; limit?: number } = {},
): Promise<B4BPageEnvelope<B4BUser>> {
  const params = new URLSearchParams();
  appendPagination(params, opts);
  const qs = params.toString();
  const path = buildOrgPath(`/users${qs ? `?${qs}` : ''}`);
  return envelopeFrom<B4BUser>(await getJsonOrThrow(path));
}

export async function listPrograms(
  opts: { start?: number; limit?: number; excludeContent?: boolean } = {},
): Promise<B4BPageEnvelope<B4BProgram>> {
  const params = new URLSearchParams();
  // The B4B YAML treats excludeContent=true as the standard form for the
  // listing endpoint; when omitted Coursera embeds full content trees and
  // the response can be enormous. Default true unless the caller opts out.
  params.set('excludeContent', opts.excludeContent === false ? 'false' : 'true');
  appendPagination(params, opts);
  const path = buildOrgPath(`/programs?${params.toString()}`);
  return envelopeFrom<B4BProgram>(await getJsonOrThrow(path));
}

export async function listContents(
  opts: { start?: number; limit?: number } = {},
): Promise<B4BPageEnvelope<B4BContent>> {
  const params = new URLSearchParams();
  appendPagination(params, opts);
  const qs = params.toString();
  const path = buildOrgPath(`/contents${qs ? `?${qs}` : ''}`);
  return envelopeFrom<B4BContent>(await getJsonOrThrow(path));
}

/**
 * Per-learner per-course progress.
 *
 * The Coursera enrollmentReports endpoint supports several `q` filter modes:
 *   - default (no q): returns the full report
 *   - q=byProgramId & programId=XYZ: scope to a single program
 *   - q=byUserProgramId & programId=XYZ & externalId=email: single learner in program
 *
 * The `byUserProgramId` mode is the one we want for the reconcile UI's
 * per-row "fix enrollment" verification path.
 */
export async function getEnrollmentReports(
  opts: {
    start?: number;
    limit?: number;
    byProgramId?: boolean;
    byUserProgramId?: boolean;
    programId?: string;
    externalId?: string;
  } = {},
): Promise<B4BPageEnvelope<B4BEnrollmentReport>> {
  const params = new URLSearchParams();
  if (opts.byUserProgramId) {
    params.set('q', 'byUserProgramId');
    if (opts.programId) params.set('programId', opts.programId);
    if (opts.externalId) params.set('externalId', opts.externalId);
  } else if (opts.byProgramId) {
    params.set('q', 'byProgramId');
    if (opts.programId) params.set('programId', opts.programId);
  }
  appendPagination(params, opts);
  const qs = params.toString();
  const path = buildOrgPath(`/enrollmentReports${qs ? `?${qs}` : ''}`);
  return envelopeFrom<B4BEnrollmentReport>(await getJsonOrThrow(path));
}

/**
 * Item-level grading + total hours.
 *
 * Coursera requires `q=search` with at least one of programId / courseId /
 * emailOrExternalId to be present. We pass through whatever the caller
 * supplies and let the API validate.
 */
export async function getCourseGradebookReports(
  opts: {
    programId?: string;
    courseId?: string;
    emailOrExternalId?: string;
    start?: number;
    limit?: number;
  } = {},
): Promise<B4BPageEnvelope<B4BGradebookReport>> {
  const params = new URLSearchParams();
  params.set('q', 'search');
  if (opts.programId) params.set('programId', opts.programId);
  if (opts.courseId) params.set('courseId', opts.courseId);
  if (opts.emailOrExternalId) params.set('emailOrExternalId', opts.emailOrExternalId);
  appendPagination(params, opts);
  const path = buildOrgPath(`/courseGradebookReports?${params.toString()}`);
  return envelopeFrom<B4BGradebookReport>(await getJsonOrThrow(path));
}

/* ------------------------------------------------------------------ */
/*  Convenience: paginate-until-exhausted                              */
/* ------------------------------------------------------------------ */

/**
 * Drains a paginated B4B endpoint into a single array.
 *
 * Coursera's paging is `{ next?: number, total?: number }` plus the count
 * of returned `elements`. We stop when:
 *   - the page came back empty, OR
 *   - `start + elements.length >= total`, OR
 *   - we exceed `safetyCap` pages (defensive, ~1M users).
 */
export async function listAllUsers(opts: { pageLimit?: number; safetyCap?: number } = {}) {
  const pageLimit = opts.pageLimit ?? 1000;
  const safetyCap = opts.safetyCap ?? 1000;
  const all: B4BUser[] = [];
  let start = 0;
  let pages = 0;

  while (pages < safetyCap) {
    pages += 1;
    const page = await listUsers({ start, limit: pageLimit });
    if (page.elements.length === 0) break;
    all.push(...page.elements);
    const total = page.paging.total ?? 0;
    if (total > 0 && start + page.elements.length >= total) break;
    if (page.elements.length < pageLimit) break;
    start += page.elements.length;
  }

  return { elements: all, pagesFetched: pages };
}
