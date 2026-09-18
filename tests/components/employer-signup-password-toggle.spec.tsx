import type { AnchorHTMLAttributes } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  vi.stubEnv('NEXT_PUBLIC_CAPTCHA_ENABLED', 'false');
});

vi.mock('next/link', () => ({
  default: ({ children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock('next/dynamic', () => ({ default: () => () => null }));

import EmployerSignupPage from '@/app/employers/signup/page';

afterEach(cleanup);
afterAll(() => {
  vi.unstubAllEnvs();
});

describe('employer signup password visibility toggle', () => {
  it('is in the tab order and toggles the password field from the keyboard', async () => {
    const user = userEvent.setup();
    render(<EmployerSignupPage />);

    const password = screen.getByLabelText(/^password/i);
    await user.type(password, 'Secret1A');
    expect(password).toHaveAttribute('type', 'password');

    await user.tab();
    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(toggle).toHaveFocus();
    expect(toggle).toHaveAttribute('type', 'button');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(toggle).not.toHaveAttribute('tabindex', '-1');

    await user.keyboard('{Enter}');
    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveFocus();

    await user.keyboard(' ');
    expect(password).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Show password' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Show password' })).toHaveFocus();
  });
});
