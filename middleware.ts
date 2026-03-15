import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PORTAL_PATHS = ['/dashboard', '/resources', '/ai-tools', '/career-brief', '/help'];
const ADMIN_PATHS = ['/admin'];

function isPortalPath(pathname: string) {
  return PORTAL_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isAdminPath(pathname: string) {
  return ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isProtectedPath(pathname: string) {
  return isPortalPath(pathname) || isAdminPath(pathname);
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isProtectedPath(request.nextUrl.pathname)) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days persistent
      sameSite: 'lax',
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options ?? {})
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtectedPath(request.nextUrl.pathname) && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
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
