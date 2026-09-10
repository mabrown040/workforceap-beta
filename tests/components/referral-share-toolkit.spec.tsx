import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot, type Root } from 'react-dom/client';
import ReferralShareCard from '@/app/(portal)/dashboard/points/ReferralShareCard';
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), write: vi.fn(), share: vi.fn(), track: vi.fn(), event: vi.fn() }));
vi.mock('@/lib/analytics/events', () => ({ trackMemberReferralShare: mocks.track }));
vi.mock('@/lib/events/client', () => ({ postMemberEvent: mocks.event }));
const data = { code: 'ABCD2345', sharePath: '/r/ABCD2345', rewardedCount: 2 };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const clipboardBefore = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
const shareBefore = Object.getOwnPropertyDescriptor(navigator, 'share');
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', mocks.fetch);
  mocks.fetch.mockResolvedValue(response(data));
  mocks.write.mockResolvedValue(undefined); mocks.share.mockResolvedValue(undefined); mocks.event.mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: mocks.write } });
  Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
});
afterEach(() => {
  cleanup(); vi.unstubAllGlobals();
  if (clipboardBefore) Object.defineProperty(navigator, 'clipboard', clipboardBefore); else Reflect.deleteProperty(navigator, 'clipboard');
  if (shareBefore) Object.defineProperty(navigator, 'share', shareBefore); else Reflect.deleteProperty(navigator, 'share');
});

describe('member referral sharing toolkit', () => {
  it.each([false, true])('hydrates its server loading markup before adding fetched controls (native share: %s)', async nativeShare => {
    let resolveRequest!: (value: Response) => void;
    mocks.fetch.mockImplementation(() => new Promise<Response>(resolve => { resolveRequest = resolve; }));
    Object.defineProperty(navigator, 'share', { configurable: true, value: nativeShare ? mocks.share : undefined });
    const markup = <main id="referral-hydration-fixture"><ReferralShareCard /></main>;
    const container = document.createElement('div');
    container.innerHTML = renderToString(markup);
    document.body.appendChild(container);
    const serverMain = container.firstElementChild;
    const serverCard = container.querySelector('section');
    const recoverableErrors = vi.fn();
    let root: Root | undefined;
    try {
      expect(container).toHaveTextContent('Loading your referral link');
      expect(container.querySelector('input,textarea')).toBeNull();
      expect(mocks.fetch).not.toHaveBeenCalled();
      await act(async () => { root = hydrateRoot(container, markup, { onRecoverableError: recoverableErrors }); });
      expect(container.firstElementChild).toBe(serverMain);
      expect(container.querySelector('section')).toBe(serverCard);
      expect(container).toHaveTextContent('Loading your referral link');
      await act(async () => { resolveRequest(response(data)); });
      expect(await screen.findByLabelText('Your referral link')).toHaveValue(`${window.location.origin}${data.sharePath}`);
      expect(container.firstElementChild).toBe(serverMain);
      expect(container.querySelector('section')).toBe(serverCard);
      expect(recoverableErrors).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: 'Share…' }) !== null).toBe(nativeShare);
    } finally {
      await act(async () => { root?.unmount(); });
      container.remove();
    }
  });

  it('keeps a load failure visible and retries successfully', async () => {
    mocks.fetch.mockResolvedValueOnce(response({}, 503)).mockResolvedValueOnce(response(data));
    render(<ReferralShareCard />);
    expect(await screen.findByRole('alert')).toHaveTextContent('could not load your referral link');
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading link' }));
    expect(await screen.findByLabelText('Your referral link')).toHaveValue(`${window.location.origin}${data.sharePath}`);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it.each([
    { ...data, sharePath: 'https://unexpected.example/path' },
    { ...data, rewardedCount: -1 },
    { rewardedCount: 1 },
  ])('does not offer sharing for malformed response %j', async body => {
    mocks.fetch.mockResolvedValue(response(body)); render(<ReferralShareCard />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy link' })).not.toBeInTheDocument();
  });
  it('shows a loading state while the API is pending', () => {
    mocks.fetch.mockImplementation(() => new Promise(() => {})); render(<ReferralShareCard />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading your referral link');
    expect(screen.queryByRole('button', { name: 'Copy link' })).not.toBeInTheDocument();
  });
  it('copies the private share link and records only the copy action', async () => {
    render(<ReferralShareCard />); fireEvent.click(await screen.findByRole('button', { name: 'Copy link' }));
    await waitFor(() => expect(mocks.write).toHaveBeenCalledWith(`${window.location.origin}/r/ABCD2345`));
    expect(await screen.findByText('Link copied.')).toBeInTheDocument();
    expect(mocks.track).toHaveBeenCalledWith('copy_link');
    expect(mocks.fetch.mock.calls.every(([, init]) => !init?.method || init.method === 'GET')).toBe(true);
  });
  it('copies a useful message without sending or promising a funded place or job', async () => {
    render(<ReferralShareCard />); fireEvent.click(await screen.findByRole('button', { name: 'Copy invitation message' }));
    expect(screen.getByLabelText('Invitation message')).not.toBeVisible();
    await waitFor(() => expect(mocks.write).toHaveBeenCalledOnce());
    const text = mocks.write.mock.calls[0][0];
    expect(text).toContain(`${window.location.origin}/r/ABCD2345`);
    expect(text).toContain('eligibility, funding and next steps');
    expect(text).not.toMatch(/guaranteed|free|150 points|100 points/i);
    expect(mocks.share).not.toHaveBeenCalled(); expect(mocks.event).not.toHaveBeenCalled();
  });
  it('makes a clipboard denial recoverable through manual selection', async () => {
    mocks.write.mockRejectedValue(new Error('Clipboard denied')); render(<ReferralShareCard />);
    fireEvent.click(await screen.findByRole('button', { name: 'Copy invitation message' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('copy it manually');
    const message = screen.getByLabelText('Invitation message') as HTMLTextAreaElement;
    expect(message).toBeVisible();
    fireEvent.focus(message);
    expect(message.selectionStart).toBe(0); expect(message.selectionEnd).toBe(message.value.length);
    expect(mocks.track).not.toHaveBeenCalled();
  });
  it('reveals the complete invitation for review without copying or sending', async () => {
    render(<ReferralShareCard />);
    await screen.findByLabelText('Your referral link');
    const message = screen.getByLabelText('Invitation message');
    expect(message).not.toBeVisible();
    fireEvent.click(screen.getByText('Preview invitation message'));
    expect(message).toBeVisible();
    expect((message as HTMLTextAreaElement).value).toContain(`${window.location.origin}/r/ABCD2345`);
    expect(mocks.write).not.toHaveBeenCalled();
    expect(mocks.share).not.toHaveBeenCalled();
    expect(mocks.event).not.toHaveBeenCalled();
  });
  it('offers native sharing only when available and treats cancellation quietly', async () => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: mocks.share });
    mocks.share.mockRejectedValue(new DOMException('Cancelled', 'AbortError'));
    render(<ReferralShareCard />); fireEvent.click(await screen.findByRole('button', { name: 'Share…' }));
    await waitFor(() => expect(mocks.share).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Share…' })).toBeEnabled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('Sharing completed.')).not.toBeInTheDocument();
  });
  it('provides copy fallback after a native-share error', async () => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: mocks.share });
    mocks.share.mockRejectedValue(new Error('Share unavailable'));
    render(<ReferralShareCard />); fireEvent.click(await screen.findByRole('button', { name: 'Share…' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Copy the link or invitation message instead');
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeEnabled();
  });
  it('shows only own aggregate rewards and explains limits without recipient data', async () => {
    mocks.fetch.mockResolvedValue(response({ ...data, recipients: [{ fullName: 'Private Learner', email: 'private@example.invalid', progress: 75 }] }));
    render(<ReferralShareCard />); await screen.findByLabelText('Your referral link');
    expect(screen.getByText(/recorded referral rewards/)).toHaveTextContent('2 recorded referral rewards');
    expect(screen.queryByText(/Private Learner|private@example.invalid/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Share…' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('How referral points work'));
    expect(screen.getByText(/staff-assisted enrollment may not record a reward/)).toBeInTheDocument();
  });
});
