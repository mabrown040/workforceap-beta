/**
 * Phase B4 — variant separation in the apply wizard's step 1.
 *
 * The two things this pins, in both directions:
 *  - the ORGANIC and PAID variants must be untouched by B4: no school fields,
 *    no guardian block, and the two workforce-funding questions still there;
 *  - the SCHOOL variant must not ask a minor about their own employment
 *    status or their household income, and must collect school + guardian
 *    details instead.
 *
 * Real `messages/en.json` copy is used rather than key stubs, so the
 * assertions are about what an applicant actually reads.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import enMessages from '@/messages/en.json';

const push = vi.fn();
/** Mutable so a test can put `?program=` on the URL. */
const search = vi.hoisted(() => ({ current: new URLSearchParams() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => search.current,
  usePathname: () => '/apply',
}));

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string, values?: Record<string, string>) => {
    const table = (enMessages as unknown as Record<string, Record<string, string>>)[namespace];
    const raw = table?.[key];
    if (typeof raw !== 'string') return `${namespace}.${key}`;
    return values
      ? raw.replace(/\{(\w+)\}/g, (_match, name: string) => String(values[name] ?? ''))
      : raw;
  },
}));

vi.mock('@/lib/analytics/events', () => ({ trackApplyFunnel: vi.fn() }));

import ApplyEligibilityClient from '@/app/apply/ApplyEligibilityClient';
import { APPLY_FLOW_DRAFT_KEY } from '@/lib/apply/applyProgramStorage';
import {
  APPLY_ELIGIBILITY_KEY,
  readApplyEligibility,
} from '@/lib/apply/applyEligibilityStorage';
import { APPLY_REFERRAL_SESSION_KEY } from '@/lib/apply/applyReferralCapture';

const apply = enMessages.apply as unknown as Record<string, string>;

const SCHOOL_PARTNER: { name: string; slug: string; schoolDistrict: string | null } = {
  name: 'Concordia High School',
  slug: 'concordia-hs',
  schoolDistrict: 'Austin ISD',
};

/** Prompts that exist to size an adult's workforce-funding eligibility. */
const FUNDING_QUESTION_PROMPTS = [apply.eligibilityQ1Prompt, apply.eligibilityQ2Prompt];

/** Every field id the school variant — and only the school variant — renders. */
const SCHOOL_FIELD_IDS = [
  'apply-grade-level',
  'apply-school-attestation',
  'apply-school-name',
  'apply-student-id',
];

const GUARDIAN_FIELD_IDS = [
  'apply-guardian-name',
  'apply-guardian-email',
  'apply-guardian-phone',
];

function fillContact() {
  fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Sam' } });
  fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Student' } });
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'sam@example.com' } });
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  search.current = new URLSearchParams();
  vi.clearAllMocks();
});

describe.each([
  ['organic', undefined],
  ['paid', 'paid'],
] as const)('ApplyEligibilityClient %s variant', (_label, variant) => {
  it('still asks both workforce-funding questions', () => {
    const { container } = render(<ApplyEligibilityClient variant={variant} />);

    for (const prompt of FUNDING_QUESTION_PROMPTS) {
      expect(screen.getByText(prompt)).toBeInTheDocument();
    }
    expect(container.querySelector('input[name="q1"]')).not.toBeNull();
    expect(container.querySelector('input[name="q2"]')).not.toBeNull();
  });

  it('renders no school or guardian fields', () => {
    const { container } = render(<ApplyEligibilityClient variant={variant} />);

    for (const id of [...SCHOOL_FIELD_IDS, ...GUARDIAN_FIELD_IDS]) {
      expect(container.querySelector(`#${id}`), `${id} must not render`).toBeNull();
    }
    expect(screen.queryByText(apply.schoolSectionTitle)).toBeNull();
    expect(screen.queryByText(apply.guardianSectionTitle)).toBeNull();
    // The attestation names a school; there is none outside the school variant.
    expect(screen.queryByText(/I am currently enrolled at/i)).toBeNull();
  });

  it('keeps the FULL barriers checklist', () => {
    // Only the school variant trims it (M7) — adults on workforce funding are
    // asked the whole set, which is what the funding is scoped against.
    const { container } = render(<ApplyEligibilityClient variant={variant} />);
    const values = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[name="primaryBarriers"]')
    ).map((input) => input.value);

    expect(values).toContain('snap_tanf_wic');
    expect(values).toContain('justice_involved');
    expect(values).toContain('disability_health');
    expect(values).toContain('housing_instable');
  });

  it('shows the standard consent line, not the guardian one', () => {
    render(<ApplyEligibilityClient variant={variant} />);
    expect(screen.getByText(apply.applyConsentLine, { exact: false })).toBeInTheDocument();
    expect(screen.queryByText(apply.applyConsentLineGuardian, { exact: false })).toBeNull();
  });

  it('renders no school fields even after selecting the under-18 age band', () => {
    // `under_18` is a valid organic answer (Phase A) and must not smuggle in
    // the guardian block outside the school variant.
    const { container } = render(<ApplyEligibilityClient variant={variant} />);
    fireEvent.change(screen.getByLabelText(apply.ageGroupLabel), {
      target: { value: 'under_18' },
    });

    for (const id of GUARDIAN_FIELD_IDS) {
      expect(container.querySelector(`#${id}`)).toBeNull();
    }
  });

  it('keeps the standard screening heading and age-group hint', () => {
    const { container } = render(<ApplyEligibilityClient variant={variant} />);

    expect(screen.getByText(apply.screeningSectionTitle)).toBeInTheDocument();
    expect(screen.queryByText(apply.schoolScreeningSectionTitle)).toBeNull();
    expect(container.querySelector('#apply-age-group-hint')).toBeNull();
  });
});

describe('ApplyEligibilityClient school variant', () => {
  function renderSchool(partner = SCHOOL_PARTNER, sponsorshipInForce = true) {
    return render(
      <ApplyEligibilityClient
        variant="school"
        schoolPartner={partner}
        sponsorshipInForce={sponsorshipInForce}
      />
    );
  }

  it('does NOT ask the employment-status or household-income questions', () => {
    // Both are inappropriate to put to a minor and irrelevant to a seat the
    // school is paying for.
    const { container } = renderSchool();

    for (const prompt of FUNDING_QUESTION_PROMPTS) {
      expect(screen.queryByText(prompt), `must not ask: ${prompt}`).toBeNull();
    }
    expect(container.querySelector('input[name="q1"]')).toBeNull();
    expect(container.querySelector('input[name="q2"]')).toBeNull();
    expect(screen.queryByText(apply.eligibilityQ1Legend)).toBeNull();
    expect(screen.queryByText(apply.eligibilityQ2Legend)).toBeNull();
  });

  it('shows no funding-fit banner copy', () => {
    renderSchool();
    expect(screen.queryByText(apply.fundingBannerQualifyStrong)).toBeNull();
    expect(screen.queryByText(apply.fundingBannerNeutralStrong)).toBeNull();
  });

  it('asks for grade 9–12', () => {
    renderSchool();
    const grade = screen.getByLabelText(apply.schoolGradeLabel) as HTMLSelectElement;
    expect(
      within(grade)
        .getAllByRole('option')
        .map((o) => (o as HTMLOptionElement).value)
    ).toEqual(['', '9', '10', '11', '12']);
  });

  it('asks no expected-graduation question at all', () => {
    // Dropped: no column, no reader, derivable from the grade — and the select
    // it replaced offered the CURRENT year first (wrong for anyone applying
    // after May) from a list computed during render.
    const { container } = renderSchool();
    expect(container.querySelector('#apply-graduation-year')).toBeNull();
    expect(container.querySelector('select[name="expectedGraduationYear"]')).toBeNull();
  });

  it('attests to ENROLLMENT ONLY, never to the funding arrangement', () => {
    // m2: a student cannot know whether their school is sponsoring them, and
    // when the sponsorship has lapsed it is not even true.
    renderSchool();
    expect(
      screen.getByText('I am currently enrolled at Concordia High School. *')
    ).toBeInTheDocument();
    expect(screen.queryByText(/sponsoring my participation/i)).toBeNull();
  });

  it('marks the attestation required, like every other required field', () => {
    // m6: it had neither `required` nor `aria-required`, and its label was the
    // only required label on the form with no `*`.
    const { container } = renderSchool();
    const attestation = container.querySelector<HTMLInputElement>('#apply-school-attestation')!;

    expect(attestation.required).toBe(true);
    expect(attestation.getAttribute('aria-required')).toBe('true');
    expect(
      container.querySelector('label[for="apply-school-attestation"]')?.textContent
    ).toContain('*');
  });

  it('prefills school name and district read-only, plus an optional student id', () => {
    renderSchool();

    const schoolName = screen.getByLabelText(apply.schoolNameLabel) as HTMLInputElement;
    expect(schoolName.value).toBe('Concordia High School');
    expect(schoolName.readOnly).toBe(true);

    const district = screen.getByLabelText(apply.schoolDistrictLabel) as HTMLInputElement;
    expect(district.value).toBe('Austin ISD');
    expect(district.readOnly).toBe(true);

    const studentId = screen.getByLabelText(apply.schoolStudentIdLabel) as HTMLInputElement;
    expect(studentId.readOnly).toBe(false);
    expect(studentId.required).toBe(false);
  });

  it('hides the district field entirely when the partner has none', () => {
    renderSchool({ ...SCHOOL_PARTNER, schoolDistrict: null });
    expect(screen.queryByLabelText(apply.schoolDistrictLabel)).toBeNull();
  });

  it('puts the under-18 band first without nudging the applicant towards it', () => {
    // m3: the hint used to read "Most students applying through <school> choose
    // 'Under 18'" — a nudge on the one field that decides whether the
    // applicant is handled as a minor.
    const { container } = renderSchool();
    const ageGroup = screen.getByLabelText(apply.ageGroupLabel) as HTMLSelectElement;
    const values = within(ageGroup)
      .getAllByRole('option')
      .map((o) => (o as HTMLOptionElement).value);
    expect(values[1]).toBe('under_18');

    const hint = container.querySelector('#apply-age-group-hint');
    expect(hint?.textContent).toBe(apply.schoolAgeGroupHint);
    expect(hint?.textContent).not.toMatch(/most students/i);
    expect(hint?.textContent).not.toMatch(/under 18/i);
    expect(ageGroup.getAttribute('aria-describedby')).toBe('apply-age-group-hint');
  });

  it('renders the age-band labels through the message catalog', () => {
    // m4: they were hard-coded English, so a translated hint could name an
    // option that did not exist in the select.
    const ageGroup = renderSchool() && (screen.getByLabelText(apply.ageGroupLabel) as HTMLSelectElement);
    const labels = within(ageGroup)
      .getAllByRole('option')
      .map((o) => (o as HTMLOptionElement).textContent);

    expect(labels).toEqual([
      apply.ageGroupPlaceholder,
      apply.ageGroupUnder18,
      apply.ageGroup18To24,
      apply.ageGroup25To50,
      apply.ageGroup50Plus,
    ]);
  });

  it('asks for a guardian only once the applicant says they are under 18', () => {
    const { container } = renderSchool();
    for (const id of GUARDIAN_FIELD_IDS) {
      expect(container.querySelector(`#${id}`)).toBeNull();
    }

    fireEvent.change(screen.getByLabelText(apply.ageGroupLabel), {
      target: { value: '18_24' },
    });
    expect(container.querySelector('#apply-guardian-email')).toBeNull();

    fireEvent.change(screen.getByLabelText(apply.ageGroupLabel), {
      target: { value: 'under_18' },
    });
    for (const id of GUARDIAN_FIELD_IDS) {
      expect(container.querySelector(`#${id}`)).not.toBeNull();
    }
  });

  it('rejects a guardian email that is the student\'s own address', () => {
    // The failure mode: parental consent mail routed to the child.
    renderSchool();
    fillContact();
    fireEvent.change(screen.getByLabelText(apply.ageGroupLabel), {
      target: { value: 'under_18' },
    });
    fireEvent.change(screen.getByLabelText(apply.guardianEmailLabel), {
      target: { value: '  SAM@Example.com ' },
    });

    expect(
      screen.getByText("Please enter a parent or guardian's own email address.")
    ).toBeInTheDocument();
  });

  it('accepts a distinct, valid guardian email', () => {
    renderSchool();
    fillContact();
    fireEvent.change(screen.getByLabelText(apply.ageGroupLabel), {
      target: { value: 'under_18' },
    });
    fireEvent.change(screen.getByLabelText(apply.guardianEmailLabel), {
      target: { value: 'parent@example.com' },
    });

    expect(
      screen.queryByText("Please enter a parent or guardian's own email address.")
    ).toBeNull();
  });

  it('asks minors only the NEUTRAL barrier questions', () => {
    // M7: B4 removed the two income questions as inappropriate for a minor and
    // kept a checklist asking the same minor about SNAP/TANF receipt, justice
    // involvement, disability and housing instability — which lands in
    // Profile.barrierTypes, in Application.notes (member-exported) and in the
    // admin alert email.
    const { container } = renderSchool();
    const values = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[name="primaryBarriers"]')
    ).map((input) => input.value);

    expect(values).toEqual(['seeking_skills_training', 'no_barrier', 'other_barrier']);
    for (const sensitive of [
      'snap_tanf_wic',
      'justice_involved',
      'disability_health',
      'housing_instable',
      'employment_gap',
      'limited_work_history',
    ]) {
      expect(values, `must not ask a minor about ${sensitive}`).not.toContain(sensitive);
    }
    // The block itself stays, so barrierTypes / hasEmploymentBarrier keep working.
    expect(screen.getByText(apply.primaryBarriersLabel)).toBeInTheDocument();
  });

  it('blocks continuing until the school questions are answered', () => {
    renderSchool();
    fillContact();
    fireEvent.click(screen.getByRole('button', { name: apply.continueToPrograms }));

    expect(push).not.toHaveBeenCalled();
    expect(screen.getByText(apply.errSchoolGrade)).toBeInTheDocument();
    expect(screen.getByText(apply.errSchoolAttestation)).toBeInTheDocument();
  });

  it('attributes consent to the guardian once the applicant says they are under 18', () => {
    // m1: a self-identified minor cannot accept terms on their own behalf.
    renderSchool();
    expect(screen.getByText(apply.applyConsentLine, { exact: false })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(apply.ageGroupLabel), {
      target: { value: 'under_18' },
    });

    expect(screen.getByText(apply.applyConsentLineGuardian, { exact: false })).toBeInTheDocument();
    expect(screen.queryByText(apply.applyConsentLine, { exact: false })).toBeNull();
  });

  it('describes what actually happens with the consent form', () => {
    // M2: the copy promised "They will receive the consent form before you
    // start". Nothing reads the guardian email or phone — the form is paper,
    // handed out by the school (per the launch runbook).
    renderSchool();
    fireEvent.change(screen.getByLabelText(apply.ageGroupLabel), {
      target: { value: 'under_18' },
    });

    expect(screen.getByText(apply.guardianIntro)).toBeInTheDocument();
    expect(screen.queryByText(/they will receive the consent form/i)).toBeNull();
    expect(apply.guardianIntro).toContain('Your school will give them a consent form');
  });
});

/**
 * M1 — the school variant gated only on `partnerType`, so a school outside its
 * sponsorship window, or one at its seat cap, was still told its seat was
 * sponsored. Phase B3 hardened `/enroll/<slug>` against exactly this.
 */
describe('ApplyEligibilityClient school variant without an active sponsorship', () => {
  function renderUnsponsored() {
    return render(
      <ApplyEligibilityClient
        variant="school"
        schoolPartner={SCHOOL_PARTNER}
        sponsorshipInForce={false}
      />
    );
  }

  it('makes no claim about who is paying for the seat', () => {
    renderUnsponsored();

    expect(screen.getByText(apply.schoolStep1LeadNeutral.replace('{schoolName}', 'Concordia High School'))).toBeInTheDocument();
    expect(screen.queryByText(/your seat is sponsored/i)).toBeNull();
    expect(screen.queryByText(/is sponsoring your seat/i)).toBeNull();
  });

  it('still asks the school questions and still skips the funding screener', () => {
    // Sponsorship decides the COPY; partnerType decides the QUESTIONS.
    const { container } = renderUnsponsored();

    expect(container.querySelector('#apply-grade-level')).not.toBeNull();
    expect(container.querySelector('#apply-school-attestation')).not.toBeNull();
    expect(container.querySelector('input[name="q1"]')).toBeNull();
    expect(container.querySelector('input[name="q2"]')).toBeNull();
  });

  it('defaults to the neutral copy when no sponsorship state is passed at all', () => {
    // Fails safe: a caller that forgets the prop can only under-claim.
    render(<ApplyEligibilityClient variant="school" schoolPartner={SCHOOL_PARTNER} />);
    expect(screen.queryByText(/your seat is sponsored/i)).toBeNull();
  });
});

/**
 * BL2 — the wrong-school escape hatch, and the affirmation that must never be
 * restored from storage.
 */
describe('ApplyEligibilityClient school variant on a shared device', () => {
  function renderSchool() {
    return render(
      <ApplyEligibilityClient
        variant="school"
        schoolPartner={SCHOOL_PARTNER}
        sponsorshipInForce
      />
    );
  }

  function writeDraft(overrides: Record<string, unknown> = {}) {
    localStorage.setItem(
      APPLY_FLOW_DRAFT_KEY,
      JSON.stringify({
        version: 1,
        updatedAt: new Date().toISOString(),
        firstName: 'Alex',
        lastName: 'Prior',
        email: 'alex.prior@example.com',
        phone: '(512) 555-0100',
        ageGroup: 'under_18',
        city: 'Austin',
        state: 'TX',
        zip: '78701',
        county: 'Travis',
        primaryBarriers: ['seeking_skills_training'],
        q1: null,
        q2: null,
        gradeLevel: '11',
        studentId: 'CHS-1',
        guardianName: 'Dana Guardian',
        guardianEmail: 'dana.guardian@example.com',
        guardianPhone: '(512) 555-0123',
        ...overrides,
      })
    );
  }

  it('NEVER restores the enrollment attestation from a draft', () => {
    // BL2b: an affirmation has to be made in the session that submits it. A
    // restored tick is a statement the person at the keyboard never made — and
    // on a shared lab machine it may not even be true of them.
    writeDraft({ schoolAttestation: true });

    const { container } = renderSchool();

    const attestation = container.querySelector<HTMLInputElement>('#apply-school-attestation')!;
    expect(attestation.checked).toBe(false);
    // Everything else still restores, so "finish later" keeps working.
    expect((container.querySelector('#apply-grade-level') as HTMLSelectElement).value).toBe('11');
    expect((container.querySelector('#apply-first-name') as HTMLInputElement).value).toBe('Alex');
  });

  it('never writes the attestation into the draft in the first place', () => {
    renderSchool();
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Sam' } });
    fireEvent.click(screen.getByLabelText(/I am currently enrolled at/i));
    fireEvent.click(screen.getByRole('button', { name: apply.saveContinueLater }));

    const stored = JSON.parse(localStorage.getItem(APPLY_FLOW_DRAFT_KEY)!) as Record<string, unknown>;
    expect(stored).not.toHaveProperty('schoolAttestation');
  });

  it('offers a way out of the wrong school, next to the prefilled school name', () => {
    // BL2a: the 30-day partner-ref cookie is consumed only by a SUCCESSFUL
    // signup, so the next student on the machine can land on a read-only
    // school they do not attend behind a required "I am enrolled here".
    const { container } = renderSchool();

    const escape = screen.getByRole('link', { name: apply.schoolNotMineCta });
    expect(escape.getAttribute('href')).toBe('/api/apply/not-my-school');
    // Next to the school name, inside its hint, not buried elsewhere.
    expect(container.querySelector('#apply-school-name-hint')).toContainElement(escape);
  });

  it('clears the browser-side school state before handing off to the cookie route', () => {
    writeDraft();
    sessionStorage.setItem(APPLY_REFERRAL_SESSION_KEY, 'concordia-hs');
    sessionStorage.setItem(
      APPLY_ELIGIBILITY_KEY,
      JSON.stringify({ email: 'alex.prior@example.com', guardianEmail: 'dana.guardian@example.com' })
    );

    renderSchool();
    fireEvent.click(screen.getByRole('link', { name: apply.schoolNotMineCta }));

    expect(sessionStorage.getItem(APPLY_REFERRAL_SESSION_KEY)).toBeNull();
    expect(readApplyEligibility()).toBeNull();

    // The draft survives so the standard wizard comes back pre-filled — but
    // with every school and guardian key stripped out of it.
    const draft = JSON.parse(localStorage.getItem(APPLY_FLOW_DRAFT_KEY)!) as Record<string, unknown>;
    expect(draft.firstName).toBe('Alex');
    for (const key of [
      'gradeLevel',
      'studentId',
      'guardianName',
      'guardianEmail',
      'guardianPhone',
      'schoolAttestation',
    ]) {
      expect(draft, `${key} must not survive the switch`).not.toHaveProperty(key);
    }
  });

  it('carries a program pre-selection through the school switch', () => {
    // The program came from the marketing link, not from the school.
    search.current = new URLSearchParams('program=it-support');

    renderSchool();

    expect(
      screen.getByRole('link', { name: apply.schoolNotMineCta }).getAttribute('href')
    ).toBe('/api/apply/not-my-school?program=it-support');
  });
});
