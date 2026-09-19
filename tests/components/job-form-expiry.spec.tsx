import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/lib/analytics/events', () => ({ trackFunnelEvent: vi.fn() }));
vi.mock('@/components/employer/SuggestedProgramsRanked', () => ({ default: () => null }));

import JobForm from '@/components/employer/JobForm';

const fetchMock = vi.fn<typeof fetch>();

describe('JobForm expiry date handling', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('submits the END of the chosen day in Central time so the board hides the job after that date', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 'job-1' }), { status: 200, headers: { 'content-type': 'application/json' } }));
    render(<JobForm companyName="Fixture Co" programSlugs={[]} />);

    fireEvent.change(screen.getByLabelText(/Job Title/i), { target: { value: 'Fixture Role' } });
    fireEvent.change(screen.getByLabelText(/Job Description/i), { target: { value: 'Fixture description' } });
    fireEvent.change(screen.getByLabelText(/Expires At/i), { target: { value: '2026-09-30' } });
    fireEvent.submit(screen.getByLabelText(/Expires At/i).closest('form') as HTMLFormElement);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as { expiresAt: string };
    const stored = Date.parse(body.expiresAt);
    // Old behaviour: 2026-09-30T00:00:00Z, i.e. 7 PM Central on Sep 29 — already hidden the evening before.
    expect(stored).toBeGreaterThanOrEqual(Date.parse('2026-10-01T04:59:59Z'));
    expect(stored).toBeLessThan(Date.parse('2026-10-01T05:00:00Z'));
  });

  it('shows the chosen calendar day when editing a job whose expiry is stored as end-of-day Central', () => {
    render(
      <JobForm
        companyName="Fixture Co"
        programSlugs={[]}
        job={{
          id: 'job-1',
          title: 'Fixture Role',
          locationType: 'onsite',
          jobType: 'fulltime',
          description: 'Fixture description',
          requirements: [],
          preferredCertifications: [],
          suggestedPrograms: [],
          status: 'draft',
          expiresAt: '2026-10-01T04:59:59.999Z',
        }}
      />,
    );
    expect(screen.getByLabelText(/Expires At/i)).toHaveValue('2026-09-30');
  });
});
