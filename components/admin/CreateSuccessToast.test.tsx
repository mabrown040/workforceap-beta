import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CreateSuccessToast from '@/app/admin/members/[id]/CreateSuccessToast';

const navigation = vi.hoisted(() => ({
  params: new URLSearchParams(),
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: navigation.replace }),
  usePathname: () => '/admin/members/member-123',
  useSearchParams: () => navigation.params,
}));

describe('CreateSuccessToast', () => {
  beforeEach(() => {
    navigation.replace.mockReset();
    navigation.params = new URLSearchParams();
  });

  it('shows the normal success message when all setup steps finish', () => {
    navigation.params = new URLSearchParams({
      toast: 'created',
      email: 'student@example.org',
    });

    render(<CreateSuccessToast />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Member created for student@example.org. Welcome email sent.',
    );
  });

  it('makes a post-create resume failure explicit and directs staff to the existing member', () => {
    navigation.params = new URLSearchParams({
      toast: 'created-with-warnings',
      email: 'student@example.org',
      resumeError: 'Could not read that PDF.',
    });

    render(<CreateSuccessToast />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Member created for student@example.org.');
    expect(alert).toHaveTextContent('Resume was not attached: Could not read that PDF.');
    expect(alert).toHaveTextContent('do not create the member again');
  });

  it('reports a welcome email failure without implying the member creation failed', () => {
    navigation.params = new URLSearchParams({
      toast: 'created-with-warnings',
      email: 'student@example.org',
      welcomeError: 'Welcome email was not sent. Send the activation link manually.',
    });

    render(<CreateSuccessToast />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Member created for student@example.org.');
    expect(alert).toHaveTextContent('Welcome email was not sent.');
    expect(alert).not.toHaveTextContent('Welcome email sent.');
  });
});
