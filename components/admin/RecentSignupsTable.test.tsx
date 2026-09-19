import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getProgramBySlug } from '@/lib/content/programs';
import RecentSignupsTable from './RecentSignupsTable';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const user = (id: string, enrolledProgram: string | null) => ({
  id,
  fullName: `Member ${id}`,
  email: `${id}@example.test`,
  enrolledProgram,
  enrolledAt: '2026-09-01T00:00:00Z',
  assessmentScorePct: null,
  assessmentCompleted: false,
});

describe('RecentSignupsTable program column', () => {
  it('humanises a program key the catalog does not know instead of printing the raw slug', () => {
    render(<RecentSignupsTable users={[user('u1', 'cybersecurity-google'), user('u2', null)]} />);
    expect(screen.getByText('Cybersecurity Google')).toBeInTheDocument();
    expect(screen.queryByText('cybersecurity-google')).toBeNull();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows the AWS catalog title for the legacy IBM alias', () => {
    const aws = getProgramBySlug('ai-practitioner-professional-certificate-aws');
    expect(aws).toBeTruthy();
    render(<RecentSignupsTable users={[user('u3', 'ai-professional-developer-certificate-ibm')]} />);
    expect(screen.getByText(aws!.title)).toBeInTheDocument();
  });
});
