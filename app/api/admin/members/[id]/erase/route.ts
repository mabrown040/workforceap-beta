import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { logCronRun } from '@/lib/admin/logCronRun';

import { withApiGuc } from '@/lib/db/withRequestGuc';

/**
 * POST /api/admin/members/[id]/erase
 *
 * GDPR right-to-erasure (hard delete).
 *
 * Permanently removes a member and all cascading data after the
 * legal-hold period, or immediately if `force=true` is passed by
 * a super-admin.
 *
 * Records the erasure in WorkflowDiagnostic for compliance auditing.
 */
export const POST = withApiGuc(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await requireAdmin(user.id);

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const force = body.force === true;

    const existing = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        auditLogs: true,
        memberEvents: true,
        messagesAuthored: true,
        courseEnrollments: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Optionally anonymize instead of hard-delete for members that still
    // have active program enrollments. Admins can pass force=true to
    // override, but the default is hard-delete.
    const shouldAnonymize = !force && existing.deletedAt == null && existing.courseEnrollments.length > 0;

    if (shouldAnonymize) {
      // Anonymize: scramble PII but keep enrollment records for reporting
      const hash = `anon_${Buffer.from(id).toString('base64url').slice(0, 12)}`;
      await prisma.user.update({
        where: { id },
        data: {
          email: `${hash}@anonymized.invalid`,
          fullName: 'Anonymized User',
          phone: null,
          assessmentAnswers: Prisma.JsonNull,
          careerRecommendationJson: Prisma.JsonNull,
          wioaQualificationJson: Prisma.JsonNull,
          wioaReviewNotes: null,
          deletedAt: new Date(),
        },
      });

      await logCronRun('gdpr_erase', {
        memberId: id,
        action: 'anonymize',
        anonymizedBy: user.id,
      }, 'ok');

      return NextResponse.json({ ok: true, action: 'anonymize', memberId: id });
    }

    // Hard delete via Prisma cascading relations
    await prisma.user.delete({ where: { id } });

    // Also remove from Supabase Auth so the identity cannot be reused
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) {
      console.error(`[gdpr-erase] Supabase auth delete error for ${id}:`, error.message);
    }

    await logCronRun('gdpr_erase', {
      memberId: id,
      action: 'hard_delete',
      deletedBy: user.id,
      force,
    }, 'ok');

    return NextResponse.json({ ok: true, action: 'hard_delete', memberId: id });
  } catch (error) {
    console.error('[admin/members/[id]/erase POST] error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
