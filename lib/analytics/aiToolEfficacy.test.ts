import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───
vi.mock('@/lib/db/prisma', () => {
  const aIToolResult = {
    findMany: vi.fn(),
  };
  const user = {
    findMany: vi.fn(),
  };
  return { prisma: { aIToolResult, user } };
});

import { prisma } from '@/lib/db/prisma';
import {
  analyzeAIEfficacy,
  formatEfficacyReportMarkdown,
  efficacyReportToCsvRows,
} from './aiToolEfficacy';

const ORG_ID = 'org-1';

function makeDateRange(daysBack: number) {
  const end = new Date('2026-05-13T23:59:59.999Z');
  const start = new Date(end);
  start.setDate(start.getDate() - daysBack);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function mockMember(opts: {
  id: string;
  enrolledAt?: Date;
  placedAt?: Date;
  salary?: number;
  jobApps?: number;
}): any {
  return {
    id: opts.id,
    enrolledAt: opts.enrolledAt ?? new Date('2026-04-01'),
    placementRecord: opts.placedAt
      ? { placedAt: opts.placedAt, salaryOffered: opts.salary ?? null }
      : null,
    _count: { jobApplications: opts.jobApps ?? 0 },
  };
}

// ─────────────────────────────────────────────
// analyzeAIEfficacy
// ─────────────────────────────────────────────
describe('analyzeAIEfficacy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty report when no enrolled members', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);
    vi.mocked(prisma.aIToolResult.findMany).mockResolvedValue([]);

    const report = await analyzeAIEfficacy(ORG_ID, makeDateRange(90));

    expect(report.overall.anyTool.usersWithTool).toBe(0);
    expect(report.overall.anyTool.usersWithoutTool).toBe(0);
    expect(report.byTool).toHaveLength(0);
    expect(report.topTools).toHaveLength(0);
    expect(report.summaryText).toContain('No enrolled members');
  });

  it('computes overall cohort metrics correctly', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      mockMember({ id: 'u1', enrolledAt: new Date('2026-04-01'), placedAt: new Date('2026-04-30'), salary: 50000, jobApps: 3 }),
      mockMember({ id: 'u2', enrolledAt: new Date('2026-04-01'), placedAt: new Date('2026-05-15'), salary: 60000, jobApps: 5 }),
      mockMember({ id: 'u3', enrolledAt: new Date('2026-04-01'), jobApps: 1 }),
      mockMember({ id: 'u4', enrolledAt: new Date('2026-04-01'), jobApps: 0 }),
    ]);

    // u1 and u2 used resume_rewriter; u1 also used interview_practice
    vi.mocked(prisma.aIToolResult.findMany).mockResolvedValue([
      { userId: 'u1', toolType: 'resume_rewriter' },
      { userId: 'u1', toolType: 'interview_practice' },
      { userId: 'u2', toolType: 'resume_rewriter' },
    ] as any);

    const report = await analyzeAIEfficacy(ORG_ID, makeDateRange(90));

    // 3 tool users (u1, u2, u1 again), 1 non-user (u3, u4)
    expect(report.overall.anyTool.usersWithTool).toBe(2);
    expect(report.overall.anyTool.usersWithoutTool).toBe(2);
    expect(report.overall.anyTool.placedWithTool).toBe(2);
    expect(report.overall.anyTool.placedWithoutTool).toBe(0);
    expect(report.overall.anyTool.placementRateWith).toBe(100);
    expect(report.overall.anyTool.placementRateWithout).toBe(0);
    expect(report.overall.anyTool.avgDaysToPlacementWith).toBe(37); // avg(29, 44)
    expect(report.overall.anyTool.avgDaysToPlacementWithout).toBe(null);
    expect(report.overall.anyTool.avgSalaryWith).toBe(55000);
    expect(report.overall.anyTool.avgSalaryWithout).toBe(null);
    expect(report.overall.anyTool.avgJobApplicationsWith).toBe(4);
    expect(report.overall.anyTool.avgJobApplicationsWithout).toBe(0.5);
  });

  it('computes per-tool metrics correctly', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      mockMember({ id: 'u1', enrolledAt: new Date('2026-04-01'), placedAt: new Date('2026-04-30'), salary: 50000, jobApps: 3 }),
      mockMember({ id: 'u2', enrolledAt: new Date('2026-04-01'), placedAt: new Date('2026-05-15'), salary: 60000, jobApps: 5 }),
      mockMember({ id: 'u3', enrolledAt: new Date('2026-04-01'), jobApps: 1 }),
      mockMember({ id: 'u4', enrolledAt: new Date('2026-04-01'), jobApps: 0 }),
    ]);

    vi.mocked(prisma.aIToolResult.findMany).mockResolvedValue([
      { userId: 'u1', toolType: 'resume_rewriter' },
      { userId: 'u1', toolType: 'interview_practice' },
      { userId: 'u2', toolType: 'resume_rewriter' },
    ] as any);

    const report = await analyzeAIEfficacy(ORG_ID, makeDateRange(90));

    const resume = report.byTool.find((t) => t.toolType === 'resume_rewriter');
    const interview = report.byTool.find((t) => t.toolType === 'interview_practice');

    expect(resume).toBeDefined();
    expect(resume!.usersWithTool).toBe(2);
    expect(resume!.usersWithoutTool).toBe(2);
    expect(resume!.placementRateWith).toBe(100);
    expect(resume!.placementRateWithout).toBe(0);

    expect(interview).toBeDefined();
    expect(interview!.usersWithTool).toBe(1);
    expect(interview!.usersWithoutTool).toBe(3);
    expect(interview!.placementRateWith).toBe(100);
    expect(interview!.placementRateWithout).toBe(33); // 1 of 3 placed
  });

  it('ranks top tools by placement lift', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      mockMember({ id: 'u1', enrolledAt: new Date('2026-04-01'), placedAt: new Date('2026-04-30'), jobApps: 3 }),
      mockMember({ id: 'u2', enrolledAt: new Date('2026-04-01'), placedAt: new Date('2026-05-15'), jobApps: 5 }),
      mockMember({ id: 'u3', enrolledAt: new Date('2026-04-01'), placedAt: new Date('2026-05-10'), jobApps: 2 }),
      mockMember({ id: 'u4', enrolledAt: new Date('2026-04-01'), jobApps: 1 }),
    ]);

    vi.mocked(prisma.aIToolResult.findMany).mockResolvedValue([
      { userId: 'u1', toolType: 'resume_rewriter' },
      { userId: 'u1', toolType: 'interview_practice' },
      { userId: 'u2', toolType: 'resume_rewriter' },
      { userId: 'u3', toolType: 'resume_rewriter' },
    ] as any);

    const report = await analyzeAIEfficacy(ORG_ID, makeDateRange(90));

    expect(report.topTools.length).toBeGreaterThan(0);
    expect(report.topTools[0].toolType).toBe('resume_rewriter');
    expect(report.topTools[0].placementLift).toBe(100);
  });

  it('filters out top tools with < 3 users', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      mockMember({ id: 'u1', enrolledAt: new Date('2026-04-01'), placedAt: new Date('2026-04-30'), jobApps: 3 }),
      mockMember({ id: 'u2', enrolledAt: new Date('2026-04-01'), jobApps: 1 }),
    ]);

    // Only 1 user for this tool
    vi.mocked(prisma.aIToolResult.findMany).mockResolvedValue([
      { userId: 'u1', toolType: 'resume_rewriter' },
    ] as any);

    const report = await analyzeAIEfficacy(ORG_ID, makeDateRange(90));

    expect(report.topTools).toHaveLength(0);
    expect(report.byTool).toHaveLength(1);
  });

  it('generates deterministic output for same inputs', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      mockMember({ id: 'u1', enrolledAt: new Date('2026-04-01'), placedAt: new Date('2026-04-30'), salary: 50000, jobApps: 3 }),
      mockMember({ id: 'u2', enrolledAt: new Date('2026-04-01'), jobApps: 1 }),
    ]);

    vi.mocked(prisma.aIToolResult.findMany).mockResolvedValue([
      { userId: 'u1', toolType: 'resume_rewriter' },
    ] as any);

    const r1 = await analyzeAIEfficacy(ORG_ID, makeDateRange(90));
    const r2 = await analyzeAIEfficacy(ORG_ID, makeDateRange(90));

    expect(r1.overall.anyTool).toEqual(r2.overall.anyTool);
    expect(r1.byTool).toEqual(r2.byTool);
    expect(r1.topTools).toEqual(r2.topTools);
  });
});

// ─────────────────────────────────────────────
// formatEfficacyReportMarkdown
// ─────────────────────────────────────────────
describe('formatEfficacyReportMarkdown', () => {
  it('renders a complete markdown report', () => {
    const report = {
      dateRange: { start: '2026-01-01', end: '2026-03-31' },
      generatedAt: '2026-04-01T00:00:00.000Z',
      overall: {
        anyTool: {
          usersWithTool: 10,
          usersWithoutTool: 20,
          placedWithTool: 5,
          placedWithoutTool: 4,
          placementRateWith: 50,
          placementRateWithout: 20,
          avgDaysToPlacementWith: 30,
          avgDaysToPlacementWithout: 60,
          avgSalaryWith: 55000,
          avgSalaryWithout: 48000,
          avgJobApplicationsWith: 4,
          avgJobApplicationsWithout: 1,
        },
      },
      byTool: [
        {
          toolType: 'resume_rewriter',
          toolLabel: 'Resume Rewriter',
          usersWithTool: 8,
          usersWithoutTool: 22,
          placedWithTool: 4,
          placedWithoutTool: 5,
          placementRateWith: 50,
          placementRateWithout: 23,
          avgDaysToPlacementWith: 28,
          avgDaysToPlacementWithout: 62,
          avgSalaryWith: 56000,
          avgSalaryWithout: 47000,
          avgJobApplicationsWith: 4.5,
          avgJobApplicationsWithout: 0.8,
        },
      ],
      topTools: [{ toolType: 'resume_rewriter', toolLabel: 'Resume Rewriter', placementLift: 27 }],
      summaryText: 'Test summary.',
    };

    const md = formatEfficacyReportMarkdown(report as any);

    expect(md).toContain('# AI Tool Efficacy Report');
    expect(md).toContain('Test summary.');
    expect(md).toContain('Resume Rewriter');
    expect(md).toContain('50%');
    expect(md).toContain('$55,000');
    expect(md).toContain('+27pp');
  });
});

// ─────────────────────────────────────────────
// efficacyReportToCsvRows
// ─────────────────────────────────────────────
describe('efficacyReportToCsvRows', () => {
  it('returns flat rows for overall and per-tool', () => {
    const report = {
      dateRange: { start: '2026-01-01', end: '2026-03-31' },
      generatedAt: '2026-04-01T00:00:00.000Z',
      overall: {
        anyTool: {
          usersWithTool: 10,
          usersWithoutTool: 20,
          placedWithTool: 5,
          placedWithoutTool: 4,
          placementRateWith: 50,
          placementRateWithout: 20,
          avgDaysToPlacementWith: 30,
          avgDaysToPlacementWithout: 60,
          avgSalaryWith: 55000,
          avgSalaryWithout: 48000,
          avgJobApplicationsWith: 4,
          avgJobApplicationsWithout: 1,
        },
      },
      byTool: [
        {
          toolType: 'resume_rewriter',
          toolLabel: 'Resume Rewriter',
          usersWithTool: 8,
          usersWithoutTool: 22,
          placedWithTool: 4,
          placedWithoutTool: 5,
          placementRateWith: 50,
          placementRateWithout: 23,
          avgDaysToPlacementWith: 28,
          avgDaysToPlacementWithout: 62,
          avgSalaryWith: 56000,
          avgSalaryWithout: 47000,
          avgJobApplicationsWith: 4.5,
          avgJobApplicationsWithout: 0.8,
        },
      ],
      topTools: [],
      summaryText: '',
    };

    const rows = efficacyReportToCsvRows(report as any);

    expect(rows).toHaveLength(2);
    expect(rows[0].tool).toBe('Any AI Tool');
    expect(rows[1].tool).toBe('Resume Rewriter');
    expect(rows[1].placement_rate_with).toBe('50%');
  });
});
