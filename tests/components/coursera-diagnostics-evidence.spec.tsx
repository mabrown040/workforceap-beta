import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { CourseraSyncKit, type CourseraSyncKitProps } from '@/components/portal/kit/pages/admin-subviews/CourseraSyncKit';
import CourseraEnrollmentPipelineTable from '@/components/admin/CourseraEnrollmentPipelineTable';
import type { EnrollmentPipelineRow } from '@/lib/admin/courseraEnrollmentPipeline';

afterEach(cleanup);

const overview: CourseraSyncKitProps = {
  health: 'healthy', healthLabel: 'Recent events received', lastSync: '2h ago',
  learnersSynced: '3', b4bLatency: null, errors: '0', unmatched: [], unmatchedTotal: 0,
  forceSyncHref: '/admin/coursera?ui=legacy', approvedForEnrollment: '2', activeLast30Days: '1',
  hiddenTestCount: 4,
};

describe('Coursera diagnostic evidence labels', () => {
  it('separates last event receipt, local records, approval, and unmeasured provider latency', () => {
    render(<CourseraSyncKit {...overview} />);
    expect(screen.getByText('Last xAPI received')).toBeInTheDocument();
    expect(screen.getByText('Members with local progress')).toBeInTheDocument();
    expect(screen.getByText('Not measured')).toBeInTheDocument();
    expect(screen.getByText('No unmatched records')).toBeInTheDocument();
    expect(screen.getByText('4 likely test accounts excluded from this list and its total.')).toBeInTheDocument();
    expect(screen.queryByText('All linked')).not.toBeInTheDocument();
    expect(screen.queryByText('4 to link')).not.toBeInTheDocument();
    expect(screen.queryByText('Last sync')).not.toBeInTheDocument();
  });

  it('renders an unavailable backlog distinctly from a successful empty lookup', () => {
    render(<CourseraSyncKit {...overview} health="unavailable" healthLabel="Evidence unavailable" unmatchedLoaded={false} unmatchedTotal={null} />);
    expect(screen.getByText('Unmatched records unavailable')).toBeInTheDocument();
    expect(screen.queryByText('No unmatched learners')).not.toBeInTheDocument();
    expect(screen.queryByText('No unmatched records')).not.toBeInTheDocument();
  });

  it('not-approved filtering retains observed learners and an unassigned program can be selected', async () => {
    const row: EnrollmentPipelineRow = {
      memberId: 'fixture-member', memberName: 'Fixture Learner', memberEmail: 'fixture@example.invalid',
      programSlug: '', programTitle: 'No active program assignment', approved: false, approvedAt: null,
      approvedByName: null, signal: 'active', lastActivityAt: '2026-09-19T12:00:00Z',
    };
    render(<CourseraEnrollmentPipelineTable initialRows={[row]} programs={[{ slug: '', title: row.programTitle }]} />);
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText('Filter by enrollment signal'), 'not_approved');
    expect(screen.getByText('Fixture Learner')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Filter by program'), '__unassigned__');
    expect(screen.getByText('Fixture Learner')).toBeInTheDocument();
  });
});
