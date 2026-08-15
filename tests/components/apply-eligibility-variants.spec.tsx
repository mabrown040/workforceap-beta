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

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
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
  'apply-graduation-year',
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
    expect(screen.queryByText(/is sponsoring my participation/i)).toBeNull();
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
  function renderSchool(partner = SCHOOL_PARTNER) {
    return render(<ApplyEligibilityClient variant="school" schoolPartner={partner} />);
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

  it('offers this year through this year + 4 for expected graduation', () => {
    renderSchool();
    const year = screen.getByLabelText(apply.schoolGraduationLabel) as HTMLSelectElement;
    const thisYear = new Date().getFullYear();
    expect(
      within(year)
        .getAllByRole('option')
        .map((o) => (o as HTMLOptionElement).value)
    ).toEqual(['', ...Array.from({ length: 5 }, (_, i) => String(thisYear + i))]);
  });

  it('names the partner school in the enrollment attestation', () => {
    renderSchool();
    expect(
      screen.getByText(
        'I am currently enrolled at Concordia High School and my school is sponsoring my participation.'
      )
    ).toBeInTheDocument();
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

  it('puts the under-18 band first and gives the age question school context', () => {
    const { container } = renderSchool();
    const ageGroup = screen.getByLabelText(apply.ageGroupLabel) as HTMLSelectElement;
    const values = within(ageGroup)
      .getAllByRole('option')
      .map((o) => (o as HTMLOptionElement).value);
    expect(values[1]).toBe('under_18');

    const hint = container.querySelector('#apply-age-group-hint');
    expect(hint?.textContent).toContain('Concordia High School');
    expect(ageGroup.getAttribute('aria-describedby')).toBe('apply-age-group-hint');
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

  it('keeps the barriers checklist, which feeds supportive services', () => {
    const { container } = renderSchool();
    expect(screen.getByText(apply.primaryBarriersLabel)).toBeInTheDocument();
    expect(container.querySelectorAll('input[name="primaryBarriers"]').length).toBeGreaterThan(0);
  });

  it('blocks continuing until the school questions are answered', () => {
    renderSchool();
    fillContact();
    fireEvent.click(screen.getByRole('button', { name: apply.continueToPrograms }));

    expect(push).not.toHaveBeenCalled();
    expect(screen.getByText(apply.errSchoolGrade)).toBeInTheDocument();
    expect(screen.getByText(apply.errSchoolGraduation)).toBeInTheDocument();
    expect(screen.getByText(apply.errSchoolAttestation)).toBeInTheDocument();
  });
});
