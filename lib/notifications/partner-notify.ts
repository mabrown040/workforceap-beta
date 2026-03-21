import { Resend } from 'resend';
import { prisma } from '@/lib/db/prisma';
import { brandedEmailLayout } from '@/lib/email/template';

export type MilestoneType = 'program_enrolled' | 'course_completed' | 'certified' | 'placed';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org';

const MILESTONE_LABELS: Record<MilestoneType, string> = {
  program_enrolled: 'Enrolled in a Program',
  course_completed: 'Completed a Course',
  certified: 'Earned a Certification',
  placed: 'Placed in a Job',
};

export async function sendPartnerMilestoneEmail(
  memberId: string,
  milestone: MilestoneType,
  details: { programTitle?: string; courseName?: string; certName?: string; employerName?: string; jobTitle?: string } = {}
) {
  const resendKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM || 'noreply@workforceap.org';
  if (!resendKey) {
    console.warn('[partner-notify] RESEND_API_KEY not set, skipping notification');
    return;
  }

  // Find all partner referrals for this member
  const referrals = await prisma.partnerReferral.findMany({
    where: { memberId },
    include: {
      partner: true,
      member: { select: { fullName: true, enrolledProgram: true } },
    },
  });

  if (referrals.length === 0) return;

  const resend = new Resend(resendKey);

  for (const referral of referrals) {
    const partner = referral.partner;
    if (!partner.contactEmail || !partner.active) continue;

    // Check notification preferences
    if (milestone === 'program_enrolled' && !partner.notifyOnEnrollment) continue;
    if (milestone === 'course_completed' && !partner.notifyOnCourse) continue;
    if (milestone === 'certified' && !partner.notifyOnCertified) continue;
    if (milestone === 'placed' && !partner.notifyOnPlaced) continue;

    const memberName = referral.member.fullName;
    const firstName = memberName.split(' ')[0];
    const milestoneLabel = MILESTONE_LABELS[milestone];

    let updateDescription = milestoneLabel;
    if (milestone === 'program_enrolled' && details.programTitle) {
      updateDescription = `Enrolled in ${details.programTitle}`;
    } else if (milestone === 'course_completed' && details.courseName) {
      updateDescription = `Completed course: ${details.courseName}`;
    } else if (milestone === 'certified' && details.certName) {
      updateDescription = `Earned certification: ${details.certName}`;
    } else if (milestone === 'placed' && details.employerName) {
      updateDescription = `Placed at ${details.employerName}${details.jobTitle ? ` as ${details.jobTitle}` : ''}`;
    }

    const programTitle = details.programTitle ?? referral.member.enrolledProgram ?? 'N/A';
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const bodyHtml = `
      <p>Hi ${partner.contactName || 'Partner'},</p>
      <p>Here's an update on a member you referred to WorkforceAP:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">
        <tr><td style="padding: 0.5rem 0; color: #666; width: 100px;">Member</td><td style="padding: 0.5rem 0; font-weight: 600;">${memberName}</td></tr>
        <tr><td style="padding: 0.5rem 0; color: #666;">Program</td><td style="padding: 0.5rem 0;">${programTitle}</td></tr>
        <tr><td style="padding: 0.5rem 0; color: #666;">Update</td><td style="padding: 0.5rem 0;">${updateDescription}</td></tr>
        <tr><td style="padding: 0.5rem 0; color: #666;">Date</td><td style="padding: 0.5rem 0;">${today}</td></tr>
      </table>
      <p>You can view their full progress by logging into your partner portal.</p>
      <p style="color: #666;">— WorkforceAP Team</p>
    `;

    const html = brandedEmailLayout({
      title: `Update on ${firstName} — ${milestoneLabel}`,
      bodyHtml,
      ctaText: 'View Partner Portal',
      ctaUrl: `${SITE_URL}/partner`,
    });

    try {
      await resend.emails.send({
        from: emailFrom,
        to: partner.contactEmail,
        subject: `[WorkforceAP] Update on ${firstName} — ${milestoneLabel}`,
        html,
      });
    } catch (err) {
      console.error(`[partner-notify] Failed to send email to ${partner.contactEmail}:`, err);
    }
  }
}
