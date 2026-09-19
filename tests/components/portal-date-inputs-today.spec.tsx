process.env.TZ = 'UTC';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/(portal)/dashboard/logCertAction', () => ({ logExternalCertification: vi.fn() }));
vi.mock('@/components/LocalizedLink', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

import LogCertificationModal from '@/app/(portal)/dashboard/LogCertificationModal';
import ParentalConsentForm from '@/components/forms/ParentalConsentForm';

describe('client date inputs bound "today" to the portal timezone', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-09-20T02:00:00Z')); // 9:00 PM CDT on Sep 19
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('LogCertificationModal caps "Date earned" at the Central date', () => {
    render(<LogCertificationModal />);
    fireEvent.click(screen.getByRole('button', { name: /log a certificate|add|log/i }));
    const input = screen.getByLabelText('Date earned') as HTMLInputElement;
    expect(input.max).toBe('2026-09-19');
  });

  it('LogCertificationModal accepts a certificate earned on the Central "today"', () => {
    render(<LogCertificationModal />);
    fireEvent.click(screen.getByRole('button', { name: /log a certificate|add|log/i }));
    fireEvent.change(screen.getByLabelText('Date earned'), { target: { value: '2026-09-19' } });
    fireEvent.submit(screen.getByLabelText('Date earned').closest('form') as HTMLFormElement);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('ParentalConsentForm caps the student date of birth at the Central date', () => {
    render(<ParentalConsentForm onSubmit={vi.fn(async () => undefined)} studentName="Fixture Student" />);
    const input = screen.getByLabelText(/Student Date of Birth/) as HTMLInputElement;
    expect(input.max).toBe('2026-09-19');
  });
});
