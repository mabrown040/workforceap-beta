import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Program } from '@/lib/content/programs';
import ProgramPicker from './ProgramPicker';

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => router,
}));

vi.mock('@/components/ProgramIcon', () => ({
  ProgramIcon: () => <span aria-hidden="true">Program icon</span>,
}));

function program(overrides: Partial<Program>): Program {
  return {
    slug: 'available-program',
    title: 'Available Program',
    category: 'business',
    categoryLabel: 'Business',
    categoryColor: 'var(--wa-info)',
    borderColor: 'var(--wa-info)',
    icon: 'Briefcase',
    duration: '160 hours',
    salary: 'Starting salary: $60K',
    skills: [],
    courses: [],
    partner: 'WorkforceAP',
    ...overrides,
  };
}

describe('ProgramPicker fresh assignment gates', () => {
  beforeEach(() => {
    router.push.mockReset();
    router.refresh.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps a migration-paused program visible but prevents fresh assignment', () => {
    render(
      <ProgramPicker
        programs={[
          program({
            slug: 'data-science-professional-certificate-ibm',
            title: 'Database Administrator (DBA) Professional Certificate (IBM)',
            curriculumMigrationPending: true,
          }),
        ]}
      />,
    );

    expect(
      screen.getByRole('heading', {
        name: 'Database Administrator (DBA) Professional Certificate (IBM)',
      }),
    ).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent(/applications remain open/i);
    expect(screen.getByRole('button', { name: 'Training activation pending' })).toBeDisabled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('still allows a non-paused program to be reviewed and assigned', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response);

    render(<ProgramPicker programs={[program({})]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Review selection' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm program' }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/dashboard'));
    expect(router.refresh).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith('/api/member/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ programSlug: 'available-program' }),
    });
  });
});
