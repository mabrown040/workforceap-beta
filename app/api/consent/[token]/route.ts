import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { consumeTokenizedLink, validateTokenizedLink } from '@/lib/tokenizedLink';
import { checkPublicQuestionnaireSubmitRateLimit } from '@/lib/rate-limit';
import { auditLog } from '@/lib/audit';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';

/**
 * POST /api/consent/[token]
 *
 * PUBLIC guardian-consent submit. The single-use token is the only credential.
 * Consent writes Profile parental-consent fields and never creates an account.
 * Coursera seat activation stays gated on parentalConsentGiven for minors.
 */
const submitSchema = z.object({
  guardianName: z.string().trim().min(1).max(200),
  guardianEmail: z.string().trim().email().max(200),
  guardianPhone: z.string().trim().max(50).optional().nullable(),
  attested: z.literal(true),
});

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export const POST = withApiGuc(
  async (request: NextRequest, context: { params: Promise<{ token: string }> }) => {
    try {
      const ip = getClientIp(request);
      const { success: rateOk } = await checkPublicQuestionnaireSubmitRateLimit(ip);
      if (!rateOk) {
        return NextResponse.json(
          { error: 'Too many submissions from this connection. Please wait a moment and try again.' },
          { status: 429 },
        );
      }

      const { token } = await context.params;
      const validation = await validateTokenizedLink(token, 'guardian_consent');
      if (!validation.ok) {
        const msg =
          validation.reason === 'expired'
            ? 'This link has expired.'
            : validation.reason === 'consumed'
              ? 'This link has already been used.'
              : 'This link is no longer valid.';
        return NextResponse.json({ error: msg }, { status: 410 });
      }

      const { link } = validation;
      if (!link.subjectUserId) {
        return NextResponse.json({ error: 'This link is no longer valid.' }, { status: 410 });
      }

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
      }
      const parsed = submitSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.errors[0]?.message ?? 'Please review the form and try again.' },
          { status: 400 },
        );
      }

      const consumed = await consumeTokenizedLink(link.id);
      if (!consumed) {
        return NextResponse.json({ error: 'This link has already been used.' }, { status: 409 });
      }

      const subjectId = link.subjectUserId;
      const now = new Date();
      const profileData = {
        isMinor: true,
        parentGuardianName: parsed.data.guardianName,
        parentGuardianEmail: parsed.data.guardianEmail,
        parentGuardianPhone: parsed.data.guardianPhone?.trim() || null,
        parentalConsentGiven: true,
        parentalConsentDate: now,
      };

      await prisma.profile.upsert({
        where: { userId: subjectId },
        create: { userId: subjectId, ...profileData },
        update: profileData,
      });

      await Promise.resolve(
        auditLog({
          actorUserId: subjectId,
          action: 'guardian_consent_submitted',
          targetType: 'User',
          targetId: subjectId,
          metadata: { linkId: link.id, orgId: link.orgId },
        }),
      ).catch(() => {});
      logAuditEvent({
        user: { id: subjectId, role: 'member' },
        verb: 'submitted',
        object: { type: 'GuardianConsent', id: link.id },
        result: { success: true },
        request: auditRequestMeta(request),
        orgId: link.orgId,
      }).catch(() => {});

      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error('/api/consent/[token] error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
);
