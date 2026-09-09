import type { BoardSnapshot } from '@/lib/admin/boardOutcomes';

/** Deliberately different training and credential counts expose label conflation. */
export const boardSnapshotFixture: BoardSnapshot = {
  generatedAt: new Date('2026-09-09T12:00:00Z'),
  smallSampleThreshold: 10,
  applicationFunnel: { total: 30, pending: 3, approved: 25, denied: 1, needsInfo: 1 },
  outcomes: {
    period: { label: 'All time', startDate: null, endDate: new Date('2026-09-09T12:00:00Z') },
    totals: {
      membersServed: 25, membersEnrolled: 25, membersInTraining: 8,
      membersCertified: 17, membersPlaced: 0, placementRate: 0,
      medianAnnualSalary: null, totalAnnualSalaryValue: 0, averageWeeksToPlacement: null,
    },
    funnel: [{ stage: 'Enrolled', count: 25 }, { stage: 'Training completed', count: 17 }, { stage: 'Placed', count: 0 }],
    demographics: { veteranBreakdown: [], employmentEnteringBreakdown: [], incomeBreakdown: [], educationBreakdown: [], ethnicityBreakdown: [] },
    programs: [{ programSlug: 'fixture-training', enrolled: 25, certified: 17, placed: 0, placementRate: 0 }],
    placements: [],
  },
  activity: { totalMembers: 25, active7d: 8, active14d: 10, active30d: 20, inactive14d: 15 },
  certifications: { totalEarned: 23, earnedLast30d: 7, uniqueMembers: 11 },
  dataQuality: { placementsMissingProgram: 0, placementsMissingFunding: 0, placementsMissingRetention: 0, placementsMissingSalary: 0, enrolledWithoutEnrolledAt: 0 },
  funnelWaterfall: [{ stage: 'Training completed', count: 17, previousCount: 25, conversionRate: 68 }],
  applicationQueueHealth: { pendingCount: 3, medianAgeDays: 2, oldestAgeDays: 4 },
  cohorts: [{ month: '2026-08', monthLabel: 'Aug 2026', applications: 30, approved: 25, enrolled: 25, certified: 17, placed: 0 }],
  placementActivity: [],
  kpis: { totalMembers: 25, activeThisWeek: 8, qualifiedLeads: 0, fundedStarts: 25, placementsThisMonth: 0, retentionRate: null },
};
