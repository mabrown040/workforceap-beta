import { Resend } from 'resend';
import { prisma } from '@/lib/db/prisma';

export type PartnerMilestone =
  | 'Program enrollment'
  | 'Course completed'
  | 'Certification earned'
  | 'Job placement';

function memberFirstName(fullName: string): string {
  const t = fullName.trim();
  if (!t) return 'Member';
  return t.split(/\s+/)[0] ?? t;
}

/**
 * Notifies the referring partner (via PartnerReferral) when a member hits a milestone.
 * No-ops when there is no referral, no contact email, or Resend is not configured.
 */
export async function sendPartnerMilestoneEmail(
  memberId: string,
  milestone: PartnerMilestone,
  details?: Record<string, string | undefined>
): Promise<void> {
  const referral = await prisma.partnerReferral.findFirst({
    where: { memberId },
    include: {
      partner: { select: { contactEmail: true, name: true } },
      member: { select: { fullName: true } },
    },
  });

  if (!referral) return;
  if (!referral.partner.contactEmail?.trim()) return;

  const resendKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM || 'noreply@workforceap.org';
  if (!resendKey) {
    console.warn('sendPartnerMilestoneEmail: RESEND_API_KEY not set');
    return;
  }

  const first = memberFirstName(referral.member.fullName);
  const subject = `[WorkforceAP] Update on ${first} - ${milestone}`;

  const detailLines: string[] = [];
  if (details) {
    for (const [k, v] of Object.entries(details)) {
      if (v) detailLines.push(`${k}: ${v}`);
    }
  }

  const text = [
    `Hello,`,
    '',
    `This is an update regarding ${referral.member.fullName}, referred by ${referral.partner.name}.`,
    '',
    `Milestone: ${milestone}`,
    ...detailLines,
    '',
    '— WorkforceAP',
  ].join('\n');

  try {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: emailFrom,
      to: referral.partner.contactEmail.trim(),
      subject,
      text,
    });
  } catch (err) {
    console.error('sendPartnerMilestoneEmail failed:', err);
  }
}

/**
 * Notifies the partner when a new member is assigned to them.
 * No-ops when partner has no contact email or Resend is not configured.
 */
export async function sendPartnerNewMemberAssignedEmail(
  memberId: string,
  partnerId: string
): Promise<void> {
  try {
    const [member, partner] = await Promise.all([
      prisma.user.findUnique({
        where: { id: memberId },
        select: { fullName: true },
      }),
      prisma.partner.findUnique({
        where: { id: partnerId },
        select: { contactEmail: true, name: true },
      }),
    ]);

    if (!member || !partner?.contactEmail?.trim()) return;

    const resendKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM || 'noreply@workforceap.org';
    if (!resendKey) {
      console.warn('sendPartnerNewMemberAssignedEmail: RESEND_API_KEY not set');
      return;
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org';
    const partnerPortalUrl = `${siteUrl}/partner`;

    const subject = `[WorkforceAP] New member assigned — ${member.fullName || 'Member'}`;
    const text = [
      `Hello,`,
      '',
      `A new member, ${member.fullName || 'Member'}, has been assigned to ${partner.name}.`,
      '',
      `View their profile and progress in the partner portal.`,
      '',
      partnerPortalUrl,
      '',
      '— WorkforceAP',
    ].join('\n');

    try {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: emailFrom,
        to: partner.contactEmail.trim(),
        subject,
        text,
      });
    } catch (err) {
      console.error('sendPartnerNewMemberAssignedEmail failed:', err);
    }
  } catch (err) {
    console.error('sendPartnerNewMemberAssignedEmail: load or send failed:', err);
  }
}
