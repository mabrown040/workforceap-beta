import { NextResponse, type NextRequest } from 'next/server';
import { PARTNER_REF_COOKIE } from '@/lib/apply/applyReferralCapture';
import { WAP_LOCALE_HEADER, isAppLocale, withLocalePrefix } from '@/lib/i18n/config';

/**
 * "This isn't my school" — the escape hatch out of the school variant.
 *
 * WHY THIS EXISTS. The `wap_partner_ref` cookie middleware plants on
 * `/enroll/<slug>` lasts 30 days and is consumed only by a SUCCESSFUL signup.
 * A student who opens the school's link and abandons leaves it behind, so on a
 * shared school-lab machine — the normal device for this funnel — the next
 * student to open a bare `/apply` gets the school variant: a read-only school
 * name they cannot change and a REQUIRED attestation reading "I am currently
 * enrolled at <school>". There is no way to continue without ticking it. That
 * is a form that forces a false statement out of a minor, and the fix has to
 * be reachable from the page itself, not from a support call.
 *
 * WHY A ROUTE HANDLER. The cookie is `httpOnly`, so no amount of client code
 * can clear it; only a response from the server can. The button in
 * `ApplyEligibilityClient` clears the browser-side state it owns (the
 * `apply_partner_ref` session key and the school answers in the step-1 draft)
 * and then navigates here for the cookie.
 *
 * After the redirect `/apply` sees no `?ref=` and no cookie, so
 * `resolveSchoolApplyPartner` returns null and the STANDARD wizard renders.
 * Nothing re-plants the cookie: middleware only sets it on `/enroll/<slug>`.
 *
 * GET, not POST, because it is a plain navigation with no CSRF-sensitive
 * effect — the only thing it can do to a victim is un-attribute them, which is
 * also exactly what an unwanted attribution needs.
 */
export async function GET(request: NextRequest) {
  const headerLocale = request.headers.get(WAP_LOCALE_HEADER);
  const locale = headerLocale && isAppLocale(headerLocale) ? headerLocale : null;
  // Send them back into the same language they were reading. Middleware would
  // re-prefix a bare `/apply` from the locale cookie anyway, but doing it here
  // saves a redirect hop and works when that cookie is absent.
  const target = new URL(locale ? withLocalePrefix('/apply', locale) : '/apply', request.url);

  // Carry the program pre-selection through: it came from the marketing link,
  // not from the school, so switching schools must not lose it.
  const program = request.nextUrl.searchParams.get('program');
  if (program) target.searchParams.set('program', program);

  // 303: the browser must follow with a GET regardless of how it arrived.
  const response = NextResponse.redirect(target, 303);
  response.cookies.set(PARTNER_REF_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}
