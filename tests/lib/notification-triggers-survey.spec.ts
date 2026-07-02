import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: vi.fn(async (arg: any) => { const { prisma } = await import('@/lib/db/prisma'); return typeof arg === 'function' ? arg(prisma) : Promise.all(arg); }),
    placementRecord: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    placementSurvey: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'survey-1' }),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/security/placementSurveyToken', () => ({
  issuePlacementSurveyToken: vi.fn().mockResolvedValue('token-123'),
}));

vi.mock('@/lib/email', () => ({
  sendPlacementSurveyEmail: vi.fn().mockResolvedValue({ ok: true }),
  sendPlacementSurveyEscalationEmail: vi.fn(),
}));

vi.mock('@/lib/notifications/create', () => ({
  createNotification: vi.fn(),
  createBulkNotifications: vi.fn(),
}));

// ─── Imports after mocks ───
import { sendDuePlacementSurveys } from '@/lib/cron/placement-surveys';
import { createNotification } from '@/lib/notifications/create';

describe('Trigger: survey_due', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates survey_due notification when a 30-day placement survey is generated', async () => {
    const { prisma } = await import('@/lib/db/prisma');
    const placedAt = new Date();
    placedAt.setDate(placedAt.getDate() - 30);

    vi.mocked(prisma.placementRecord.findMany).mockResolvedValue([
      {
        id: 'placement-1',
        userId: 'user-1',
        placedAt,
        user: {
          id: 'user-1',
          email: 'jane@example.com',
          fullName: 'Jane Doe',
          enrolledProgram: 'CNA',
        },
      },
    ] as any);

    await sendDuePlacementSurveys();

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: 'survey_due',
        title: 'Placement survey ready',
        body: expect.stringContaining('placement survey is ready'),
        data: expect.objectContaining({ surveyId: 'survey-1', wave: 'thirty_day' }),
      })
    );
  });

  it('creates survey_due notification when a 60-day placement survey is generated', async () => {
    const { prisma } = await import('@/lib/db/prisma');
    const placedAt = new Date();
    placedAt.setDate(placedAt.getDate() - 60);

    vi.mocked(prisma.placementRecord.findMany).mockResolvedValue([
      {
        id: 'placement-2',
        userId: 'user-2',
        placedAt,
        user: {
          id: 'user-2',
          email: 'bob@example.com',
          fullName: 'Bob Smith',
          enrolledProgram: 'IT Support',
        },
      },
    ] as any);

    await sendDuePlacementSurveys();

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-2',
        type: 'survey_due',
        title: 'Placement survey ready',
        body: expect.stringContaining('placement survey is ready'),
        data: expect.objectContaining({ surveyId: 'survey-1', wave: 'sixty_day' }),
      })
    );
  });

  it('skips members with no email', async () => {
    const { prisma } = await import('@/lib/db/prisma');
    const placedAt = new Date();
    placedAt.setDate(placedAt.getDate() - 30);

    vi.mocked(prisma.placementRecord.findMany).mockResolvedValue([
      {
        id: 'placement-3',
        userId: 'user-3',
        placedAt,
        user: {
          id: 'user-3',
          email: null,
          fullName: 'No Email User',
          enrolledProgram: 'CNA',
        },
      },
    ] as any);

    await sendDuePlacementSurveys();

    expect(createNotification).not.toHaveBeenCalled();
  });
});
