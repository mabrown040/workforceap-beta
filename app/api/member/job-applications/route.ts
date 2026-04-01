import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { prisma } from '@/lib/db/prisma';
import { trackEvent } from '@/lib/events/track';
import { z } from 'zod';

// GET: List user's job applications
export async function GET() {
  try {
    const user = await getUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const applications = await prisma.jobApplication.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(applications);
  } catch (error) {
    console.error('[job-applications GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}

// POST: Create a new job application
const createApplicationSchema = z.object({
  role: z.string().min(1, 'Job title is required'),
  company: z.string().min(1, 'Company is required'),
  appliedAt: z.string().datetime().nullable(),
  source: z.enum(['INDEED', 'LINKEDIN', 'DIRECT', 'OTHER']).default('OTHER'),
  nextInterviewDate: z.string().datetime().nullable().optional(),
  notes: z.string().optional().nullable(),
  status: z.enum(['SAVED', 'APPLIED', 'PHONE_SCREEN', 'INTERVIEWING', 'OFFER', 'REJECTED']).default('APPLIED'),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureUserInDb(user);

    const body = await request.json();
    const parsed = createApplicationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const application = await prisma.jobApplication.create({
      data: {
        userId: user.id,
        role: parsed.data.role,
        company: parsed.data.company,
        appliedAt: parsed.data.appliedAt ? new Date(parsed.data.appliedAt) : null,
        source: parsed.data.source,
        status: parsed.data.status,
        nextInterviewDate: parsed.data.nextInterviewDate
          ? new Date(parsed.data.nextInterviewDate)
          : null,
        notes: parsed.data.notes || null,
      },
    });

    await trackEvent({
      userId: user.id,
      eventName: 'application_added',
      entityType: 'job_application',
      entityId: application.id,
      sourcePage: '/dashboard/job-applications',
      metadata: {
        status: application.status,
        source: application.source,
      },
    });

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    console.error('[job-applications POST]', error);
    return NextResponse.json(
      { error: 'Failed to create application' },
      { status: 500 }
    );
  }
}
