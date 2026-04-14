import { Resend } from 'resend';
import { barrierLabel, type WioaQualificationSnapshot } from '@/lib/wioa/wioaQualification';

const NOTIFY_EMAIL = process.env.WIOA_SCREENING_NOTIFY_EMAIL ?? 'info@workforceap.org';

export type WioaScreeningNotificationContact = {
  fullName: string;
  email: string;
  phone?: string | null;
};

export async function sendWioaScreeningNotification(params: {
  source: 'member_portal' | 'public_page';
  contact: WioaScreeningNotificationContact;
  snapshot: WioaQualificationSnapshot;
  userId?: string | null;
  adminUrl?: string | null;
}): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return false;

  const resend = new Resend(resendKey);
  const emailFrom = process.env.EMAIL_FROM || 'noreply@workforceap.org';
  const { source, contact, snapshot, userId, adminUrl } = params;
  const { answers, signal, reasons, submittedAt } = snapshot;
  const sourceLabel = source === 'member_portal' ? 'Member portal screening' : 'Public WIOA screening';

  try {
    await resend.emails.send({
      from: emailFrom,
      to: NOTIFY_EMAIL,
      subject: `${sourceLabel} — ${contact.fullName}`,
      text: [
        `Source: ${sourceLabel}`,
        `Name: ${contact.fullName}`,
        `Email: ${contact.email}`,
        `Phone: ${contact.phone?.trim() || '(not provided)'}`,
        `Signal (heuristic): ${signal}`,
        `Submitted: ${submittedAt}`,
        userId ? `User ID: ${userId}` : null,
        '',
        'Answers:',
        `• Age group: ${answers.ageBracket}`,
        `• County / ZIP: ${answers.countyOrZip || '(not provided)'}`,
        `• Primary barrier: ${barrierLabel(answers.primaryBarrier)}`,
        `• Unemployed / laid off: ${answers.dislocatedWorker ? 'Yes' : 'No'}`,
        `• Low income self-report: ${answers.lowIncomeSelfReport ? 'Yes' : 'No'}`,
        `• Interested in training: ${answers.trainingInterest ? 'Yes' : 'No'}`,
        `• Completed intake already: ${answers.completedIntakeSelfReport ? 'Yes' : 'No'}`,
        '',
        'Reasons shown on screen:',
        ...reasons.map((reason) => `• ${reason}`),
        adminUrl ? '' : null,
        adminUrl ? `Admin: ${adminUrl}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
    });
    return true;
  } catch (err) {
    console.error('[wioa-notification] email failed:', err);
    return false;
  }
}
