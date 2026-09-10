import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CounselorNotesPanel from '@/app/(portal)/counselor/students/[memberId]/CounselorNotesPanel';
import AdvisorSessionNotesPanel from '@/app/(portal)/counselor/students/[memberId]/AdvisorSessionNotesPanel';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

vi.mock('@/lib/fetchWithTimeout', () => ({ fetchWithTimeout: vi.fn() }));
vi.mock('@/components/admin/ConfirmDialog', () => ({ default: () => null }));
const response = (data: unknown, ok = true) => ({ ok, json: async () => data }) as Response;
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const note = { id: 'saved-1', content: 'Original note', createdAt: '2026-09-09T19:00:00Z', author: { fullName: 'Counselor', email: 'synthetic@example.test' } };

for (const [label, Component] of [['Counselor note', CounselorNotesPanel], ['Session note', AdvisorSessionNotesPanel]] as const) {
  describe(`${label} save safety`, () => {
    beforeEach(() => vi.mocked(fetchWithTimeout).mockReset().mockResolvedValue(response([])));
    afterEach(cleanup);
    async function open() {
      render(<Component memberId="member-1" />);
      await act(async () => {});
      fireEvent.click(screen.getByRole('button', { name: '+ Add Note' }));
      fireEvent.change(screen.getByRole('textbox', { name: label }), { target: { value: 'Original note' } });
    }
    it('keeps newer edits after an earlier draft finishes saving', async () => {
      await open();
      const pending = deferred<Response>();
      vi.mocked(fetchWithTimeout).mockReturnValueOnce(pending.promise);
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
      fireEvent.change(screen.getByRole('textbox', { name: label }), { target: { value: 'Original note\nNew follow-up' } });
      await act(async () => pending.resolve(response(note)));
      expect(screen.getByRole('textbox', { name: label })).toHaveValue('Original note\nNew follow-up');
      expect(screen.getByRole('status')).toHaveTextContent('Your newer edits are still unsaved');
      expect(screen.getByText('Original note')).toBeInTheDocument();
      const saveOptions = vi.mocked(fetchWithTimeout).mock.calls[1][1];
      expect(JSON.parse(String(saveOptions?.body))).toEqual({ content: 'Original note' });
    });
    it('clears the submitted revision only when no further edit occurred', async () => {
      await open();
      vi.mocked(fetchWithTimeout).mockResolvedValueOnce(response(note));
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await act(async () => {});
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Note saved.');
    });
    it('preserves exact draft after a failed save and permits retry', async () => {
      await open();
      fireEvent.change(screen.getByRole('textbox', { name: label }), { target: { value: '  Keep my\nfollow-up  ' } });
      vi.mocked(fetchWithTimeout).mockRejectedValueOnce(new Error('Connection lost'));
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await act(async () => {});
      expect(screen.getByRole('textbox', { name: label })).toHaveValue('  Keep my\nfollow-up  ');
      expect(screen.getByRole('alert')).toHaveTextContent('Connection lost');
      expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    });
    it('does not let a late initial read remove the saved note', async () => {
      const initial = deferred<Response>();
      vi.mocked(fetchWithTimeout).mockReturnValueOnce(initial.promise);
      render(<Component memberId="member-1" />);
      fireEvent.click(screen.getByRole('button', { name: '+ Add Note' }));
      fireEvent.change(screen.getByRole('textbox', { name: label }), { target: { value: 'Original note' } });
      vi.mocked(fetchWithTimeout).mockResolvedValueOnce(response(note));
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await act(async () => {});
      await act(async () => initial.resolve(response([])));
      expect(screen.getByText('Original note')).toBeInTheDocument();
    });
    it('retries a failed initial read without discarding a draft', async () => {
      vi.mocked(fetchWithTimeout).mockResolvedValueOnce(response({}, false));
      await open();
      vi.mocked(fetchWithTimeout).mockResolvedValueOnce(response([]));
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
      await act(async () => {});
      expect(screen.getByRole('textbox', { name: label })).toHaveValue('Original note');
      expect(screen.queryByText('Couldn’t load notes.')).not.toBeInTheDocument();
    });
  });
}
