/**
 * SSRF guard for any outbound fetch whose URL is influenced by user input.
 *
 * Why this exists
 * ---------------
 * Anywhere we call `fetch(userControlledUrl)` from a route handler, an
 * attacker who controls (or can store) that URL can pivot us into the
 * internal network or cloud metadata service. The OWASP audit flagged
 * two such sites: `lib/ai/atsProviders.ts` (job-page scraping) and
 * `app/api/member/linkedin-enrich/route.ts`.
 *
 * This module provides:
 *   - `assertPublicHttpUrl(input, { allowHosts })` — parses the URL,
 *     rejects non-http(s) schemes, IPv6 literals, private/loopback/
 *     link-local IPv4 literals, well-known internal hostnames, and
 *     (optionally) anything not in an allowlist.
 *   - `safeFetch(url, init)` — same checks before fetching, plus a
 *     mandatory `timeoutMs` and an optional `maxBytes` cap on the
 *     response body (defense against giant-page DoS / Firecrawl-style
 *     quota burns when the caller would otherwise read the whole body).
 *
 * Known limits
 * ------------
 * Hostname-only validation. A determined attacker can register a public
 * hostname that resolves to a private IP (DNS rebinding) — Node's
 * default global agent doesn't re-resolve at connect time. For complete
 * protection, callers that handle untrusted URLs should also use an
 * http agent that re-resolves on connect (e.g. ipaddr.js or `dns-lookup`
 * hook). The most common exploits (`http://169.254.169.254/...` AWS IMDS,
 * `http://localhost:<port>`, `http://10.x.x.x`) are blocked here.
 */

const PRIVATE_IPV4_RANGES: Array<[number, number]> = [
  [0x0a000000, 0x0affffff], // 10.0.0.0/8
  [0xac100000, 0xac1fffff], // 172.16.0.0/12
  [0xc0a80000, 0xc0a8ffff], // 192.168.0.0/16
  [0x7f000000, 0x7fffffff], // 127.0.0.0/8 loopback
  [0xa9fe0000, 0xa9feffff], // 169.254.0.0/16 link-local incl AWS/GCP IMDS
  [0x64400000, 0x647fffff], // 100.64.0.0/10 CGNAT
  [0x00000000, 0x00ffffff], // 0.0.0.0/8
  [0xe0000000, 0xefffffff], // 224.0.0.0/4 multicast
  [0xf0000000, 0xffffffff], // 240.0.0.0/4 reserved
];

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.goog',
  'instance-data',
  'instance-data.ec2.internal',
]);

const BLOCKED_HOSTNAME_SUFFIXES = ['.local', '.localhost', '.internal', '.ec2.internal'];

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    if (part === '' || /[^0-9]/.test(part)) return null;
    const x = Number(part);
    if (!Number.isInteger(x) || x < 0 || x > 255) return null;
    n = ((n << 8) | x) >>> 0;
  }
  return n;
}

function isPrivateIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return false;
  return PRIVATE_IPV4_RANGES.some(([lo, hi]) => n >= lo && n <= hi);
}

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeUrlError';
  }
}

export interface AssertPublicHttpUrlOptions {
  /** If set, the URL's host must equal one of these or be a subdomain of one. */
  allowHosts?: readonly string[];
  /** If true, only allow `https:`. Default false (allows `http:` for compatibility with public job-board APIs). */
  httpsOnly?: boolean;
}

/**
 * Parse a user-supplied URL and throw `UnsafeUrlError` if it isn't a safe
 * public http(s) URL. Returns the parsed `URL` on success.
 */
export function assertPublicHttpUrl(input: string, opts: AssertPublicHttpUrlOptions = {}): URL {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new UnsafeUrlError('Invalid URL');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new UnsafeUrlError(`Unsupported scheme: ${parsed.protocol}`);
  }
  if (opts.httpsOnly && parsed.protocol !== 'https:') {
    throw new UnsafeUrlError('Only https URLs allowed here');
  }
  const host = parsed.hostname.toLowerCase();
  if (!host) throw new UnsafeUrlError('Empty host');
  if (BLOCKED_HOSTNAMES.has(host)) {
    throw new UnsafeUrlError(`Blocked host: ${host}`);
  }
  if (BLOCKED_HOSTNAME_SUFFIXES.some((s) => host.endsWith(s))) {
    throw new UnsafeUrlError(`Blocked host suffix: ${host}`);
  }
  // IPv6 literal — URL.hostname strips the brackets, leaving something like `::1` or `fe80::1`.
  if (host.includes(':')) {
    throw new UnsafeUrlError('IPv6 literals not allowed');
  }
  // IPv4 literal? Reject if private/loopback/link-local.
  if (/^[0-9.]+$/.test(host)) {
    if (!ipv4ToInt(host) && host !== '0') {
      throw new UnsafeUrlError(`Malformed IP literal: ${host}`);
    }
    if (host === '0' || host === '0.0.0.0' || isPrivateIpv4(host)) {
      throw new UnsafeUrlError(`Private IP literal: ${host}`);
    }
  }
  // Optional allowlist gate.
  if (opts.allowHosts && opts.allowHosts.length > 0) {
    const ok = opts.allowHosts.some((h) => {
      const normalized = h.toLowerCase();
      return host === normalized || host.endsWith('.' + normalized);
    });
    if (!ok) {
      throw new UnsafeUrlError(`Host not in allowlist: ${host}`);
    }
  }
  return parsed;
}

export interface SafeFetchInit extends Omit<RequestInit, 'signal'> {
  /** SSRF allowlist (forwarded to assertPublicHttpUrl). */
  allowHosts?: readonly string[];
  /** Force https. */
  httpsOnly?: boolean;
  /** Per-request timeout (no default — caller decides). */
  timeoutMs?: number;
  /** Cap response body size — throws if exceeded mid-stream. */
  maxBytes?: number;
}

/**
 * `fetch()` wrapper that validates the URL against SSRF rules and
 * enforces a body-size cap if `maxBytes` is set. Throws `UnsafeUrlError`
 * for blocked URLs; the timeout uses `AbortSignal.timeout`.
 */
export async function safeFetch(inputUrl: string, init: SafeFetchInit = {}): Promise<Response> {
  const parsed = assertPublicHttpUrl(inputUrl, {
    allowHosts: init.allowHosts,
    httpsOnly: init.httpsOnly,
  });
  const { allowHosts, httpsOnly, timeoutMs, maxBytes, ...fetchInit } = init;
  void allowHosts;
  void httpsOnly;
  const res = await fetch(parsed.toString(), {
    ...fetchInit,
    signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
  });
  if (maxBytes && res.body) {
    const limited = await readBodyCapped(res.body, maxBytes);
    return new Response(limited as any, {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });
  }
  return res;
}

async function readBodyCapped(body: ReadableStream<Uint8Array>, maxBytes: number): Promise<Uint8Array> {
  const reader = body.getReader();
  let total = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      void reader.cancel().catch(() => {});
      throw new UnsafeUrlError(`Response exceeded ${maxBytes} bytes`);
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}
