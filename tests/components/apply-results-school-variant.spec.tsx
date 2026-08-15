/**
 * M9 — step 2 was telling every single school applicant they don't qualify.
 *
 * The school variant asks no funding questions, so its step-1 payload carries
 * no `qualifies`. `ApplyResultsClient` did `setQualifies(data.qualifies ===
 * true)`, which made that `false` for 100% of school applicants and rendered
 * "Your answers don't match our standard funding profile right now" — one
 * screen after their school's page told them their seat was sponsored. It also
 * fired `results_view` with `qualifies: false`, poisoning the same WIOA-fit
 * metric step 1 already tags with `variant` to protect.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import enMessages from '@/messages/en.json';

const trackApplyFunnel = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/apply/results',
}));

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const table = (enMessages as unknown as Record<string, Record<string, string>>)[namespace];
    const raw = table?.[key];
    return typeof raw === 'string' ? raw : `${namespace}.${key}`;
  },
}));

vi.mock('@/lib/analytics/events', () => ({ trackApplyFunnel }));

import ApplyResultsClient from '@/app/apply/results/ApplyResultsClient';
import { writeApplyEligibility } from '@/lib/apply/applyEligibilityStorage';

const apply = enMessages.apply as unknown as Record<string, string>;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
});

describe('ApplyResultsClient — school variant', () => {
  function seedSchoolPayload() {
    writeApplyEligibility({
      firstName: 'Alex',
      lastName: 'Prior',
      email: 'alex.prior@example.com',
      ageGroup: 'under_18',
      variant: 'school',
      schoolSlug: 'concordia-hs',
      gradeLevel: '11',
      // Deliberately no `qualifies` / `yesCount`: nothing was screened.
    });
  }

  it('never shows the funding-mismatch copy', () => {
    seedSchoolPayload();
    render(<ApplyResultsClient />);

    expect(screen.queryByText(apply.resultsMismatchStrong)).toBeNull();
    expect(screen.queryByText(apply.resultsMismatchRest)).toBeNull();
    expect(screen.queryByText(apply.resultsFoundationalTitle)).toBeNull();
    expect(screen.queryByText(apply.resultsTitleNonQual)).toBeNull();
  });

  it('does not claim they DO match the funding profile either', () => {
    // They were never screened; there is no verdict to report in either
    // direction.
    seedSchoolPayload();
    render(<ApplyResultsClient />);

    expect(screen.queryByText(apply.resultsFundingFitStrong)).toBeNull();
  });

  it('goes straight to program selection', () => {
    seedSchoolPayload();
    render(<ApplyResultsClient />);

    expect(screen.getByText(apply.resultsTitleSchool)).toBeInTheDocument();
    expect(screen.getByText(apply.resultsHintSchool)).toBeInTheDocument();
  });

  it('reports results_view with the variant instead of a false qualifies', () => {
    seedSchoolPayload();
    render(<ApplyResultsClient />);

    const resultsView = trackApplyFunnel.mock.calls.find((call) => call[1] === 'results_view');
    expect(resultsView).toBeDefined();
    expect(resultsView![2]).toEqual({ variant: 'school' });
    expect(resultsView![2]).not.toHaveProperty('qualifies');
  });
});

describe('ApplyResultsClient — organic applicants are unchanged', () => {
  it('still shows the mismatch copy and reports qualifies: false', () => {
    writeApplyEligibility({
      email: 'organic@example.com',
      q1: 'no',
      q2: 'no',
      qualifies: false,
      yesCount: 0,
    });

    render(<ApplyResultsClient />);

    expect(screen.getByText(apply.resultsMismatchStrong)).toBeInTheDocument();
    const resultsView = trackApplyFunnel.mock.calls.find((call) => call[1] === 'results_view');
    expect(resultsView![2]).toEqual({ qualifies: false });
  });

  it('still shows the funding-fit copy and reports qualifies: true', () => {
    writeApplyEligibility({
      email: 'organic@example.com',
      q1: 'yes',
      q2: 'no',
      qualifies: true,
      yesCount: 1,
    });

    render(<ApplyResultsClient />);

    expect(screen.getByText(apply.resultsFundingFitStrong)).toBeInTheDocument();
    const resultsView = trackApplyFunnel.mock.calls.find((call) => call[1] === 'results_view');
    expect(resultsView![2]).toEqual({ qualifies: true });
  });

  it('falls back to the missing-session screen when the payload has expired', () => {
    // The 7-day TTL now applies here too, so a long-abandoned payload no
    // longer resurrects somebody else's answers on a shared machine.
    localStorage.setItem(
      'apply_eligibility',
      JSON.stringify({
        email: 'organic@example.com',
        qualifies: true,
        savedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      })
    );

    render(<ApplyResultsClient />);

    expect(screen.getByText(apply.resultsMissingTitle)).toBeInTheDocument();
  });
});
