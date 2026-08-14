import type { User } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseCookieOptions, SESSION_ONLY_COOKIE } from '@/lib/supabaseCookieOptions';
import { getAdminMfaTrustCookieName, verifyAdminMfaTrustToken } from '@/lib/auth/mfaTrust';
import { isStaffMfaEnforcementEnabled } from '@/lib/auth/mfaConfig';
import type { AppLocale } from '@/lib/i18n/config';
import {
  WAP_LOCALE_COOKIE,
  WAP_LOCALE_HEADER,
  isAppLocale,
  isLocaleBypassPath,
  isLocaleableMarketingPath,
  pickLocaleFromAcceptLanguage,
  splitLocalePrefix,
  withLocalePrefix,
} from '@/lib/i18n/config';
import { customDomainCache, NO_ORG_SENTINEL } from '@/lib/tenant/customDomainCache';
import { isCanonicalHost, normalizeHost } from '@/lib/tenant/hostMatch';
import {
  WAP_RESERVE_MOBILE_BOTTOM_NAV_HEADER,
  shouldReserveMobileBottomNavClearance,
} from '@/lib/nav/mobileBottomNavLayout';
import {
  isPaidUtmSource,
  UTM_SOURCE_COOKIE,
  UTM_SOURCE_COOKIE_MAX_AGE,
  WAP_PAID_APPLY_HEADER,
} from '@/lib/apply/paidApplyUtm';
import {
  partnerRefFromEnrollPath,
  shouldCaptureEnrollRef,
  PARTNER_REF_COOKIE,
  PARTNER_REF_COOKIE_MAX_AGE,
} from '@/lib/apply/applyReferralCapture';
import { REQUEST_ID_HEADER, resolveRequestId } from '@/lib/observability/requestId';

/** Header forwarded to server components / API routes when middleware found a cached org. */
const WAP_ORG_ID_HEADER = 'x-wap-org-id';
/** Always-set header carrying the normalized Host so Node-runtime resolvers can populate cache. */
const WAP_HOST_HEADER = 'x-wap-host';
/** Header forwarded when middleware has cryptographically verified the user via Supabase. */
const WAP_USER_ID_HEADER = 'x-wap-user-id';

const PORTAL_PATHS = [
  '/dashboard',
  '/resources',
  '/help',
  '/applications',
  '/account',
  '/profile',
  '/certifications',
  '/partner',
  '/employer',
  '/counselor',
  // '/jobs' is intentionally public — page handles auth state inline
];
const ADMIN_PATHS = ['/admin'];
const ADMIN_API_PATHS = ['/api/admin'];

/**
 * Defense-in-depth backstop for the tenant-portal APIs. These routes already
 * enforce auth per-route (via `getUser()` / role checks), but had no
 * middleware-level protection, unlike `/api/admin/*`. This adds a second,
 * centrally-maintained layer so a future route that forgets its own auth
 * check still gets rejected here.
 *
 * IMPORTANT: keep `TENANT_API_PUBLIC_ALLOWLIST` exact and minimal — every
 * entry is a route that intentionally has NO session yet (account creation)
 * or authenticates via a non-session mechanism (webhook signature). Audited
 * 2026-07-01: every other route.ts under these four prefixes calls
 * `getUser()`/Supabase session auth (directly or via a shared handler
 * factory) before touching request data.
 */
const TENANT_API_PATHS = ['/api/member', '/api/employer', '/api/partner', '/api/counselor'];

/** Routes under TENANT_API_PATHS that must stay reachable without a session. */
const TENANT_API_PUBLIC_ALLOWLIST = new Set([
  '/api/member/signup',
  '/api/employer/signup',
  '/api/partner/signup',
  // Stripe webhook — authenticated via `stripe-signature` header verification
  // inside the route handler, not a user session.
  '/api/employer/webhook',
]);

/** Public post-conversion pages under portal URL prefixes (no auth gate). */
const PUBLIC_THANK_YOU_PATHS = new Set(['/employer/thank-you']);

function isPublicThankYouPath(pathname: string) {
  return PUBLIC_THANK_YOU_PATHS.has(pathname);
}

function isPortalPath(pathname: string) {
  if (isPublicThankYouPath(pathname)) return false;
  return PORTAL_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isAdminPath(pathname: string) {
  return ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isAdminApiPath(pathname: string) {
  return ADMIN_API_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isTenantApiPath(pathname: string) {
  if (TENANT_API_PUBLIC_ALLOWLIST.has(pathname)) return false;
  return TENANT_API_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isProtectedPath(pathname: string) {
  return isPortalPath(pathname) || isAdminPath(pathname);
}

function requestedPathWithSearch(request: NextRequest) {
  return `${request.nextUrl.pathname}${request.nextUrl.search}`;
}

function localizedLoginPath(locale: AppLocale) {
  return withLocalePrefix('/login', locale);
}

function resolvePreferredLocale(request: NextRequest): { locale: AppLocale; fromQuery: boolean } {
  const queryLang = request.nextUrl.searchParams.get('lang');
  if (queryLang && isAppLocale(queryLang)) {
    return { locale: queryLang, fromQuery: true };
  }
  const cookieVal = request.cookies.get(WAP_LOCALE_COOKIE)?.value;
  if (cookieVal && isAppLocale(cookieVal)) return { locale: cookieVal, fromQuery: false };
  return { locale: pickLocaleFromAcceptLanguage(request.headers.get('accept-language')), fromQuery: false };
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requestHeaders = new Headers(request.headers);

  // Codex P1 catch on PR #1046: `new Headers(request.headers)` preserves any
  // client-supplied values for the headers we treat as trusted downstream.
  // A request with `x-wap-org-id: <other-org>` would otherwise survive cache
  // misses, canonical hosts, and unknown custom domains. Strip both
  // middleware-controlled headers BEFORE any other processing — only this
  // function may set them, and only on verified host matches.
  requestHeaders.delete(WAP_ORG_ID_HEADER);
  requestHeaders.delete(WAP_HOST_HEADER);
  requestHeaders.delete(WAP_USER_ID_HEADER);

  // Mint or forward an `x-request-id` for end-to-end correlation. We set
  // this on BOTH the forwarded request headers (so server components, API
  // routes, and the structured logger can read it) and the eventual
  // response below (so the client and intermediate proxies can echo it
  // back when filing bug reports).
  const { requestId } = resolveRequestId(request.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);

  const { locale: prefixLocale, pathnameWithoutLocale } = splitLocalePrefix(pathname);
  const effectivePath = prefixLocale ? pathnameWithoutLocale : pathname;
  requestHeaders.set('x-pathname', effectivePath);

  const { locale: inferredLocale, fromQuery: localeFromQuery } = resolvePreferredLocale(request);
  requestHeaders.set(WAP_LOCALE_HEADER, prefixLocale ?? inferredLocale);

  if (shouldReserveMobileBottomNavClearance(effectivePath)) {
    requestHeaders.set(WAP_RESERVE_MOBILE_BOTTOM_NAV_HEADER, '1');
  }

  if (effectivePath === '/apply') {
    const fromQuery = request.nextUrl.searchParams.get('utm_source');
    const fromCookie = request.cookies.get(UTM_SOURCE_COOKIE)?.value;
    const candidate = fromQuery ?? fromCookie;
    if (isPaidUtmSource(candidate)) {
      requestHeaders.set(WAP_PAID_APPLY_HEADER, candidate!.toLowerCase());
    }
  }

  // Custom-domain → organization resolution (Track E.1).
  // We CANNOT call Prisma from Edge runtime, so middleware only consults
  // an in-process cache populated by Node-runtime resolvers (see
  // `lib/tenant/resolveOrgFromRequest.ts`). On a cache miss we just
  // forward `x-wap-host` and let the resolver do the DB lookup.
  const normalizedHost = normalizeHost(request.headers.get('host'));
  if (normalizedHost) {
    requestHeaders.set(WAP_HOST_HEADER, normalizedHost);
    if (!isCanonicalHost(normalizedHost)) {
      const cachedOrgId = customDomainCache.get(normalizedHost);
      if (cachedOrgId && cachedOrgId !== NO_ORG_SENTINEL) {
        requestHeaders.set(WAP_ORG_ID_HEADER, cachedOrgId);
      }
    }
  }

  // Marketing URLs: require /{locale}/… in the browser
  if (!prefixLocale && !isLocaleBypassPath(pathname) && isLocaleableMarketingPath(pathname)) {
    const loc = inferredLocale;
    const target = new URL(withLocalePrefix(pathname, loc), request.url);
    // Persist explicit ?lang= choice and strip it from the URL for cleanliness
    if (localeFromQuery) {
      target.searchParams.delete('lang');
      const redirectResponse = NextResponse.redirect(target, 308);
      redirectResponse.cookies.set(WAP_LOCALE_COOKIE, loc, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      });
      return redirectResponse;
    }
    target.search = request.nextUrl.search;
    return NextResponse.redirect(target, 308);
  }

  // Strip locale prefix internally (URL bar still shows /es/…)
  let rewriteUrl: URL | null = null;
  if (prefixLocale && pathnameWithoutLocale !== pathname) {
    rewriteUrl = new URL(pathnameWithoutLocale, request.url);
    rewriteUrl.search = request.nextUrl.search;
  }

  let response = rewriteUrl
    ? NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } })
    : NextResponse.next({ request: { headers: requestHeaders } });

  if (effectivePath === '/apply') {
    const fromQuery = request.nextUrl.searchParams.get('utm_source');
    if (fromQuery && isPaidUtmSource(fromQuery)) {
      response.cookies.set(UTM_SOURCE_COOKIE, fromQuery.toLowerCase(), {
        path: '/',
        maxAge: UTM_SOURCE_COOKIE_MAX_AGE,
        sameSite: 'lax',
      });
    }
  }

  // Partner attribution durability (Phase B2): a student who lands on
  // `/enroll/<partner-slug>` gets a 30-day httpOnly cookie so their partner
  // survives closing the tab, sharing the bare `/apply` link, or finishing
  // the application days later. `/api/apply/signup` reads it only when the
  // submitted body has no `referralRef`, so this never overrides an explicit
  // `?ref=`. Purely additive: nothing else in this function reads the cookie,
  // and non-`/enroll` traffic is untouched. Uses `effectivePath` so a
  // locale-prefixed URL (`/es/enroll/<slug>`) is captured too.
  //
  // Gated on `shouldCaptureEnrollRef` so only a real top-level navigation can
  // plant it — a cross-site `<img>`, hidden iframe, prefetch, or one-hop
  // redirect pointed at `/enroll/<slug>` must not silently force 30 days of
  // partner attribution. The cheap `startsWith` inside
  // `partnerRefFromEnrollPath` runs first, so non-`/enroll` requests never
  // touch the headers.
  const partnerRef = partnerRefFromEnrollPath(effectivePath);
  if (partnerRef && shouldCaptureEnrollRef(request.method, request.headers)) {
    response.cookies.set(PARTNER_REF_COOKIE, partnerRef, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: PARTNER_REF_COOKIE_MAX_AGE,
    });
  }

  // Echo the request ID on the response so the client and intermediate
  // logs can correlate to server-side logs/Sentry events.
  response.headers.set(REQUEST_ID_HEADER, requestId);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isProtectedPath(effectivePath)) {
      const loginUrl = new URL(localizedLoginPath(prefixLocale ?? inferredLocale), request.url);
      loginUrl.searchParams.set('redirectTo', requestedPathWithSearch(request));
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  const sessionOnly = request.cookies.get(SESSION_ONLY_COOKIE)?.value === '1';
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: getSupabaseCookieOptions(sessionOnly),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          if (sessionOnly) {
            const { maxAge: _drop1, expires: _drop2, ...rest } = (options ?? {}) as Record<string, unknown>;
            response.cookies.set(name, value, rest);
          } else {
            response.cookies.set(name, value, options ?? {});
          }
        });
      },
    },
  });

  const needsValidatedUser =
    isProtectedPath(effectivePath) ||
    isTenantApiPath(effectivePath) ||
    (isStaffMfaEnforcementEnabled() &&
      (isAdminPath(effectivePath) || isAdminApiPath(effectivePath)));

  let user: User | null = null;
  if (needsValidatedUser) {
    try {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      user = u;
    } catch (error) {
      console.error('[middleware] Supabase user validation failed:', error);
      user = null;
    }
  } else {
    await supabase.auth.getSession().catch((error) => {
      console.error('[middleware] Supabase session refresh failed:', error);
    });
  }

  // Forward verified user ID to Node runtime so SSR layouts / API routes
  // can set PostgreSQL GUCs without repeating the Supabase round-trip.
  // NextResponse.next()/rewrite() snapshot the forwarded request headers at
  // construction time, so mutating `requestHeaders` after the fact never
  // reaches the app — rebuild the response with the updated headers and
  // carry over everything already set on the original (request-id echo,
  // Supabase session cookies).
  if (user?.id) {
    requestHeaders.set(WAP_USER_ID_HEADER, user.id);
    const rebuilt = rewriteUrl
      ? NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } })
      : NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      if (!k.startsWith('x-middleware-') && k !== 'set-cookie') rebuilt.headers.set(key, value);
    });
    for (const cookie of response.cookies.getAll()) rebuilt.cookies.set(cookie);
    response = rebuilt;
  }

  if (isProtectedPath(effectivePath) && !user) {
    const loginUrl = new URL(localizedLoginPath(prefixLocale ?? inferredLocale), request.url);
    loginUrl.searchParams.set('redirectTo', requestedPathWithSearch(request));
    return NextResponse.redirect(loginUrl);
  }

  // API backstop: unlike page routes, these must not redirect (there is no
  // browser navigation to redirect) — return the same JSON 401 shape the
  // per-route `getUser()` checks already return, so this is a pure
  // defense-in-depth layer with no observable change for authenticated
  // callers or for the already-enforced per-route 401s.
  if (isTenantApiPath(effectivePath) && !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (isStaffMfaEnforcementEnabled() && (isAdminPath(effectivePath) || isAdminApiPath(effectivePath)) && user) {
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aalData?.currentLevel === 'aal1' && aalData?.nextLevel === 'aal2') {
      const trustedDevice = await verifyAdminMfaTrustToken({
        token: request.cookies.get(getAdminMfaTrustCookieName())?.value,
        userId: user.id,
        userAgent: request.headers.get('user-agent'),
      });

      if (trustedDevice) {
        return response;
      }

      if (isAdminApiPath(effectivePath)) {
        return NextResponse.json({ error: 'MFA required' }, { status: 403 });
      }

      if (!effectivePath.startsWith('/verify-mfa') && !effectivePath.startsWith('/setup-mfa')) {
        const verifyUrl = new URL('/verify-mfa', request.url);
        return NextResponse.redirect(verifyUrl);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
