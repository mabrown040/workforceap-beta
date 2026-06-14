import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ShareButton } from './ShareButton';

const sharePayload = {
  url: 'https://workforceap.org/programs',
  title: 'WorkforceAP Programs',
  text: 'Career training at no cost to members',
};

function setNavigatorMethod<K extends 'share' | 'clipboard'>(key: K, value: Navigator[K] | undefined) {
  Object.defineProperty(navigator, key, {
    configurable: true,
    value,
  });
}

describe('ShareButton', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    setNavigatorMethod('share', undefined);
    setNavigatorMethod('clipboard', undefined);
  });

  it('opens the native share sheet when the Web Share API is available', async () => {
    const share = vi.fn<Navigator['share']>().mockResolvedValue(undefined);
    const writeText = vi.fn<Clipboard['writeText']>().mockResolvedValue(undefined);
    setNavigatorMethod('share', share);
    setNavigatorMethod('clipboard', { writeText } as unknown as Clipboard);

    render(<ShareButton {...sharePayload} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /share workforceap programs/i }));
      await Promise.resolve();
    });

    expect(share).toHaveBeenCalledWith(sharePayload);
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /share workforceap programs/i })).toBeInTheDocument();
  });

  it('copies the URL and shows a temporary copied indicator when native share is unavailable', async () => {
    const writeText = vi.fn<Clipboard['writeText']>().mockResolvedValue(undefined);
    setNavigatorMethod('share', undefined);
    setNavigatorMethod('clipboard', { writeText } as unknown as Clipboard);

    render(<ShareButton {...sharePayload} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /share workforceap programs/i }));
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith(sharePayload.url);
    expect(screen.getByText('Link copied!')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2100);
    });

    expect(screen.queryByText('Link copied!')).not.toBeInTheDocument();
  });

  it('falls back to copying the URL when the native share sheet is cancelled', async () => {
    const share = vi.fn<Navigator['share']>().mockRejectedValue(new DOMException('Share cancelled', 'AbortError'));
    const writeText = vi.fn<Clipboard['writeText']>().mockResolvedValue(undefined);
    setNavigatorMethod('share', share);
    setNavigatorMethod('clipboard', { writeText } as unknown as Clipboard);

    render(<ShareButton {...sharePayload} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /share workforceap programs/i }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(share).toHaveBeenCalledWith(sharePayload);
    expect(writeText).toHaveBeenCalledWith(sharePayload.url);
    expect(screen.getByText('Link copied!')).toBeInTheDocument();
  });
});
