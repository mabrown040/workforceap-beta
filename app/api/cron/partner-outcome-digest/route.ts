import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendPartnerWeeklyDigestEmail } from '@/lib/email';
import { getPipelineStage, PIPELINE_STAGE_LABELS, type PipelineStudent } from '@/lib/pipeline/stage';
import { captureApiError } from '@/lib/observability/captureApiError';
import { logCronRun } from '@/lib/admin/logCronRun';
import { withCronLogging } from '@/lib/cron/withCronLogging';

/**
 * Weekly digest for referral partners: referral counts by stage + weekly wins.
 * Protected with CRON_SECRET. Vercel schedule: Monday 8am CT (see vercel.json).
 */
async function handle(_request: Request) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  const weekLabel = `${weekStart.toLocaleDateString()} – ${now.toLocaleDateString()}`;

  const partners = await prisma.partner.findMany({
    where: { active: true, notifyOnEnrollment: true },
    take: 500,
    select: {
      id: true,
      name: true,
      contactEmail: true,
    },
  });

  const results: Array<{ partnerId: string; name: string; emailSent: boolean; error?: string }> = [];

  for (const p of partners) {
    if (!p.contactEmail?.trim()) {
      results.push({ partnerId: p.id, name: p.name, emailSent: false, error: 'no_contact_email' });
      continue;
    }

    const referrals = await prisma.partnerReferral.findMany({
      where: { partnerId: p.id, member: { deletedAt: null } },
      take: 2000,
      include: {
        member: {
          select: {
            id: true,
            fullName: true,
            email: true,
            enrolledProgram: true,
            enrolledAt: true,
            assessmentCompleted: true,
            coursesCompleted: true,
            deletedAt: true,
            placementRecord: {
              select: { employerName: true, jobTitle: true, salaryOffered: true, placedAt: true },
            },
            userCertifications: { select: { certName: true, earnedAt: true } },
            applications: { select: { status: true, submittedAt: true } },
            memberProgramProgress: {
              select: { programSlug: true, averagePercent: true, coursesCompleted: true },
            },
          },
        },
      },
    });

    const stageCounts: Record<string, number> = {};
    const successLines: string[] = [];

    for (const r of referrals) {
      const m = r.member;
      const student: PipelineStudent = {
        id: m.id,
        fullName: m.fullName,
        email: m.email ?? '',
        enrolledProgram: m.enrolledProgram,
        enrolledAt: m.enrolledAt,
        assessmentCompleted: m.assessmentCompleted,
        coursesCompleted: m.coursesCompleted,
        deletedAt: m.deletedAt,
        placementRecord: m.placementRecord,
        userCertifications: m.userCertifications,
        applications: m.applications,
        memberProgramProgress: m.memberProgramProgress,
      };
      const stage = getPipelineStage(student);
      stageCounts[stage] = (stageCounts[stage] ?? 0) + 1;

      for (const c of m.userCertifications) {
        if (c.earnedAt >= weekStart) {
          successLines.push(`${m.fullName} earned certification: ${c.certName}`);
        }
      }
      const placed = m.placementRecord;
      if (placed?.placedAt && placed.placedAt >= weekStart) {
        const role = placed.jobTitle ? ` as ${placed.jobTitle}` : '';
        successLines.push(`${m.fullName} placed${role}`);
      }
    }

    let stageLines = Object.entries(stageCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([stage, n]) => {
        const label = PIPELINE_STAGE_LABELS[stage as keyof typeof PIPELINE_STAGE_LABELS] ?? stage;
        return `${n} in ${label}`;
      });

    if (stageLines.length === 0) {
      stageLines = ['No active referrals on file'];
    }

    try {
      const sendResult = await sendPartnerWeeklyDigestEmail({
        to: p.contactEmail.trim(),
        partnerName: p.name,
        weekLabel,
        stageLines,
        successLines,
      });

      results.push({
        partnerId: p.id,
        name: p.name,
        emailSent: sendResult.ok,
        error: sendResult.ok ? undefined : sendResult.error,
      });
    } catch (error) {
      captureApiError(error, { route: 'cron/partner-outcome-digest', extra: { partnerId: p.id } });
      results.push({
        partnerId: p.id,
        name: p.name,
        emailSent: false,
        error: error instanceof Error ? error.message : 'send_failed',
      });
    }
  }

  const sent = results.filter(r => r.emailSent).length;
  const skipped = results.filter(r => r.error === 'no_contact_email').length;
  const failed = results.filter(r => r.error && r.error !== 'no_contact_email').length;
  const runResult = { ok: failed === 0, checkedAt: now.toISOString(), sent, skipped, failed, total: results.length };
  await logCronRun('cron_partner_digest', runResult, failed > 0 ? 'error' : 'ok');
  return NextResponse.json({ ok: failed === 0, checkedAt: now.toISOString(), results });
}

export const GET = withCronLogging('cron_partner_digest', handle);
export const POST = withCronLogging('cron_partner_digest', handle);
