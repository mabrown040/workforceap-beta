import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { checkAuthRateLimit } from '@/lib/rate-limit';
import { applicationStatusForPublicLookup } from '@/lib/member/memberApplicationStatus';
import { captureApiError } from '@/lib/observability/captureApiError';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const bodySchema = z.object({
  email: z.string().email().max(320).toLowerCase().trim(),
});

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}export const POST = withApiGuc(async (request: NextRequest) => {
  try {
    const ip = getClientIp(request);
    const { success: rateOk } = await checkAuthRateLimit(`apply-status:${ip}`);
    if (!rateOk) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const email = parsed.data.email;

    const dbUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json({
        found: false,
        message:
          'We could not find an application for that email. Double-check spelling, or apply if you have not submitted yet.',
      });
    }

    const application = await prisma.application.findFirst({
      where: { userId: dbUser.id },
      orderBy: { createdAt: 'desc' },
      select: { status: true },
    });

    if (!application) {
      return NextResponse.json({
        found: false,
        message: 'We could not find an application on file for that email.',
      });
    }

    const statusKey = applicationStatusForPublicLookup(application.status);
    const labels: Record<typeof statusKey, string> = {
      applied: 'Applied — we received your application.',
      under_review: 'Under review — our team is evaluating your application.',
      accepted: 'Accepted — check your email and member portal for next steps.',
      rejected: 'Application closed — see your email for details or contact info@workforceap.org.',
    };

    return NextResponse.json({
      found: true,
      status: statusKey,
      message: labels[statusKey],
    });
  } catch (err) {
    captureApiError(err, { route: 'apply/status-lookup' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
