import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseCookieOptions, SESSION_ONLY_COOKIE } from '@/lib/supabaseCookieOptions';
import { getAdminMfaTrustCookieName, verifyAdminMfaTrustToken } from '@/lib/auth/mfaTrust';
import { isStaffMfaEnforcementEnabled } from '@/lib/auth/mfaConfig';

const PORTAL_PATHS = [
  '/dashboard',
  '/resources',
  '/help',
  '/applications',
  '/account',
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

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const pathname = request.nextUrl.pathname;
  requestHeaders.set('x-pathname', pathname);

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isProtectedPath(request.nextUrl.pathname)) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', requestedPathWithSearch(request));
      return NextResponse.redirect(loginUrl);
    }
    if (isAdminApiPath(request.nextUrl.pathname)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return response;
  }

  // If the user logged in with "session only" (no remember-me), preserve that
  // preference on every token refresh so the session doesn't silently become persistent.
  const sessionOnly = request.cookies.get(SESSION_ONLY_COOKIE)?.value === '1';
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: getSupabaseCookieOptions(sessionOnly),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          // Strip maxAge/expires for session-only users so the cookie stays ephemeral
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

  if (isProtectedPath(request.nextUrl.pathname) && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', requestedPathWithSearch(request));
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminApiPath(request.nextUrl.pathname) && !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Add security headers for API routes
  if (pathname.startsWith('/api/')) {
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  // MFA enforcement for admin UI and admin API paths
  if (isStaffMfaEnforcementEnabled() && (isAdminPath(request.nextUrl.pathname) || isAdminApiPath(request.nextUrl.pathname)) && user) {
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    // If at aal1 and next level is aal2, MFA verification is required
    if (aalData?.currentLevel === 'aal1' && aalData?.nextLevel === 'aal2') {
      const trustedDevice = await verifyAdminMfaTrustToken({
        token: request.cookies.get(getAdminMfaTrustCookieName())?.value,
        userId: user.id,
        userAgent: request.headers.get('user-agent'),
      });

      if (trustedDevice) {
        return response;
      }

      if (isAdminApiPath(pathname)) {
        return NextResponse.json({ error: 'MFA required' }, { status: 403 });
      }

      // Don't redirect if already on verify-mfa or setup-mfa
      if (!pathname.startsWith('/verify-mfa') && !pathname.startsWith('/setup-mfa')) {
        const verifyUrl = new URL('/verify-mfa', request.url);
        return NextResponse.redirect(verifyUrl);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
