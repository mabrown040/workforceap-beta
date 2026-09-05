import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProgramCourse } from '@/lib/content/programs';
import TrainingCourseList from './TrainingCourseList';

const mocks = vi.hoisted(() => ({ refresh: vi.fn(), announce: vi.fn(), fetch: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock('@/components/portal/kit/hooks/useAnnounce', () => ({ useAnnounce: () => mocks.announce }));
vi.mock('@/components/portal/TrackedCourseraLaunchLink', () => ({
  default: ({ children, courseSlug: _courseSlug, ...props }: {
    href: string; children: ReactNode; courseSlug: string; 'aria-label'?: string;
  }) => <a {...props}>{children}</a>,
}));

const courses: ProgramCourse[] = [
  { slug: 'course-one', name: 'First course', estimatedHours: 10, courseraCourseId: 'course-id-one' },
  { slug: 'course-two', name: 'Second course', estimatedHours: 10, courseraCourseId: 'course-id-two' },
];

function showCourses(approved = true) {
  return render(<TrainingCourseList courses={courses} programSlug="program-one"
    completedSlugs={[]} eligibilityApproved={approved} />);
}

function enrollFirst() {
  fireEvent.click(screen.getByRole('button', { name: 'Enroll in this course: First course' }));
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('TrainingCourseList enrollment feedback', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', mocks.fetch);
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('keeps enrollment pending until the provider response and then exposes only the accepted course launch', async () => {
    let resolve!: (value: Response) => void;
    mocks.fetch.mockReturnValue(new Promise<Response>((done) => { resolve = done; }));
    showCourses();
    enrollFirst();
    expect(screen.getByRole('button', { name: 'Enrolling in First course' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Enroll in this course: Second course' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Enrolling in First course' }));
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('link', { name: /Continue in Coursera:/ })).not.toBeInTheDocument();
    await act(async () => resolve(response({ status: 'enrolled', sync: { status: 'requested' } })));
    expect(await screen.findByText(/Coursera accepted your enrollment\. A progress refresh has been requested/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue in Coursera: First course (opens in a new tab)' }))
      .toHaveAttribute('href', '/api/member/coursera/launch?course=course-one');
    expect(screen.queryByRole('button', { name: 'Enroll in this course: First course' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enroll in this course: Second course' })).toBeEnabled();
    expect(screen.getAllByText('0% complete')).toHaveLength(2);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(mocks.announce).toHaveBeenCalledWith(expect.stringContaining('progress refresh has been requested'), 'polite');
  });

  it.each(['enrolled', 'membership-created-and-enrolled'])(
    'preserves %s acceptance and launches when refresh could not start', async (status) => {
      mocks.fetch.mockResolvedValue(response({ status, sync: { status: 'failed_to_start' } }));
      showCourses();
      enrollFirst();
      expect(await screen.findByText(/accepted your enrollment, but we couldn.t start the progress refresh/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Continue in Coursera: First course/ })).toBeInTheDocument();
      expect(mocks.refresh).toHaveBeenCalledTimes(1);
    },
  );

  it('recognizes already-enrolled without claiming a new refresh was requested', async () => {
    mocks.fetch.mockResolvedValue(response({ status: 'already-enrolled', sync: { status: 'not_requested' } }));
    showCourses(); enrollFirst();
    expect(await screen.findByText(/Coursera reports you.re already enrolled/)).toBeInTheDocument();
    expect(screen.queryByText(/refresh has been requested/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Continue in Coursera: First course/ })).toBeInTheDocument();
  });

  it('supports a recognized older success response without inventing sync success', async () => {
    mocks.fetch.mockResolvedValue(response({ status: 'enrolled', message: 'Enrolled! Refresh to see progress.' }));
    showCourses(); enrollFirst();
    expect(await screen.findByText(/Coursera accepted your enrollment\. Progress updates may take a few minutes/)).toBeInTheDocument();
    expect(screen.queryByText(/refresh has been requested|synced|synchronized/i)).not.toBeInTheDocument();
  });

  it.each([{}, { status: 'queued' }, null])('does not turn an unrecognized HTTP 200 payload into enrollment success: %j', async (payload) => {
    mocks.fetch.mockResolvedValue(response(payload));
    showCourses(); enrollFirst();
    expect(await screen.findByText(/We couldn.t confirm the enrollment result/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enroll in this course: First course' })).toBeEnabled();
    expect(screen.queryByRole('link', { name: /Continue in Coursera:/ })).not.toBeInTheDocument();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it('keeps an invitation distinct from course enrollment', async () => {
    mocks.fetch.mockResolvedValue(response({ status: 'invited', sync: { status: 'not_requested' } }));
    showCourses(); enrollFirst();
    expect(await screen.findByRole('dialog', { name: 'Check your email' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enroll in this course: First course' })).toBeEnabled();
    expect(mocks.refresh).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps a provider rejection retryable without changing course state', async () => {
    mocks.fetch.mockResolvedValue(response({ code: 'B4B_FAILURE', error: 'Coursera is temporarily unavailable.' }, 502));
    showCourses(); enrollFirst();
    expect(await screen.findByText('Coursera is temporarily unavailable.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enroll in this course: First course' })).toBeEnabled();
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(mocks.announce).toHaveBeenCalledWith('Coursera is temporarily unavailable.', 'assertive');
  });

  it('retains the funding lock and never starts an enrollment request for an unapproved member', () => {
    showCourses(false);
    expect(screen.getAllByText(/Enrollment locked/)).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /Enroll in this course:/ })).not.toBeInTheDocument();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('retains confirmed access while same-program props lag without sharing acceptance across programs', async () => {
    mocks.fetch.mockResolvedValue(response({ status: 'enrolled', sync: { status: 'requested' } }));
    const view = showCourses();
    enrollFirst();
    await screen.findByRole('link', { name: /Continue in Coursera: First course/ });

    view.rerender(<TrainingCourseList courses={courses} programSlug="program-one"
      completedSlugs={[]} enrolledCourseraCourseIds={[]} eligibilityApproved />);
    expect(screen.getByRole('link', { name: /Continue in Coursera: First course/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enroll in this course: First course' })).not.toBeInTheDocument();
    expect(screen.getAllByText('0% complete')).toHaveLength(2);

    view.rerender(<TrainingCourseList courses={courses} programSlug="program-two"
      completedSlugs={[]} enrolledCourseraCourseIds={[]} eligibilityApproved />);
    expect(screen.getByRole('button', { name: 'Enroll in this course: First course' })).toBeEnabled();
    expect(screen.queryByRole('link', { name: /Continue in Coursera: First course/ })).not.toBeInTheDocument();
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it('leaves a network failure retryable and sends only the explicitly requested course on retry', async () => {
    mocks.fetch.mockRejectedValueOnce(new Error('connection interrupted'))
      .mockResolvedValueOnce(response({ status: 'enrolled', sync: { status: 'requested' } }));
    showCourses();
    enrollFirst();
    expect(await screen.findByText('Could not reach the server. Check your connection and try again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enroll in this course: First course' })).toBeEnabled();
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(mocks.fetch).toHaveBeenCalledTimes(1);

    enrollFirst();
    await screen.findByRole('link', { name: /Continue in Coursera: First course/ });
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    for (const [url, init] of mocks.fetch.mock.calls) {
      expect(url).toBe('/api/member/coursera/enroll-in-course');
      expect(init).toMatchObject({ method: 'POST', body: JSON.stringify({ courseraCourseId: 'course-id-one' }) });
    }
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Enroll in this course: Second course' })).toBeEnabled();
  });

  it('preserves the independent mark-complete action after accepted enrollment', async () => {
    mocks.fetch.mockResolvedValueOnce(response({ status: 'enrolled', sync: { status: 'requested' } }))
      .mockResolvedValueOnce(response({ ok: true }));
    showCourses(); enrollFirst();
    await screen.findByRole('link', { name: /Continue in Coursera: First course/ });
    fireEvent.click(screen.getByRole('button', { name: 'Mark First course complete' }));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(2));
    expect(mocks.fetch).toHaveBeenLastCalledWith('/api/member/courses/complete', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ courseSlug: 'course-one', programSlug: 'program-one' }),
    }));
  });

  it.each([false, true])('hands focused enrollment to its accepted launch link (native disabled blur: %s)', async (nativeBlur) => {
    let resolve!: (value: Response) => void;
    mocks.fetch.mockReturnValue(new Promise<Response>((done) => { resolve = done; }));
    showCourses();
    const trigger = screen.getByRole('button', { name: 'Enroll in this course: First course' });
    trigger.focus();
    enrollFirst();
    expect(trigger).toBeDisabled();
    // Browsers can drop focus onto body when a focused button is disabled;
    // jsdom does not do so automatically, so model that native blur explicitly.
    if (nativeBlur) {
      // jsdom also refuses .blur() on an already-disabled element. Restore
      // the disabled DOM property immediately after modeling the focus loss.
      (trigger as HTMLButtonElement).disabled = false;
      trigger.blur();
      (trigger as HTMLButtonElement).disabled = true;
      expect(document.body).toHaveFocus();
    }
    await act(async () => resolve(response({ status: 'enrolled', sync: { status: 'requested' } })));
    expect(screen.getByRole('link', { name: /Continue in Coursera: First course/ })).toHaveFocus();
  });

  it('does not steal focus when the member moved to another control while enrollment was pending', async () => {
    let resolve!: (value: Response) => void;
    mocks.fetch.mockReturnValue(new Promise<Response>((done) => { resolve = done; }));
    showCourses();
    screen.getByRole('button', { name: 'Enroll in this course: First course' }).focus();
    enrollFirst();
    const otherControl = screen.getByRole('button', { name: 'Mark Second course complete' });
    otherControl.focus();
    expect(otherControl).toHaveFocus();
    await act(async () => resolve(response({ status: 'enrolled', sync: { status: 'requested' } })));
    expect(otherControl).toHaveFocus();
    expect(screen.getByRole('link', { name: /Continue in Coursera: First course/ })).not.toHaveFocus();
  });

  it('does not restore focus after a deliberate focus move even if that other control later blurs', async () => {
    let resolve!: (value: Response) => void;
    mocks.fetch.mockReturnValue(new Promise<Response>((done) => { resolve = done; }));
    showCourses();
    screen.getByRole('button', { name: 'Enroll in this course: First course' }).focus();
    enrollFirst();
    const otherControl = screen.getByRole('button', { name: 'Mark Second course complete' });
    otherControl.focus();
    otherControl.blur();
    expect(document.body).toHaveFocus();
    await act(async () => resolve(response({ status: 'enrolled', sync: { status: 'requested' } })));
    expect(document.body).toHaveFocus();
  });

  it('cancels the focus handoff if the program changed before the response arrived', async () => {
    let resolve!: (value: Response) => void;
    mocks.fetch.mockReturnValue(new Promise<Response>((done) => { resolve = done; }));
    const view = showCourses();
    const addListener = vi.spyOn(document, 'addEventListener');
    const removeListener = vi.spyOn(document, 'removeEventListener');
    screen.getByRole('button', { name: 'Enroll in this course: First course' }).focus();
    enrollFirst();
    const focusListener = addListener.mock.calls.find(([type]) => type === 'focusin')?.[1];
    expect(focusListener).toBeDefined();
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    view.rerender(<TrainingCourseList courses={courses} programSlug="program-two"
      completedSlugs={[]} eligibilityApproved />);
    expect(removeListener).toHaveBeenCalledWith('focusin', focusListener);
    await act(async () => resolve(response({ status: 'enrolled', sync: { status: 'requested' } })));
    expect(focus).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Enroll in this course: First course' })).toBeEnabled();
  });

  it('cancels the focus handoff when the course list unmounts before acceptance', async () => {
    let resolve!: (value: Response) => void;
    mocks.fetch.mockReturnValue(new Promise<Response>((done) => { resolve = done; }));
    const view = showCourses();
    const addListener = vi.spyOn(document, 'addEventListener');
    const removeListener = vi.spyOn(document, 'removeEventListener');
    screen.getByRole('button', { name: 'Enroll in this course: First course' }).focus();
    enrollFirst();
    const focusListener = addListener.mock.calls.find(([type]) => type === 'focusin')?.[1];
    expect(focusListener).toBeDefined();
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    view.unmount();
    expect(removeListener).toHaveBeenCalledWith('focusin', focusListener);
    await act(async () => resolve(response({ status: 'enrolled', sync: { status: 'requested' } })));
    expect(focus).not.toHaveBeenCalled();
  });
});
