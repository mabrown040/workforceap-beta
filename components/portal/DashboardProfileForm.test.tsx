import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardProfileForm from './DashboardProfileForm';

const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const defaultProps = {
  defaultFirstName: 'Alice',
  defaultLastName: 'Smith',
  defaultPhone: '555-1234',
  defaultAddress: '123 Main St',
  defaultCity: 'Austin',
  defaultState: 'TX',
  defaultZip: '78701',
  defaultReferralSource: 'Friend or family',
  defaultLinkedin: '',
  defaultBio: '',
};

describe('DashboardProfileForm', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders all form fields', () => {
    render(<DashboardProfileForm {...defaultProps} />);
    expect(screen.getByLabelText(/first name/i)).toHaveValue('Alice');
    expect(screen.getByLabelText(/last name/i)).toHaveValue('Smith');
    expect(screen.getByLabelText(/phone number/i)).toHaveValue('555-1234');
    expect(screen.getByLabelText(/physical address/i)).toHaveValue('123 Main St');
    expect(screen.getByLabelText(/city/i)).toHaveValue('Austin');
    expect(screen.getByLabelText(/state/i)).toHaveValue('TX');
    expect(screen.getByLabelText(/zip \/ postal code/i)).toHaveValue('78701');
    expect(screen.getByLabelText(/how did you hear about workforceap/i)).toHaveValue('Friend or family');
  });

  it('validates required fields', () => {
    render(<DashboardProfileForm {...defaultProps} />);
    const firstName = screen.getByLabelText(/first name/i);
    const lastName = screen.getByLabelText(/last name/i);
    expect(firstName).toHaveAttribute('required');
    expect(lastName).toHaveAttribute('required');
  });

  it('updates field values on input', () => {
    render(<DashboardProfileForm {...defaultProps} />);
    const firstName = screen.getByLabelText(/first name/i);
    fireEvent.change(firstName, { target: { value: 'Bob' } });
    expect(firstName).toHaveValue('Bob');
  });

  it('submits form with PATCH request', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(<DashboardProfileForm {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/member/dashboard-profile',
        expect.objectContaining({ method: 'PATCH' }),
      );
    });

    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(call[1]!.body as string);
    expect(body.firstName).toBe('Alice');
    expect(body.lastName).toBe('Smith');
  });

  it('shows loading state during submit', async () => {
    let resolveResponse: (value: unknown) => void;
    const promise = new Promise((resolve) => { resolveResponse = resolve; });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(promise);

    render(<DashboardProfileForm {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument();
    resolveResponse!({ ok: true, json: () => Promise.resolve({ success: true }) });
  });

  it('shows error on failed submission', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Phone invalid' }),
    });

    render(<DashboardProfileForm {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Phone invalid');
    });
  });

  it('toggles barrier checkboxes', () => {
    render(<DashboardProfileForm {...defaultProps} />);
    const checkbox = screen.getByLabelText(/justice-involved background/i);
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('shows starter profile review banner when required', () => {
    render(
      <DashboardProfileForm
        {...defaultProps}
        starterProfileReviewRequired
        starterProfileMissingFields={['phone', 'address']}
      />,
    );
    expect(screen.getByText(/review counselor-entered starter details/i)).toBeInTheDocument();
    expect(screen.getByText(/missing now: phone, address/i)).toBeInTheDocument();
  });

  it('does not show review banner when not required', () => {
    render(<DashboardProfileForm {...defaultProps} />);
    expect(screen.queryByText(/review counselor-entered starter details/i)).not.toBeInTheDocument();
  });
});
