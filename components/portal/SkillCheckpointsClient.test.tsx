import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SkillCheckpointsClient from './SkillCheckpointsClient';
import { ALL_CHECKPOINT_PACKS } from '@/lib/content/checkpoints';

/**
 * Answering a checkpoint POSTs to /api/member/skill-checkpoints without
 * blocking the quiz. That save used to be fire-and-forget with the failure
 * swallowed, so a member whose checkpoint never reached their record only
 * found out on a later visit. A save that fails twice must now be announced.
 */

const pack = ALL_CHECKPOINT_PACKS[0];
const course = pack.courses[0];
const firstCheckpoint = course.checkpoints[0];

const ok = () => ({ ok: true, status: 200 }) as Response;
const serverError = () => ({ ok: false, status: 500 }) as Response;

async function answerFirstCheckpoint() {
  const user = userEvent.setup();
  render(<SkillCheckpointsClient userId="member-1" />);
  await user.click(screen.getByRole('button', { name: `Select ${pack.programTitle}` }));
  await user.click(screen.getByRole('button', { name: `Select ${course.courseName}` }));
  await user.click(screen.getByRole('button', { name: firstCheckpoint.options[0].text }));
  return user;
}

describe('SkillCheckpointsClient — checkpoint save feedback', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('tells the member when the checkpoint could not be saved after a retry', async () => {
    vi.mocked(fetch).mockResolvedValue(serverError());

    await answerFirstCheckpoint();

    const warning = await screen.findByTestId('checkpoint-save-warning');
    expect(warning).toHaveAttribute('role', 'status');
    expect(warning).toHaveTextContent("We couldn't save your latest answer");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenCalledWith(
      '/api/member/skill-checkpoints',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('stays quiet when the save succeeds', async () => {
    vi.mocked(fetch).mockResolvedValue(ok());

    await answerFirstCheckpoint();

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('checkpoint-save-warning')).toBeNull();
  });

  it('recovers silently when the first attempt drops but the retry lands', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(ok());

    await answerFirstCheckpoint();

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId('checkpoint-save-warning')).toBeNull();
  });
});
