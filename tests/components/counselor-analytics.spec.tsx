import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CounselorAnalyticsCards from '@/components/portal/counselor/CounselorAnalyticsCards';
import ProgressDistributionChart from '@/components/portal/counselor/ProgressDistributionChart';
import AtRiskMemberList from '@/components/portal/counselor/AtRiskMemberList';
import RecentActivityFeed from '@/components/portal/counselor/RecentActivityFeed';
import MemberProgressTimeline from '@/components/portal/counselor/MemberProgressTimeline';

describe('CounselorAnalyticsCards', () => {
  it('renders analytics cards with correct values', () => {
    render(
      <CounselorAnalyticsCards
        data={{
          totalMembers: 45,
          activeMembers: 32,
          atRiskMembers: 5,
          avgProgress: 67,
          recentCompletions: 3,
          recentPlacements: 2,
        }}
      />
    );

    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('32')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('67%')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('links at-risk card to at-risk dashboard', () => {
    render(
      <CounselorAnalyticsCards
        data={{
          totalMembers: 45,
          activeMembers: 32,
          atRiskMembers: 5,
          avgProgress: 67,
          recentCompletions: 3,
          recentPlacements: 2,
        }}
      />
    );

    const link = screen.getByText('5').closest('a');
    expect(link).toHaveAttribute('href', '/counselor/at-risk');
  });
});

describe('ProgressDistributionChart', () => {
  it('renders chart with distribution data', () => {
    const data = [
      { range: '0–25%', count: 2 },
      { range: '25–50%', count: 5 },
      { range: '50–75%', count: 8 },
      { range: '75–100%', count: 3 },
    ];

    render(<ProgressDistributionChart data={data} />);
    expect(screen.getByText('Progress Distribution')).toBeInTheDocument();
  });
});

describe('AtRiskMemberList', () => {
  it('renders at-risk members with scores and levels', () => {
    const members = [
      { memberId: 'm1', riskScore: 75, riskLevel: 'CRITICAL' as const, enrolledProgram: 'IT Support' },
      { memberId: 'm2', riskScore: 45, riskLevel: 'MEDIUM' as const, enrolledProgram: null },
    ];

    render(<AtRiskMemberList members={members} />);
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
  });

  it('returns null when no at-risk members', () => {
    const { container } = render(<AtRiskMemberList members={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('RecentActivityFeed', () => {
  it('renders activity items with types and dates', () => {
    const items = [
      {
        memberId: 'm1',
        type: 'course_completed' as const,
        date: new Date().toISOString(),
        metadata: { courseName: 'Intro to IT' },
      },
      {
        memberId: 'm2',
        type: 'placement_recorded' as const,
        date: new Date(Date.now() - 86400000).toISOString(),
        metadata: { employerName: 'TechCorp' },
      },
    ];

    render(<RecentActivityFeed items={items} />);
    expect(screen.getByText('Course completed')).toBeInTheDocument();
    expect(screen.getByText('Intro to IT')).toBeInTheDocument();
    expect(screen.getByText('Placement recorded')).toBeInTheDocument();
    expect(screen.getByText('TechCorp')).toBeInTheDocument();
  });

  it('returns null when no activity items', () => {
    const { container } = render(<RecentActivityFeed items={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('MemberProgressTimeline', () => {
  it('renders timeline with all stages', () => {
    const events = [
      { stage: 'enrollment' as const, label: 'Enrollment', date: '2026-01-01T00:00:00Z', durationDays: 0, status: 'completed' as const },
      { stage: 'assessment' as const, label: 'Assessment', date: '2026-01-05T00:00:00Z', durationDays: 4, status: 'completed' as const },
      { stage: 'training' as const, label: 'Training', date: '2026-02-01T00:00:00Z', durationDays: 27, status: 'completed' as const },
      { stage: 'certification' as const, label: 'Certification', date: null, durationDays: null, status: 'in_progress' as const },
      { stage: 'placement' as const, label: 'Placement', date: null, durationDays: null, status: 'pending' as const },
    ];

    render(<MemberProgressTimeline events={events} programAvgDays={90} />);
    expect(screen.getByText('Progress Timeline')).toBeInTheDocument();
    expect(screen.getByText('Enrollment')).toBeInTheDocument();
    expect(screen.getByText('Assessment')).toBeInTheDocument();
    expect(screen.getByText('Training')).toBeInTheDocument();
    expect(screen.getByText('Certification')).toBeInTheDocument();
    expect(screen.getByText('Placement')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('3 of 5 stages complete')).toBeInTheDocument();
  });

  it('shows "On track" for durations under program average', () => {
    const events = [
      { stage: 'enrollment' as const, label: 'Enrollment', date: '2026-01-01T00:00:00Z', durationDays: 0, status: 'completed' as const },
      { stage: 'assessment' as const, label: 'Assessment', date: '2026-01-03T00:00:00Z', durationDays: 2, status: 'completed' as const },
    ];

    render(<MemberProgressTimeline events={events} programAvgDays={30} />);
    expect(screen.getAllByText('On track').length).toBeGreaterThanOrEqual(1);
  });
});
