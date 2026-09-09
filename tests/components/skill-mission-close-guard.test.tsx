import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SkillMissionChallenge from '@/components/portal/SkillMissionChallenge';

const mission = {
  key: 'fixture:mission:1', courseSlug: 'fixture-course', programSlug: 'fixture-program', programTitle: 'Fixture program',
  courseTitle: 'Support', missionName: 'Support practice', missionTagline: 'Practice a support case', primaryAxis: 'Service',
  skillLabels: ['Troubleshooting'], scenarioPrompt: 'Describe your support process.', evidenceHint: 'Use concrete observations.',
  quizQuestions: [{ text: 'How do you start?', options: ['Ask questions', 'Guess', 'Ignore', 'Delete'] as [string, string, string, string] }],
  estimatedMinutes: 15, status: 'ready' as const, completedAt: null, latestResult: null, aiToolResultId: null,
};
beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('native practice close protection', () => {
  it('locks background scroll and restores each existing scroll-root style on unmount', () => {
    document.documentElement.style.overflowY = 'scroll';
    document.body.style.overflowY = 'hidden';
    const { unmount } = render(<SkillMissionChallenge mission={mission} onClose={vi.fn()} onComplete={vi.fn()} />);
    expect(document.documentElement.style.overflowY).toBe('hidden');
    expect(document.body.style.overflowY).toBe('hidden');
    unmount();
    expect(document.documentElement.style.overflowY).toBe('scroll');
    expect(document.body.style.overflowY).toBe('hidden');
    document.documentElement.style.overflowY = '';
    document.body.style.overflowY = '';
  });

  it('allows a clean intro to close without confirmation', async () => {
    const onClose = vi.fn(); const confirm = vi.spyOn(window, 'confirm');
    render(<SkillMissionChallenge mission={mission} onClose={onClose} onComplete={vi.fn()} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce(); expect(confirm).not.toHaveBeenCalled();
  });

  it('guards answered quiz work on Escape, close button and backdrop', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ correct: true, correctIndex: 0, explanation: 'Clarify the issue first.' }), { status: 200 }));
    const onClose = vi.fn(); const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<SkillMissionChallenge mission={mission} onClose={onClose} onComplete={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Accept mission' }));
    await userEvent.click(screen.getByRole('button', { name: /Ask questions/ }));
    await waitFor(() => expect(screen.getByText('Clarify the issue first.', { exact: false })).toBeInTheDocument());
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'Close mission' }));
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled(); expect(confirm).toHaveBeenCalledTimes(3);
    expect(screen.getByText('Clarify the issue first.', { exact: false })).toBeInTheDocument();
    confirm.mockReturnValue(true);
    await userEvent.click(screen.getByRole('button', { name: 'Close mission' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('preserves a written response when the member declines any close path', async () => {
    const onClose = vi.fn(); vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<SkillMissionChallenge mission={mission} initialPhase={2} onClose={onClose} onComplete={vi.fn()} />);
    const response = screen.getByRole('textbox', { name: 'Your scenario response' });
    fireEvent.change(response, { target: { value: 'I asked questions and checked the logs before proposing a change.' } });
    await userEvent.keyboard('{Escape}');
    fireEvent.click(screen.getByRole('dialog'));
    await userEvent.click(screen.getByRole('button', { name: 'Close mission' }));
    expect(onClose).not.toHaveBeenCalled();
    expect(response).toHaveValue('I asked questions and checked the logs before proposing a change.');
  });

  it('keeps an in-flight evaluation mounted and retains the response after failure', async () => {
    let resolve!: (response: Response) => void;
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>((done) => { resolve = done; }));
    const onClose = vi.fn(); const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<SkillMissionChallenge mission={mission} initialPhase={2} onClose={onClose} onComplete={vi.fn()} />);
    const response = screen.getByRole('textbox', { name: 'Your scenario response' });
    fireEvent.change(response, { target: { value: 'I gathered the facts and documented my diagnostic sequence.' } });
    await userEvent.click(screen.getByRole('button', { name: 'Submit for coaching' }));
    expect(response).toBeDisabled();
    await userEvent.keyboard('{Escape}'); fireEvent.click(screen.getByRole('dialog'));
    await userEvent.click(screen.getByRole('button', { name: 'Close mission' }));
    expect(onClose).not.toHaveBeenCalled(); expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByText('Your practice is still being reviewed. Please wait for the result before closing.')).toBeInTheDocument();
    const unloading = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(unloading);
    expect(unloading.defaultPrevented).toBe(true);
    await act(async () => resolve(new Response(JSON.stringify({ ok: false, error: 'Coaching unavailable. Try again.' }), { status: 503 })));
    await waitFor(() => expect(response).toBeEnabled());
    expect(response).toHaveValue('I gathered the facts and documented my diagnostic sequence.');
    expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent('Coaching unavailable. Try again.');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('allows a successfully saved result to close without a discard prompt', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ ok: true, verdict: 'passed', coachingNote: 'Clear reasoning.', starStory: 'A practice example.', resumeBullet: 'Documented a sample investigation.', skillsUnlocked: ['Troubleshooting'], quizCorrectCount: 3, aiToolResultId: 'fixture-result' }), { status: 200 }));
    const onClose = vi.fn(); const confirm = vi.spyOn(window, 'confirm');
    render(<SkillMissionChallenge mission={mission} initialPhase={2} onClose={onClose} onComplete={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Your scenario response' }), { target: { value: 'I reviewed the logs and documented a diagnostic sequence.' } });
    await userEvent.click(screen.getByRole('button', { name: 'Submit for coaching' }));
    await waitFor(() => expect(screen.getByText('Clear reasoning.')).toBeInTheDocument());
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce(); expect(confirm).not.toHaveBeenCalled();
  });
});
