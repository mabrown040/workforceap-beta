import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseCookieOptions, SESSION_ONLY_COOKIE } from '@/lib/supabaseCookieOptions';
import { getAdminMfaTrustCookieName, verifyAdminMfaTrustToken } from '@/lib/auth/mfaTrust';
import { isStaffMfaEnforcementEnabled } from '@/lib/auth/mfaConfig';
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

function isPortalPath(pathname: string) {
  return PORTAL_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isAdminPath(pathname: string) {
  return ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isAdminApiPath(pathname: string) {
  return ADMIN_API_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isProtectedPath(pathname: string) {
  return isPortalPath(pathname) || isAdminPath(pathname);
}

function requestedPathWithSearch(request: NextRequest) {
  return `${request.nextUrl.pathname}${request.nextUrl.search}`;
}

function resolvePreferredLocale(request: NextRequest) {
  const cookieVal = request.cookies.get(WAP_LOCALE_COOKIE)?.value;
  if (cookieVal && isAppLocale(cookieVal)) return cookieVal;
  return pickLocaleFromAcceptLanguage(request.headers.get('accept-language'));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requestHeaders = new Headers(request.headers);

  const { locale: prefixLocale, pathnameWithoutLocale } = splitLocalePrefix(pathname);
  const effectivePath = prefixLocale ? pathnameWithoutLocale : pathname;
  requestHeaders.set('x-pathname', effectivePath);

  const inferredLocale = resolvePreferredLocale(request);
  requestHeaders.set(WAP_LOCALE_HEADER, prefixLocale ?? inferredLocale);

  // Marketing URLs: require /{locale}/… in the browser
  if (!prefixLocale && !isLocaleBypassPath(pathname) && isLocaleableMarketingPath(pathname)) {
    const loc = inferredLocale;
    const target = new URL(withLocalePrefix(pathname, loc), request.url);
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isProtectedPath(effectivePath)) {
      const loginUrl = new URL('/login', request.url);
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtectedPath(effectivePath) && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', requestedPathWithSearch(request));
    return NextResponse.redirect(loginUrl);
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
