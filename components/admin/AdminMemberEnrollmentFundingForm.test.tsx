import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminMemberEnrollmentFundingForm from './AdminMemberEnrollmentFundingForm';

const refresh = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

describe('AdminMemberEnrollmentFundingForm', () => {
  beforeEach(() => {
    refresh.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('disables enrollment-only funding fields when no primary enrollment exists', () => {
    render(
      <AdminMemberEnrollmentFundingForm
        memberId="member-1"
        hasPrimaryEnrollment={false}
        initial={{
          fundingSource: null,
          fundingNotes: null,
          workspaceEmail: null,
          workspaceEmailProvisioned: false,
        }}
      />,
    );

    expect(screen.getByLabelText('Funding Source')).toBeDisabled();
    expect(screen.getByLabelText('Funding Notes')).toBeDisabled();
    expect(screen.getByLabelText('Workspace Email')).toBeEnabled();
  });

  it('reports a workspace-only save honestly', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, enrollmentFundingSaved: false, workspaceSaved: true }),
    } as Response);

    render(
      <AdminMemberEnrollmentFundingForm
        memberId="member-1"
        hasPrimaryEnrollment={false}
        initial={{
          fundingSource: null,
          fundingNotes: null,
          workspaceEmail: null,
          workspaceEmailProvisioned: false,
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText('Workspace Email'), {
      target: { value: 'member@workforceap.org' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Workspace info saved.');
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  });

  it('uses the committed API result instead of stale enrollment props', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, enrollmentFundingSaved: false, workspaceSaved: true }),
    } as Response);

    render(
      <AdminMemberEnrollmentFundingForm
        memberId="member-1"
        hasPrimaryEnrollment
        initial={{
          fundingSource: null,
          fundingNotes: null,
          workspaceEmail: null,
          workspaceEmailProvisioned: false,
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Workspace info saved.');
  });
});
