import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DownloadMyDataButton from './DownloadMyDataButton';

describe('DownloadMyDataButton', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders the download button', () => {
    render(<DownloadMyDataButton />);
    expect(screen.getByRole('button', { name: /download my data/i })).toBeInTheDocument();
    expect(screen.getByText(/download a complete copy of your personal data/i)).toBeInTheDocument();
  });

  it('triggers download on click when API returns blob', async () => {
    const blob = new Blob(['{"data":"test"}'], { type: 'application/json' });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(blob),
    });

    const createElementSpy = vi.spyOn(document, 'createElement');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');

    render(<DownloadMyDataButton />);
    fireEvent.click(screen.getByRole('button', { name: /download my data/i }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/member/export-data');
    });

    await waitFor(() => {
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(clickSpy).toHaveBeenCalled();
    });
  });

  it('shows loading state while preparing download', async () => {
    let resolveResponse: (value: unknown) => void;
    const promise = new Promise((resolve) => { resolveResponse = resolve; });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(promise);

    render(<DownloadMyDataButton />);
    fireEvent.click(screen.getByRole('button', { name: /download my data/i }));

    expect(screen.getByText(/preparing download/i)).toBeInTheDocument();

    resolveResponse!({ ok: true, blob: () => Promise.resolve(new Blob(['test'])) });
  });

  it('shows error when API returns non-ok response', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Export not allowed' }),
    });

    render(<DownloadMyDataButton />);
    fireEvent.click(screen.getByRole('button', { name: /download my data/i }));

    await waitFor(() => {
      expect(screen.getByText('Export not allowed')).toBeInTheDocument();
    });
  });

  it('shows generic error when fetch throws', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

    render(<DownloadMyDataButton />);
    fireEvent.click(screen.getByRole('button', { name: /download my data/i }));

    await waitFor(() => {
      expect(screen.getByText(/download failed\. please try again/i)).toBeInTheDocument();
    });
  });
});
