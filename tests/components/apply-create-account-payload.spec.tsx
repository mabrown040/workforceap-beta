/**
 * BL1 + M8 — what step 3 is allowed to take out of step 1's stored payload.
 *
 * `ApplyCreateAccountForm` posts a set of fields the applicant never sees on
 * this screen: their age band, county, barriers, school, grade and — for a
 * minor — their parent's name, email and phone. All of it comes from
 * `apply_eligibility` in browser storage, which on a shared school-lab
 * computer may belong to the PREVIOUS student.
 *
 * These tests drive the real component and inspect the request body it builds,
 * because the body is the thing that reaches the database.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import enMessages from '@/messages/en.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/apply/create-account',
}));

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string, values?: Record<string, string>) => {
    const table = (enMessages as unknown as Record<string, Record<string, string>>)[namespace];
    const raw = table?.[key];
    if (typeof raw !== 'string') return `${namespace}.${key}`;
    return values
      ? raw.replace(/\{(\w+)\}/g, (_m, name: string) => String(values[name] ?? ''))
      : raw;
  },
}));

vi.mock('@/lib/analytics/events', () => ({ trackApplyFunnel: vi.fn() }));
vi.mock('@/lib/analytics/conversionValue', () => ({ trackConversionWithValue: vi.fn() }));
vi.mock('@/lib/marketing/utmCapture', () => ({
  readMarketingAttribution: () => ({}),
  clearMarketingAttribution: vi.fn(),
}));

import ApplyCreateAccountForm from '@/app/apply/create-account/ApplyCreateAccountForm';
import { APPLY_PROGRAM_RANKED_KEY } from '@/lib/apply/applyProgramStorage';
import { APPLY_REFERRAL_SESSION_KEY } from '@/lib/apply/applyReferralCapture';
import { writeApplyEligibility } from '@/lib/apply/applyEligibilityStorage';

const PROGRAM_SLUG = 'it-support-professional-certificate-ibm';

/** Student A: a 16-year-old applying through their high school. */
const STUDENT_A_PAYLOAD = {
  firstName: 'Alex',
  lastName: 'Prior',
  email: 'alex.prior@example.com',
  phone: '5125550100',
  ageGroup: 'under_18',
  city: 'Austin',
  state: 'TX',
  zip: '78701',
  county: 'Travis',
  primaryBarriers: ['seeking_skills_training'],
  variant: 'school' as const,
  schoolSlug: 'concordia-hs',
  gradeLevel: '11',
  schoolAttestation: true,
  studentId: 'CHS-1',
  guardianName: 'Dana Guardian',
  guardianEmail: 'dana.guardian@example.com',
  guardianPhone: '5125550123',
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
  sessionStorage.setItem(APPLY_PROGRAM_RANKED_KEY, JSON.stringify([PROGRAM_SLUG]));
  fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({ success: true }),
  }));
  vi.stubGlobal('fetch', fetchMock);
  // The component navigates on success; jsdom cannot, so make the assignment
  // a no-op rather than a thrown "not implemented".
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, href: '', assign: vi.fn() },
  });
});

/** Fills the form as the person now at the keyboard and submits it. */
async function submitAs(email: string, firstName = 'Blake', lastName = 'Next') {
  const { container } = render(<ApplyCreateAccountForm />);
  // The form is behind a "loading your choices" state until its storage
  // effects settle. Fields are addressed by id: the visible labels are
  // localized copy this test has no reason to pin.
  await waitFor(() => expect(container.querySelector('#password')).not.toBeNull());

  const set = (selector: string, value: string) =>
    fireEvent.change(container.querySelector(selector)!, { target: { value } });

  set('#firstName', firstName);
  set('#lastName', lastName);
  set('#email', email);
  set('#phone', '5125550199');
  set('#password', 'Password123!');
  set('#confirmPassword', 'Password123!');
  fireEvent.click(container.querySelector('#contactConsent')!);
  fireEvent.submit(container.querySelector('form')!);

  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  return JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body) as Record<
    string,
    unknown
  >;
}

describe('ApplyCreateAccountForm — a stale payload from another student', () => {
  it('sends NONE of student A’s data when student B types their own email', async () => {
    // The whole point: none of these fields are visible on this screen, so B
    // has no way to notice, correct, or even know about any of them.
    writeApplyEligibility(STUDENT_A_PAYLOAD);

    const body = await submitAs('blake.next@example.com');

    expect(body.email).toBe('blake.next@example.com');
    for (const key of [
      'guardianName',
      'guardianEmail',
      'guardianPhone',
      'gradeLevel',
      'studentId',
      'schoolAttestation',
      'ageGroup',
      'county',
      'primaryBarriers',
    ]) {
      expect(body, `${key} belongs to another applicant`).not.toHaveProperty(key);
    }
  });

  it('does not let a stale payload supply another student’s SCHOOL either', async () => {
    // M8 adds `schoolSlug` as an attribution fallback; the ownership check has
    // to run first, or the fallback becomes a second way to inherit a school.
    writeApplyEligibility(STUDENT_A_PAYLOAD);

    const body = await submitAs('blake.next@example.com');

    expect(body).not.toHaveProperty('referralRef');
  });

  it('matches the owner case-insensitively and forwards everything', async () => {
    writeApplyEligibility(STUDENT_A_PAYLOAD);

    const body = await submitAs('  ALEX.PRIOR@Example.com  ', 'Alex', 'Prior');

    expect(body).toMatchObject({
      ageGroup: 'under_18',
      county: 'Travis',
      gradeLevel: '11',
      schoolAttestation: true,
      guardianName: 'Dana Guardian',
      guardianEmail: 'dana.guardian@example.com',
      guardianPhone: '5125550123',
    });
  });
});

describe('ApplyCreateAccountForm — new-tab resume attribution (M8)', () => {
  it('falls back to the stored schoolSlug when sessionStorage is empty', async () => {
    // A student who arrived at `/apply?ref=<slug>` without ever visiting
    // `/enroll/<slug>` has no cookie; finishing in a NEW TAB loses the
    // sessionStorage key. Before this fallback that silently cost them their
    // school, their guardian capture and their partner attribution, at 200 OK.
    writeApplyEligibility(STUDENT_A_PAYLOAD);

    const body = await submitAs('alex.prior@example.com', 'Alex', 'Prior');

    expect(body.referralRef).toBe('concordia-hs');
  });

  it('lets the session referral key win over the stored slug', async () => {
    sessionStorage.setItem(APPLY_REFERRAL_SESSION_KEY, 'other-school');
    writeApplyEligibility(STUDENT_A_PAYLOAD);

    const body = await submitAs('alex.prior@example.com', 'Alex', 'Prior');

    expect(body.referralRef).toBe('other-school');
  });

  it('sends no referralRef at all for an organic applicant', async () => {
    writeApplyEligibility({
      email: 'organic@example.com',
      ageGroup: '25_50',
      county: 'Travis',
      q1: 'yes',
      q2: 'no',
      qualifies: true,
      yesCount: 1,
    });

    const body = await submitAs('organic@example.com');

    expect(body).not.toHaveProperty('referralRef');
    expect(body).toMatchObject({ eligibilityQ1: 'yes', eligibilityQ2: 'no' });
  });
});
