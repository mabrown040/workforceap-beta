import type { AnchorHTMLAttributes, ImgHTMLAttributes, ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import messages from '@/messages/en.json';

const navigation = vi.hoisted(() => ({
  pathname: '/en/login',
  search: new URLSearchParams(),
  push: vi.fn(),
}));
const auth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  verifyOtp: vi.fn(),
  updateUser: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => navigation.search,
  useRouter: () => ({ push: navigation.push }),
}));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));
vi.mock('next/image', () => ({
  // Keep the image's accessible name without loading Next's image optimizer in jsdom.
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt, fill: _fill, priority: _priority, ...props }: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean }) => <img alt={alt} {...props} />,
}));
vi.mock('@/lib/auth/client', () => ({ createSupabaseBrowserClient: () => ({ auth }) }));

import LoginForm from '@/app/(auth)/login/LoginForm';
import ForgotPasswordPage from '@/app/(auth)/forgot-password/page';
import ResetPasswordPage from '@/app/(auth)/reset-password/page';

const fetchMock = vi.fn<typeof fetch>();
const trainingTarget = '/dashboard/learning/modules/it-support-lab?program=it-support-professional-certificate-ibm#practice';

function mount(ui: ReactNode) {
  return render(<NextIntlClientProvider locale="en" messages={messages} timeZone="America/New_York">{ui}</NextIntlClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  navigation.pathname = '/en/login';
  navigation.search = new URLSearchParams({ redirectTo: trainingTarget });
  auth.verifyOtp.mockResolvedValue({ error: null });
  auth.updateUser.mockResolvedValue({ error: null });
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('returning to selected training through authentication', () => {
  it.each([
    trainingTarget,
    '/es/dashboard/program?tab=schedule#week-2',
    '/dashboard?tab=training',
  ])('keeps member navigation selected and the exact destination for %s', (target) => {
    mount(<LoginForm initialRedirectTo={target} />);
    const destinations = within(screen.getByRole('navigation', { name: 'Choose portal destination after sign-in' }));
    expect(destinations.getByRole('link', { name: 'Member' })).toHaveAttribute('aria-current', 'true');
    expect(destinations.getByRole('link', { name: 'Member' })).toHaveAttribute('href', `/en/login?redirectTo=${encodeURIComponent(target)}`);
    expect(destinations.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
    expect(destinations.getByRole('button', { name: 'Staff login' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', `/en/forgot-password?redirectTo=${encodeURIComponent(target)}`);
    expect(screen.getByRole('link', { name: 'Get started →' })).toHaveAttribute('href', `/en/signup?redirectTo=${encodeURIComponent(target)}`);
  });

  it('recognizes a staff subpage without replacing its destination with the portal root', () => {
    const target = '/es/counselor/members/member-id?tab=training';
    mount(<LoginForm initialRedirectTo={target} />);
    const destinations = within(screen.getByRole('navigation', { name: 'Choose portal destination after sign-in' }));
    expect(destinations.getByRole('link', { name: 'Counselor' })).toHaveAttribute('aria-current', 'true');
    expect(destinations.getByRole('link', { name: 'Counselor' })).toHaveAttribute('href', `/en/login?redirectTo=${encodeURIComponent(target)}`);
    expect(destinations.getByRole('link', { name: 'Member' })).not.toHaveAttribute('aria-current');
  });

  it('sends the selected destination with recovery and preserves both return links', async () => {
    navigation.pathname = '/en/forgot-password';
    fetchMock.mockResolvedValueOnce(Response.json({ success: true }));
    mount(<ForgotPasswordPage />);
    const expectedHref = `/en/login?redirectTo=${encodeURIComponent(trainingTarget)}`;
    expect(screen.getByRole('link', { name: 'Back to login' })).toHaveAttribute('href', expectedHref);
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'learner@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeVisible();
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toEqual({ email: 'learner@example.test', redirectTo: trainingTarget });
    expect(screen.getByRole('link', { name: 'Back to login' })).toHaveAttribute('href', expectedHref);
  });

  it('keeps the destination when an expired reset link needs replacement', async () => {
    navigation.pathname = '/en/reset-password';
    navigation.search.set('token_hash', 'expired-token');
    navigation.search.set('type', 'recovery');
    auth.verifyOtp.mockResolvedValueOnce({ error: { message: 'Expired' } });
    mount(<ResetPasswordPage />);
    expect(await screen.findByRole('link', { name: 'Request a new reset link' })).toHaveAttribute('href', `/en/forgot-password?redirectTo=${encodeURIComponent(trainingTarget)}`);
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it('returns to the exact course after a valid recovery token and password update', async () => {
    navigation.pathname = '/en/reset-password';
    navigation.search.set('token_hash', 'valid-token');
    navigation.search.set('type', 'recovery');
    mount(<ResetPasswordPage />);
    await screen.findByRole('heading', { name: 'Set new password' });
    expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: 'valid-token', type: 'recovery' });
    expect(screen.getByRole('link', { name: 'Back to login' })).toHaveAttribute('href', `/en/login?redirectTo=${encodeURIComponent(trainingTarget)}`);
    fireEvent.change(screen.getByLabelText(/New password \*/), { target: { value: 'New-example-123' } });
    fireEvent.change(screen.getByLabelText(/Confirm new password/), { target: { value: 'New-example-123' } });
    vi.useFakeTimers();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save new password' })); });
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'New-example-123' });
    expect(navigation.push).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(navigation.push).toHaveBeenCalledWith(trainingTarget);
  });

  it('replaces an unsafe destination before sending recovery or creating return links', async () => {
    navigation.pathname = '/en/forgot-password';
    navigation.search.set('redirectTo', '//outside.example/collect');
    fetchMock.mockResolvedValueOnce(Response.json({ success: true }));
    mount(<ForgotPasswordPage />);
    expect(screen.getByRole('link', { name: 'Back to login' })).toHaveAttribute('href', '/en/login?redirectTo=%2Fdashboard');
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'learner@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string).redirectTo).toBe('/dashboard');
  });
});
