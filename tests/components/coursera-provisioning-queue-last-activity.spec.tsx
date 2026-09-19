import { cleanup, render as renderBare, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import messages from '@/messages/en.json';
import CourseraProvisioningQueueTable from '@/components/admin/CourseraProvisioningQueueTable';
import type { CourseraProvisioningRow } from '@/lib/coursera/provisioningState';

afterEach(cleanup);

const render = (ui: ReactElement) =>
  renderBare(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );

function row(overrides: Partial<CourseraProvisioningRow> & Pick<CourseraProvisioningRow, 'memberId' | 'memberName'>): CourseraProvisioningRow {
  return {
    memberEmail: `${overrides.memberId}@example.org`,
    programSlug: 'it-support',
    programTitle: 'IT Support',
    approved: true,
    approvedAt: null,
    state: 'active',
    needsAttention: false,
    approvalMismatch: false,
    hasUnmatchedRows: false,
    invitedAt: null,
    enrolledAt: null,
    lastActivityAt: null,
    lastActivitySource: null,
    lastSignInAt: null,
    linkedCourseraRows: 0,
    unmatchedCourseraRows: 0,
    courseProgressRows: 0,
    xapiStatements: 0,
    ...overrides,
  };
}

const PROGRAMS = [{ slug: 'it-support', title: 'IT Support' }];
const GENERATED_AT = '2026-09-19T12:00:00.000Z';

function rowFor(name: string): HTMLElement {
  const link = screen.getByRole('link', { name });
  const tr = link.closest('tr');
  if (!tr) throw new Error(`no table row for ${name}`);
  return tr;
}

describe('CourseraProvisioningQueueTable — last activity column', () => {
  it('shows learning activity as a calendar day in portal (Central) time, not UTC', () => {
    // 03:30 UTC on 18 Sep is still 17 Sep at 22:30 in America/Chicago.
    render(
      <CourseraProvisioningQueueTable
        rows={[
          row({
            memberId: 'm-active',
            memberName: 'Active Learner',
            lastActivityAt: '2026-09-18T03:30:00.000Z',
            lastActivitySource: 'coursera',
            lastSignInAt: '2026-09-19T01:00:00.000Z',
            linkedCourseraRows: 2,
          }),
        ]}
        programs={PROGRAMS}
        generatedAt={GENERATED_AT}
      />,
    );
    const tr = rowFor('Active Learner');
    const cell = within(tr).getByText('Sep 17, 2026');
    expect(cell.tagName).toBe('TIME');
    expect(cell).toHaveAttribute('dateTime', '2026-09-18T03:30:00.000Z');
    expect(cell).toHaveAttribute('title', 'Latest activity reported by Coursera');
    // The learning date wins over the newer sign-in and is not labelled as a sign-in.
    expect(within(tr).queryByText('Last sign-in')).toBeNull();
    expect(within(tr).queryByText('Sep 18, 2026')).toBeNull();
  });

  it('falls back to the last portal sign-in and labels it as a sign-in, not activity', () => {
    render(
      <CourseraProvisioningQueueTable
        rows={[
          row({
            memberId: 'm-signin',
            memberName: 'Signed In Only',
            state: 'not_provisioned',
            lastActivitySource: 'sign_in',
            lastSignInAt: '2026-09-10T15:00:00.000Z',
          }),
        ]}
        programs={PROGRAMS}
        generatedAt={GENERATED_AT}
      />,
    );
    const tr = rowFor('Signed In Only');
    const time = within(tr).getByText('Sep 10, 2026');
    expect(time.tagName).toBe('TIME');
    expect(within(tr).getByText('Last sign-in')).toBeInTheDocument();
    expect(time).toHaveAccessibleName(/^Last sign-in: Sep 10, 2026\./);
    expect(time).toHaveAttribute(
      'title',
      'No learning activity recorded yet; this is the last time the member signed in to the portal.',
    );
    expect(within(tr).queryByText('No activity yet')).toBeNull();
  });

  it('renders the translated empty state when the member has neither activity nor a sign-in', () => {
    render(
      <CourseraProvisioningQueueTable
        rows={[row({ memberId: 'm-none', memberName: 'Brand New', state: 'not_approved' })]}
        programs={PROGRAMS}
        generatedAt={GENERATED_AT}
      />,
    );
    const tr = rowFor('Brand New');
    expect(within(tr).getByText('No activity yet')).toBeInTheDocument();
    expect(tr.querySelector('time')).toBeNull();
    expect(within(tr).queryByText('Last sign-in')).toBeNull();
  });

  it('labels the column from the admin message catalog', () => {
    render(
      <CourseraProvisioningQueueTable
        rows={[row({ memberId: 'm-none', memberName: 'Brand New' })]}
        programs={PROGRAMS}
        generatedAt={GENERATED_AT}
      />,
    );
    expect(screen.getByRole('columnheader', { name: 'Last activity' })).toBeInTheDocument();
  });
});
