import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───
vi.mock('@/lib/db/prisma', () =>
  ({
    prisma: {
    $transaction: vi.fn(async (arg: any) => { const { prisma } = await import('@/lib/db/prisma'); return typeof arg === 'function' ? arg(prisma) : Promise.all(arg); }),
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'user-1',
          enrolledProgram: 'it-cyber',
          email: 'jane@example.com',
          fullName: 'Jane Doe',
        }),
      },
      courseProgress: {
        findUnique: vi.fn().mockResolvedValue(null),
        count: vi.fn().mockResolvedValue(3),
        // Program-completion check reads all completed slugs after each
        // completion; empty ⇒ program not complete ⇒ no graduation cascade,
        // keeping these tests focused on the per-course notification.
        findMany: vi.fn().mockResolvedValue([]),
      },
      counselorAssignment: {
        findMany: vi.fn().mockResolvedValue([
          {
            counselor: {
              userId: 'counselor-1',
            },
          },
        ]),
      },
    },
  }));

vi.mock('@/lib/content/programs', () =>
  ({
    getProgramBySlug: vi.fn().mockReturnValue({
      slug: 'it-cyber',
      title: 'IT Cybersecurity',
      courses: [{ slug: 'net-fund', name: 'Network Fundamentals' }],
    }),
    getDiscoveredProgram: vi.fn().mockReturnValue({
      courses: [{ slug: 'net-fund', name: 'Network Fundamentals', courseId: 'coursera-123' }],
    }),
  }));

vi.mock('@/lib/member/courseProgress', () =>
  ({
    markCourseProgressCompleted: vi.fn().mockResolvedValue({}),
  }));

vi.mock('@/lib/member/programCourseMatch', () =>
  ({
    resolveProgramCourseWithCatalogFallback: vi.fn().mockResolvedValue({
      slug: 'net-fund',
      name: 'Network Fundamentals',
    }),
  }));

vi.mock('@/lib/notifications/partner-notify', () =>
  ({
    sendPartnerMilestoneEmail: vi.fn().mockResolvedValue(undefined),
  }));

vi.mock('@/lib/email', () =>
  ({
    sendCourseCompletedEmail: vi.fn().mockResolvedValue(undefined),
  }));

vi.mock('@/lib/events/track', () =>
  ({
    trackEvent: vi.fn().mockResolvedValue(undefined),
  }));

vi.mock('@/lib/workflows/careerOS', () =>
  ({
    handleLearningCompletion: vi.fn().mockResolvedValue(undefined),
  }));

vi.mock('@/lib/member/points', () =>
  ({
    awardPoints: vi.fn().mockResolvedValue(undefined),
  }));

vi.mock('@/lib/notifications/create', () =>
  ({
    createNotification: vi.fn(),
    createBulkNotifications: vi.fn(),
  }));

// ─── Imports after mocks ───
import { completeMemberCourse } from '@/lib/member/courseCompletion';
import { createNotification } from '@/lib/notifications/create';

describe('Trigger: course_complete', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates course_complete notification for member', async () => {
    await completeMemberCourse({
      userId: 'user-1',
      courseSlug: 'net-fund',
      source: 'member',
      notify: true,
    });

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: 'course_complete',
        title: 'Course completed!',
        body: 'You completed Network Fundamentals. Great work!',
        data: expect.objectContaining({ courseSlug: 'net-fund', courseName: 'Network Fundamentals' }),
      })
    );
  });

  it('creates course_complete notification for assigned counselor', async () => {
    await completeMemberCourse({
      userId: 'user-1',
      courseSlug: 'net-fund',
      source: 'member',
      notify: true,
    });

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'counselor-1',
        type: 'course_complete',
        title: 'Jane Doe completed a course',
        body: 'Jane Doe completed Network Fundamentals.',
        data: expect.objectContaining({
          memberId: 'user-1',
          courseSlug: 'net-fund',
          courseName: 'Network Fundamentals',
        }),
      })
    );
  });

  it('does not create notifications when notify is false', async () => {
    await completeMemberCourse({
      userId: 'user-1',
      courseSlug: 'net-fund',
      source: 'coursera-enterprise-sync',
      notify: false,
    });

    expect(createNotification).not.toHaveBeenCalled();
  });

  it('does not create duplicate notifications for already completed courses', async () => {
    const { prisma } = await import('@/lib/db/prisma');
    vi.mocked(prisma.courseProgress.findUnique).mockResolvedValue({
      status: 'COMPLETED',
    } as any);

    await completeMemberCourse({
      userId: 'user-1',
      courseSlug: 'net-fund',
      source: 'member',
      notify: true,
    });

    expect(createNotification).not.toHaveBeenCalled();
  });
});
