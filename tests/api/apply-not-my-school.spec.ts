// @vitest-environment node
/**
 * BL2 — the escape hatch out of a school variant that isn't yours.
 *
 * The `wap_partner_ref` cookie middleware plants on `/enroll/<slug>` lasts 30
 * days and is consumed only by a SUCCESSFUL signup. A student who opens the
 * school's link and abandons leaves it behind, so on a shared school-lab
 * machine the next student to open a bare `/apply` is shown a read-only school
 * they do not attend and a REQUIRED attestation saying they are enrolled
 * there, with no way to continue without ticking it.
 *
 * The cookie is httpOnly, so only a server response can clear it. This asserts
 * the route does clear it, and — with `resolveSchoolApplyPartner` — that the
 * standard wizard is genuinely reachable once it is gone.
 */
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/observability/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/observability/captureApiError', () => ({ captureApiError: vi.fn() }));

import { GET } from '@/app/api/apply/not-my-school/route';
import { PARTNER_REF_COOKIE } from '@/lib/apply/applyReferralCapture';
import { WAP_LOCALE_HEADER } from '@/lib/i18n/config';
import {
  resolveApplyPartnerRef,
  resolveSchoolApplyPartner,
  SCHOOL_PARTNER_TYPE,
  type SchoolApplyPartnerDb,
} from '@/lib/apply/schoolApplyPartner';

function request(url = 'http://localhost:3000/api/apply/not-my-school', headers: HeadersInit = {}) {
  return new NextRequest(url, { method: 'GET', headers });
}

describe('GET /api/apply/not-my-school', () => {
  it('expires the partner-ref cookie', async () => {
    const res = await GET(request());

    const cookie = res.cookies.get(PARTNER_REF_COOKIE);
    expect(cookie?.value).toBe('');
    expect(cookie?.maxAge).toBe(0);
    // Path must match the one middleware set, or the browser keeps the old
    // cookie alongside the expired one.
    expect(cookie?.path).toBe('/');
  });

  it('redirects back to the standard apply wizard', async () => {
    const res = await GET(request());

    expect(res.status).toBe(303);
    expect(new URL(res.headers.get('location')!).pathname).toBe('/apply');
  });

  it('carries no ref of any kind on the redirect', async () => {
    // A `?ref=` on the way back would re-trigger the exact variant we are
    // escaping — `?ref=` beats the (now cleared) cookie in the page's
    // resolution order.
    const res = await GET(request('http://localhost:3000/api/apply/not-my-school?ref=concordia-hs'));

    expect(new URL(res.headers.get('location')!).searchParams.get('ref')).toBeNull();
  });

  it('keeps a program pre-selection, which came from marketing not the school', async () => {
    const res = await GET(
      request('http://localhost:3000/api/apply/not-my-school?program=it-support')
    );

    expect(new URL(res.headers.get('location')!).searchParams.get('program')).toBe('it-support');
  });

  it('returns the student to the language they were reading', async () => {
    const res = await GET(request(undefined, { [WAP_LOCALE_HEADER]: 'es' }));

    expect(new URL(res.headers.get('location')!).pathname).toBe('/es/apply');
  });

  it('ignores a bogus locale header rather than building a broken path', async () => {
    const res = await GET(request(undefined, { [WAP_LOCALE_HEADER]: '../admin' }));

    expect(new URL(res.headers.get('location')!).pathname).toBe('/apply');
  });
});

describe('the standard wizard is reachable once the cookie is gone', () => {
  const db: SchoolApplyPartnerDb = {
    partner: {
      findFirst: async () => ({
        id: 'partner-concordia',
        name: 'Concordia High School',
        slug: 'concordia-hs',
        partnerType: SCHOOL_PARTNER_TYPE,
        schoolDistrict: 'Austin ISD',
        sponsoredEnrollment: true,
        sponsorshipStartsAt: null,
        sponsorshipEndsAt: null,
        sponsorshipSeatCap: null,
      }),
    },
    courseEnrollment: { count: async () => 0 },
  };

  it('shows the school variant while the cookie is still there', async () => {
    const ref = resolveApplyPartnerRef(undefined, 'concordia-hs');
    await expect(resolveSchoolApplyPartner(ref, { db })).resolves.not.toBeNull();
  });

  it('shows the STANDARD wizard once the cookie is expired and no ?ref= is present', async () => {
    // This is the state the route handler leaves the browser in: cookie blank,
    // no query param. `resolveApplyPartnerRef` must produce no ref, and with
    // no ref the page runs no query at all.
    const ref = resolveApplyPartnerRef(undefined, '');
    expect(ref).toBeNull();

    let queried = false;
    await expect(
      resolveSchoolApplyPartner(ref, {
        db: {
          partner: {
            findFirst: async () => {
              queried = true;
              return null;
            },
          },
          courseEnrollment: { count: async () => 0 },
        },
      })
    ).resolves.toBeNull();
    expect(queried).toBe(false);
  });
});
