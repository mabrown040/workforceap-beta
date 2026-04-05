import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendPartnerWeeklyDigestEmail } from '@/lib/email';
import { getPipelineStage, PIPELINE_STAGE_LABELS, type PipelineStudent } from '@/lib/pipeline/stage';

/**
 * Weekly digest for referral partners: referral counts by stage + weekly wins.
 * Protected with CRON_SECRET. Vercel schedule: Monday 8am CT (see vercel.json).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    const weekLabel = `${weekStart.toLocaleDateString()} – ${now.toLocaleDateString()}`;

    const partners = await prisma.partner.findMany({
      where: { active: true, notifyOnEnrollment: true },
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
    }

    return NextResponse.json({ ok: true, checkedAt: now.toISOString(), results });
  } catch (error) {
    console.error('[partner-outcome-digest]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
