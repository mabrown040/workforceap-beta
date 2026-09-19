import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CourseraProgressCoverageNotice from '@/components/portal/CourseraProgressCoverageNotice';
import RefreshCourseraProgressButton from '@/components/portal/RefreshCourseraProgressButton';

const refresh = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('next-intl', () => ({ useTranslations: () => () => 'Connection failed. Try again.' }));
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  refresh.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Coursera refresh coverage feedback', () => {
  it.each(['capped', 'unavailable'])('shows safe partial feedback after a successful %s response', async (coverage) => {
    fetchMock.mockResolvedValue(Response.json({ coverage, complete: false, message: 'private provider debug text' }));
    render(<RefreshCourseraProgressButton />);
    fireEvent.click(screen.getByRole('button', { name: /Refresh from Coursera/ }));
    expect(await screen.findByRole('status')).toHaveTextContent('partial update');
    expect(screen.getByRole('status')).toHaveTextContent('available course records');
    expect(screen.queryByText(/private provider debug text/)).not.toBeInTheDocument();
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  });

  it('clears the partial notice when the next refresh is complete', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ coverage: 'capped', complete: false }));
    render(<RefreshCourseraProgressButton />);
    fireEvent.click(screen.getByRole('button', { name: /Refresh from Coursera/ }));
    await screen.findByRole('status');
    await waitFor(() => expect(screen.getByRole('button')).not.toBeDisabled());
    fetchMock.mockResolvedValueOnce(Response.json({ coverage: 'complete', complete: true }));
    fireEvent.click(screen.getByRole('button', { name: /Refresh from Coursera/ }));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('keeps failed refreshes as errors and does not refresh the route', async () => {
    fetchMock.mockResolvedValue(Response.json({ coverage: 'unavailable', error: 'Progress is temporarily unavailable.' }, { status: 502 }));
    render(<RefreshCourseraProgressButton />);
    fireEvent.click(screen.getByRole('button', { name: /Refresh from Coursera/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Progress is temporarily unavailable.');
    expect(refresh).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('My Program provider coverage notice', () => {
  it.each(['capped', 'unavailable'] as const)('labels %s provider reads without hiding course facts', (coverage) => {
    render(<><CourseraProgressCoverageNotice coverage={coverage} /><p>Program progress: 37%</p></>);
    expect(screen.getByRole('status')).toHaveTextContent('Progress shown uses available course records.');
    expect(screen.getByText('Program progress: 37%')).toBeInTheDocument();
  });

  it.each(['complete', 'unknown', undefined] as const)('does not claim an incomplete read for %s', (coverage) => {
    render(<CourseraProgressCoverageNotice coverage={coverage} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
