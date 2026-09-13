import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WorkforceApModuleCompleteButton from './WorkforceApModuleCompleteButton';

const mocks = vi.hoisted(() => ({ refresh: vi.fn(), fetch: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));

describe('WorkforceApModuleCompleteButton', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', mocks.fetch);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('records the exact local program and module without claiming provider completion', async () => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    render(
      <WorkforceApModuleCompleteButton
        courseSlug="digital-literacy-empowerment-class-course-6"
        programSlug="digital-literacy-empowerment-class"
        completed={false}
        label="Mark module complete in WorkforceAP"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mark module complete in WorkforceAP' }));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
    expect(mocks.fetch).toHaveBeenCalledWith('/api/member/courses/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseSlug: 'digital-literacy-empowerment-class-course-6',
        programSlug: 'digital-literacy-empowerment-class',
      }),
    });
    expect(screen.queryByText(/DigitalLearn.*complete/i)).not.toBeInTheDocument();
  });

  it('labels stored completion as a WorkforceAP record', () => {
    render(
      <WorkforceApModuleCompleteButton
        courseSlug="digital-literacy-empowerment-class-course-6"
        programSlug="digital-literacy-empowerment-class"
        completed
        completedLabel="Completed in WorkforceAP"
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Completed in WorkforceAP');
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
