import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MfaStatusBanner from '@/components/admin/MfaStatusBanner';

describe('MfaStatusBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders an inspected suppression marker for the default admin kit audit response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        mfaRequired: false,
        mfaEnforcement: true,
        auditSuppressed: true,
      }),
    } as Response);

    const { container } = render(<MfaStatusBanner />);

    await waitFor(() => {
      expect(
        container.querySelector(
          '[data-portal-audit-suppressed="staff-mfa-rate-limit-and-auth-cookie-refresh"]',
        ),
      ).toBeInTheDocument();
    });
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/check-mfa-required');
  });
});
