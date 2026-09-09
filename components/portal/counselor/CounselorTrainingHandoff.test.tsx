import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CounselorTrainingHandoff, { type CounselorTrainingEnrollment } from './CounselorTrainingHandoff';
vi.mock('next/link', () => ({ default: ({ children, href, ...props }: React.ComponentProps<'a'>) => <a href={href} {...props}>{children}</a> }));
const primary: CounselorTrainingEnrollment = { programSlug: 'it-support', programTitle: 'IT Support', isPrimary: true, fundingSource: null };

describe('Counselor training handoff uses recorded facts', () => {
  afterEach(cleanup);
  it('separates missing funding from access that is not approved', () => {
    render(<CounselorTrainingHandoff memberId="member-2" enrollments={[primary]} courseraEnrollmentApproved={false} />);
    expect(screen.getByText(/No funding source recorded/)).toBeInTheDocument();
    expect(screen.getByText(/Coursera enrollment permission:/).parentElement).toHaveTextContent('Not approved');
    expect(screen.getByText(/Ask the enrollment team to confirm funding/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Message member' })).toHaveAttribute('href', '/counselor/messages?memberId=member-2');
  });
  it('does not infer access approval from a funding source', () => {
    render(<CounselorTrainingHandoff memberId="member-2" enrollments={[{ ...primary, fundingSource: 'GRANT' }]} courseraEnrollmentApproved={false} />);
    expect(screen.getByText(/Funding source: Grant/)).toBeInTheDocument();
    expect(screen.getByText(/Coursera enrollment permission:/).parentElement).toHaveTextContent('Not approved');
  });
  it('does not inherit primary funding into a secondary program', () => {
    render(<CounselorTrainingHandoff memberId="member-2" enrollments={[{ ...primary, fundingSource: 'EMPLOYER' }, { ...primary, programSlug: 'networking', programTitle: 'Networking', isPrimary: false }]} courseraEnrollmentApproved />);
    const rows = screen.getAllByRole('listitem');
    expect(within(rows[0]).getByText(/Primary program · Funding source: Employer/)).toBeInTheDocument();
    expect(within(rows[1]).getByText(/Secondary program · No funding source recorded/)).toBeInTheDocument();
    expect(screen.getByText(/complete the missing funding record/)).toBeInTheDocument();
    expect(screen.getByText(/Funding sources do not confirm an award or payment/)).toBeInTheDocument();
  });
  it('offers an access check when permission and a funding source are recorded', () => {
    render(<CounselorTrainingHandoff memberId="member-2" enrollments={[{ ...primary, fundingSource: 'PARTNER_ORG' }]} courseraEnrollmentApproved />);
    expect(screen.getByText(/Confirm course access with the member and agree/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
  });
  it('does not invent an enrollment when none is recorded', () => {
    render(<CounselorTrainingHandoff memberId="member-2" enrollments={[]} courseraEnrollmentApproved={false} />);
    expect(screen.getByText('No course enrollment record is available.')).toBeInTheDocument();
    expect(screen.getByText(/Confirm the intended program/)).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
