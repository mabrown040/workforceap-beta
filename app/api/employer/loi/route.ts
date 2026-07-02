import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isEmployer } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { logAuditEvent, auditRequestMeta } from '@/lib/audit/log';
import { auditLog } from '@/lib/audit';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { z } from 'zod';

const loiSchema = z.object({
  companyName: z.string().min(1).max(200),
  contactName: z.string().min(1).max(200),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(10).max(50),
  hiringCommitment: z.enum(['1-5', '6-10', '11-25', '25+']),
  preferredPrograms: z.array(z.string()).min(1),
  message: z.string().max(2000).optional(),
});

/**
 * POST /api/employer/loi
 * Employer Letter of Intent — records the hiring intent in the database for
 * admin review. Employer accounts start free; pricing and hiring-tool
 * partnership options are discussed directly with the WorkforceAP team, so
 * this does not create a paid checkout session.
 */
async function _POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employer = await isEmployer(user.id);
    if (!employer) {
      return NextResponse.json({ error: 'Forbidden — employer access required' }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const parsed = loiSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Create or update employer profile
    const employerProfile = await prisma.employer.upsert({
      where: { userId: user.id },
      update: {
        companyName: data.companyName,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
      },
      create: {
        userId: user.id,
        organizationId: '', // Will be set by admin during approval
        companyName: data.companyName,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        status: 'pending_approval',
      },
    });

    // Create hiring intent record (uses existing EmployerHiringIntent model)
    const hiringIntent = await prisma.employerHiringIntent.create({
      data: {
        employerId: employerProfile.id,
        programSlug: data.preferredPrograms[0], // Primary program
        seatCount: parseInt(data.hiringCommitment.split('-')[0] || '1', 10),
        notes: `${data.message}\n\nPreferred programs: ${data.preferredPrograms.join(', ')}\nHiring commitment: ${data.hiringCommitment} roles/year`,
      },
    });

    // Audit log
    await logAuditEvent({
      user: { id: user.id },
      verb: 'submitted',
      object: { type: 'EmployerHiringIntent', id: hiringIntent.id },
      request: auditRequestMeta(request),
    });
    auditLog({
      actorUserId: user.id,
      action: 'employer_loi_submitted',
      targetType: 'Employer',
      targetId: employerProfile.id,
      metadata: { hiringIntentId: hiringIntent.id },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      hiringIntentId: hiringIntent.id,
    });
  } catch (error) {
    console.error('POST /api/employer/loi error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/employer/loi
 * Retrieve the current employer's LOI status.
 */
async function _GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employer = await isEmployer(user.id);
    if (!employer) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const hiringIntent = await prisma.employerHiringIntent.findFirst({
      where: { employer: { userId: user.id } },
      orderBy: { createdAt: 'desc' },
      include: {
        employer: {
          select: {
            companyName: true,
            contactName: true,
            contactEmail: true,
            status: true,
          },
        },
      },
    });

    if (!hiringIntent) {
      return NextResponse.json({ loi: null });
    }

    return NextResponse.json({ loi: hiringIntent });
  } catch (error) {
    console.error('GET /api/employer/loi error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);
export const GET = withApiGuc(_GET);
