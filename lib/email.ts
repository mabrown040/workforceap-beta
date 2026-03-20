/**
 * WorkforceAP transactional email send functions.
 * Uses Resend and branded layout from lib/email/template.ts.
 */

import { Resend } from 'resend';
import { brandedEmailLayout } from '@/lib/email/template';
import {
  applicationAcceptedHtml,
  applicationRejectedHtml,
  newApplicationAlertHtml,
  courseEnrolledHtml,
  courseCompletedHtml,
  weeklyRecapHtml,
  inactiveNudgeHtml,
  invitationHtml,
  invitationAcceptedHtml,
} from '@/emails';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org';
const ADMIN_EMAIL = 'info@workforceap.org';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function getFrom(): string {
  return process.env.EMAIL_FROM || 'noreply@workforceap.org';
}

/** Send application accepted email to applicant */
export async function sendApplicationAcceptedEmail(params: {
  to: string;
  fullName: string;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn('sendApplicationAcceptedEmail: RESEND_API_KEY not set');
    return { ok: false, error: 'Email not configured' };
  }
  const first = params.fullName.trim().split(/\s+/)[0] || 'there';
  const html = brandedEmailLayout({
    title: 'Welcome to WorkforceAP - Your Application Was Accepted',
    bodyHtml: applicationAcceptedHtml({ firstName: first }),
    ctaText: 'Go to Dashboard',
    ctaUrl: `${SITE_URL}/dashboard`,
  });
  try {
    await resend.emails.send({
      from: getFrom(),
      to: params.to,
      subject: 'Welcome to WorkforceAP - Your Application Was Accepted',
      html,
    });
    return { ok: true };
  } catch (err) {
    console.error('sendApplicationAcceptedEmail failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}

/** Send application rejected email to applicant */
export async function sendApplicationRejectedEmail(params: {
  to: string;
  fullName: string;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn('sendApplicationRejectedEmail: RESEND_API_KEY not set');
    return { ok: false, error: 'Email not configured' };
  }
  const first = params.fullName.trim().split(/\s+/)[0] || 'there';
  const html = brandedEmailLayout({
    title: 'WorkforceAP Application Update',
    bodyHtml: applicationRejectedHtml({ firstName: first }),
    ctaText: 'Contact Us',
    ctaUrl: `${SITE_URL}/contact`,
  });
  try {
    await resend.emails.send({
      from: getFrom(),
      to: params.to,
      subject: 'WorkforceAP Application Update',
      html,
    });
    return { ok: true };
  } catch (err) {
    console.error('sendApplicationRejectedEmail failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}

/** Send new application admin alert */
export async function sendNewApplicationAdminEmail(params: {
  applicantName: string;
  applicantEmail: string;
  programInterest: string;
  applicationId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn('sendNewApplicationAdminEmail: RESEND_API_KEY not set');
    return { ok: false, error: 'Email not configured' };
  }
  const html = brandedEmailLayout({
    title: `New Application: ${params.applicantName}`,
    bodyHtml: newApplicationAlertHtml(params),
    ctaText: 'Review Application',
    ctaUrl: `${SITE_URL}/admin/members?highlight=${params.applicationId}`,
  });
  try {
    await resend.emails.send({
      from: getFrom(),
      to: ADMIN_EMAIL,
      subject: `New Application: ${params.applicantName}`,
      html,
    });
    return { ok: true };
  } catch (err) {
    console.error('sendNewApplicationAdminEmail failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}

/** Send program enrollment confirmation to member */
export async function sendCourseEnrolledEmail(params: {
  to: string;
  fullName: string;
  programName: string;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn('sendCourseEnrolledEmail: RESEND_API_KEY not set');
    return { ok: false, error: 'Email not configured' };
  }
  const first = params.fullName.trim().split(/\s+/)[0] || 'there';
  const html = brandedEmailLayout({
    title: `You're Enrolled: ${params.programName}`,
    bodyHtml: courseEnrolledHtml({ firstName: first, programName: params.programName }),
    ctaText: 'View Training',
    ctaUrl: `${SITE_URL}/dashboard/training`,
  });
  try {
    await resend.emails.send({
      from: getFrom(),
      to: params.to,
      subject: `You're Enrolled: ${params.programName}`,
      html,
    });
    return { ok: true };
  } catch (err) {
    console.error('sendCourseEnrolledEmail failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}

/** Send course completion congratulations to member */
export async function sendCourseCompletedEmail(params: {
  to: string;
  fullName: string;
  courseName: string;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn('sendCourseCompletedEmail: RESEND_API_KEY not set');
    return { ok: false, error: 'Email not configured' };
  }
  const first = params.fullName.trim().split(/\s+/)[0] || 'there';
  const html = brandedEmailLayout({
    title: `Congratulations! You Completed ${params.courseName}`,
    bodyHtml: courseCompletedHtml({ firstName: first, courseName: params.courseName }),
    ctaText: 'View Progress',
    ctaUrl: `${SITE_URL}/dashboard/training`,
  });
  try {
    await resend.emails.send({
      from: getFrom(),
      to: params.to,
      subject: `Congratulations! You Completed ${params.courseName}`,
      html,
    });
    return { ok: true };
  } catch (err) {
    console.error('sendCourseCompletedEmail failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}

/** Send weekly recap to member */
export async function sendWeeklyRecapEmail(params: {
  to: string;
  fullName: string;
  recapSummary: string;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn('sendWeeklyRecapEmail: RESEND_API_KEY not set');
    return { ok: false, error: 'Email not configured' };
  }
  const first = params.fullName.trim().split(/\s+/)[0] || 'there';
  const html = brandedEmailLayout({
    title: 'Your WorkforceAP Weekly Recap',
    bodyHtml: weeklyRecapHtml({ firstName: first, recapSummary: params.recapSummary }),
    ctaText: 'View Full Recap',
    ctaUrl: `${SITE_URL}/dashboard/weekly-recap`,
  });
  try {
    await resend.emails.send({
      from: getFrom(),
      to: params.to,
      subject: 'Your WorkforceAP Weekly Recap',
      html,
    });
    return { ok: true };
  } catch (err) {
    console.error('sendWeeklyRecapEmail failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}

/** Send invitation email to invitee */
export async function sendInvitationEmail(params: {
  to: string;
  inviterName: string;
  role: string;
  personalMessage?: string | null;
  inviteUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn('sendInvitationEmail: RESEND_API_KEY not set');
    return { ok: false, error: 'Email not configured' };
  }
  const html = brandedEmailLayout({
    title: `${params.inviterName} invited you to join WorkforceAP`,
    bodyHtml: invitationHtml({
      inviterName: params.inviterName,
      role: params.role,
      personalMessage: params.personalMessage,
    }),
    ctaText: 'Accept Invitation',
    ctaUrl: params.inviteUrl,
  });
  try {
    await resend.emails.send({
      from: getFrom(),
      to: params.to,
      subject: `${params.inviterName} invited you to join WorkforceAP`,
      html,
    });
    return { ok: true };
  } catch (err) {
    console.error('sendInvitationEmail failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}

/** Send invitation accepted notification to inviter */
export async function sendInvitationAcceptedEmail(params: {
  to: string;
  accepterName: string;
  accepterEmail: string;
  role: string;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn('sendInvitationAcceptedEmail: RESEND_API_KEY not set');
    return { ok: false, error: 'Email not configured' };
  }
  const html = brandedEmailLayout({
    title: `${params.accepterName} accepted your WorkforceAP invitation`,
    bodyHtml: invitationAcceptedHtml({
      accepterName: params.accepterName,
      accepterEmail: params.accepterEmail,
      role: params.role,
    }),
    ctaText: 'View in Admin',
    ctaUrl: `${SITE_URL}/admin/invites`,
  });
  try {
    await resend.emails.send({
      from: getFrom(),
      to: params.to,
      subject: `${params.accepterName} accepted your WorkforceAP invitation`,
      html,
    });
    return { ok: true };
  } catch (err) {
    console.error('sendInvitationAcceptedEmail failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}

/** Send inactive member nudge */
export async function sendInactiveNudgeEmail(params: {
  to: string;
  fullName: string;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn('sendInactiveNudgeEmail: RESEND_API_KEY not set');
    return { ok: false, error: 'Email not configured' };
  }
  const first = params.fullName.trim().split(/\s+/)[0] || 'there';
  const html = brandedEmailLayout({
    title: 'We Miss You at WorkforceAP',
    bodyHtml: inactiveNudgeHtml({ firstName: first }),
    ctaText: 'Resume Learning',
    ctaUrl: `${SITE_URL}/dashboard`,
  });
  try {
    await resend.emails.send({
      from: getFrom(),
      to: params.to,
      subject: 'We Miss You at WorkforceAP',
      html,
    });
    return { ok: true };
  } catch (err) {
    console.error('sendInactiveNudgeEmail failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}
