import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import {
  validateTokenizedLink,
  consumeTokenizedLink,
} from '@/lib/tokenizedLink';
import { checkPublicQuestionnaireSubmitRateLimit } from '@/lib/rate-limit';
import { auditLog } from '@/lib/audit';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';
import { normalizeHearAbout, normalizeYesNo } from '@/lib/apply/eligibilityExtendedFields';

/**
 * POST /api/q/[token]/submit
 *
 * PUBLIC (no-account) submit for the tokenized eligibility questionnaire.
 *
 * Security:
 *  - NO auth. The single-use token is the only credential. It is validated
 *    server-side AND atomically consumed BEFORE any write, so the link is
 *    single-use even under concurrent submits.
 *  - Per-IP rate limited (5/min) to cap abuse on the public path.
 *  - Expiry is enforced by validateTokenizedLink.
 *  - A bound link only ever writes its own subjectUserId — no cross-member
 *    access. A no-account lead is recorded to the audit log (no auth account
 *    is created).
 */
const AGE_GROUP_VALUES = ['18_24', '25_50', '50_plus'] as const;

const submitSchema = z.object({
  firstName: z.string().trim().max(100).optional().nullable(),
  lastName: z.string().trim().max(100).optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  email: z.string().trim().max(200).optional().nullable(),
  ageGroup: z.enum(AGE_GROUP_VALUES).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  state: z.string().trim().max(50).optional().nullable(),
  zip: z.string().trim().max(20).optional().nullable(),
  county: z.string().trim().max(100).optional().nullable(),
  primaryBarriers: z.array(z.string().trim().max(100)).max(20).optional().nullable(),
  q1: z.enum(['yes', 'no']).optional().nullable(),
  q2: z.enum(['yes', 'no']).optional().nullable(),
  q3: z.enum(['yes', 'no']).optional().nullable(),
  receivingUnemployment: z.enum(['yes', 'no']).optional().nullable(),
  exhaustedUnemployment: z.enum(['yes', 'no']).optional().nullable(),
  layoffCompany: z.string().trim().max(200).optional().nullable(),
  snapWic: z.enum(['yes', 'no']).optional().nullable(),
  hearAbout: z.string().trim().max(200).optional().nullable(),
  hearAboutOther: z.string().trim().max(200).optional().nullable(),
  partnerAmbassadorReferral: z.string().trim().max(200).optional().nullable(),
});

type EligibilityFormMeta = {
  version: 1;
  updatedAt: string;
  ageGroup: string | null;
  county: string | null;
  q1: string | null;
  q2: string | null;
  q3: string | null;
  receivingUnemployment: string | null;
  exhaustedUnemployment: string | null;
  layoffCompany: string | null;
  snapWic: string | null;
  hearAbout: string | null;
  hearAboutOther: string | null;
  partnerAmbassadorReferral: string | null;
};

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
      const validation = await validateTokenizedLink(token, 'eligibility_questionnaire');
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

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
      }
      const parsed = submitSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.errors[0]?.message ?? 'Please review your answers and try again.' },
          { status: 400 },
        );
      }
      const data = parsed.data;
      const barrierTypes = (data.primaryBarriers ?? [])
        .map((b) => b.trim())
        .filter((b) => b && b !== 'none');
      const extendedMeta = {
        q1: normalizeYesNo(data.q1),
        q2: normalizeYesNo(data.q2),
        q3: normalizeYesNo(data.q3),
        receivingUnemployment: normalizeYesNo(data.receivingUnemployment),
        exhaustedUnemployment: normalizeYesNo(data.exhaustedUnemployment),
        layoffCompany: data.layoffCompany?.trim() ? data.layoffCompany.trim().slice(0, 200) : null,
        snapWic: normalizeYesNo(data.snapWic),
        hearAbout: normalizeHearAbout(data.hearAbout),
        hearAboutOther: normalizeHearAbout(data.hearAboutOther),
        partnerAmbassadorReferral: data.partnerAmbassadorReferral?.trim()
          ? data.partnerAmbassadorReferral.trim().slice(0, 200)
          : null,
      };

      // Atomic single-use consume BEFORE the write, so concurrent submits
      // can never both persist. If this call did not flip consumedAt, the
      // link was already used.
      const consumed = await consumeTokenizedLink(link.id);
      if (!consumed) {
        return NextResponse.json({ error: 'This link has already been used.' }, { status: 409 });
      }

      if (link.subjectUserId) {
        // Bound link: write ONLY this member's profile + WIOA snapshot. Mirrors
        // /api/member/eligibility. No other member is ever touched.
        const subjectId = link.subjectUserId;
        await prisma.$transaction(async (tx) => {
          const profileData: Record<string, unknown> = {
            city: data.city?.trim() || null,
            state: data.state?.trim() || null,
            zip: data.zip?.trim() || null,
            barrierTypes,
            hasEmploymentBarrier: barrierTypes.length > 0,
          };
          await tx.profile.upsert({
            where: { userId: subjectId },
            create: { userId: subjectId, ...profileData },
            update: profileData,
          });

          const current = await tx.user.findUnique({
            where: { id: subjectId },
            select: { wioaQualificationJson: true, organizationId: true },
          });
          const existing =
            (current?.wioaQualificationJson as Record<string, unknown> | null) ?? {};
          const meta: EligibilityFormMeta = {
            version: 1,
            updatedAt: new Date().toISOString(),
            ageGroup: data.ageGroup ?? null,
            county: data.county?.trim() || null,
            ...extendedMeta,
          };
          await tx.user.update({
            where: { id: subjectId },
            data: { wioaQualificationJson: { ...existing, eligibilityForm: meta } as object },
          });

          if (extendedMeta.q1 && extendedMeta.q2 && current?.organizationId) {
            const yesCount = [extendedMeta.q1, extendedMeta.q2, extendedMeta.q3].filter(
              (v) => v === 'yes',
            ).length;
            const screening = {
              organizationId: current.organizationId,
              q1: extendedMeta.q1,
              q2: extendedMeta.q2,
              q3: extendedMeta.q3,
              qualifies: yesCount >= 1,
              yesCount,
              receivingUnemployment: extendedMeta.receivingUnemployment,
              exhaustedUnemployment: extendedMeta.exhaustedUnemployment,
              layoffCompany: extendedMeta.layoffCompany,
              snapWic: extendedMeta.snapWic,
              hearAbout: extendedMeta.hearAbout,
              hearAboutOther: extendedMeta.hearAboutOther,
              partnerAmbassadorReferral: extendedMeta.partnerAmbassadorReferral,
            };
            await tx.applyEligibilityScreening.upsert({
              where: { userId: subjectId },
              create: { userId: subjectId, ...screening },
              update: screening,
            });
          }
        });
        auditLog({
          actorUserId: link.subjectUserId,
          action: 'member_eligibility_questionnaire_submitted',
          targetType: 'User',
          targetId: link.subjectUserId,
          metadata: { linkId: link.id, orgId: link.orgId, ageGroup: data.ageGroup ?? null },
        }).catch(() => {});
        logAuditEvent({
          user: { id: link.subjectUserId, role: 'member' },
          verb: 'submitted',
          object: { type: 'EligibilityQuestionnaire', id: link.id },
          result: { success: true, extensions: { ageGroup: data.ageGroup ?? null } },
          request: auditRequestMeta(request),
          orgId: link.orgId,
        }).catch(() => {});
      } else {
        // No-account lead: do NOT create a Supabase auth account or a User
        // FK row. Record the submission to the audit log so an admin can see
        // it (audit_logs.actorUserId is nullable). Keyed to the token's id +
        // email, with the full eligibility answers in metadata.
        await auditLog({
          actorUserId: null,
          action: 'public_eligibility_lead_submitted',
          targetType: 'tokenized_link',
          targetId: link.id,
          actorEmailSnapshot: null,
          actorRoleSnapshot: null,
          metadata: {
            orgId: link.orgId,
            email: data.email?.trim() || link.email || null,
            firstName: data.firstName?.trim() || null,
            lastName: data.lastName?.trim() || null,
            phone: data.phone?.trim() || null,
            ageGroup: data.ageGroup ?? null,
            city: data.city?.trim() || null,
            state: data.state?.trim() || null,
            zip: data.zip?.trim() || null,
            county: data.county?.trim() || null,
            primaryBarriers: barrierTypes,
            ...extendedMeta,
          },
        });
      }

      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error('/api/q/[token]/submit error:', error);
      return NextResponse.json({ error: 'We could not save your answers. Please try again.' }, { status: 500 });
    }
  },
);
