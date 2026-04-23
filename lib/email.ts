/**
 * WorkforceAP transactional email send functions.
 * Uses Resend and branded layout from lib/email/template.ts.
 */

import { Resend } from 'resend';
import { brandedEmailLayout } from '@/lib/email/template';
import { escapeHtml, sanitizeEmailSubjectLine } from '@/lib/email/escapeHtml';
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
  jobSubmittedHtml,
  jobApprovedHtml,
  jobRejectedHtml,
  newJobApplicationHtml,
  aiMatchSuggestionHtml,
  applicationConfirmationHtml,
  applicantFollowupHtml,
  adminPendingApplicantsHtml,
  adminWeeklyRecapHtml,
  enrollmentConfirmationHtml,
  partnerWeeklyDigestHtml,
  counselorAssignedHtml,
  partnerReferralInviteHtml,
} from '@/emails';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org';
const ADMIN_EMAIL = 'info@workforceap.org';
const DEFAULT_VOICE_COACH_TRANSCRIPT_RECIPIENTS = [
  'michael.brown@workforceap.org',
  'michael.brown2@workforceap.org',
];

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function getFrom(): string {
  return process.env.EMAIL_FROM || 'noreply@workforceap.org';
}

export function getVoiceCoachTranscriptRecipients(extra: string[] = []): string[] {
  const configured = [
    process.env.VOICE_COACH_TRANSCRIPT_EMAILS ?? '',
    process.env.VOICE_INTERVIEW_TRANSCRIPT_EMAILS ?? '',
  ]
    .flatMap((value) => value.split(','))
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(
    new Set(
      [...DEFAULT_VOICE_COACH_TRANSCRIPT_RECIPIENTS, ...configured, ...extra]
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

export async function sendVoiceCoachTranscriptEmail(params: {
  to: string[];
  memberName: string;
  memberEmail?: string | null;
  coachLabel: string;
  transcriptTurns: { role: 'agent' | 'user'; text: string }[];
  highlights?: string[];
  sessionId?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn('sendVoiceCoachTranscriptEmail: RESEND_API_KEY not set');
    return { ok: false, error: 'Email not configured' };
  }

  const recipients = Array.from(
    new Set(
      params.to
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    )
  );
  if (recipients.length === 0) {
    return { ok: false, error: 'No recipients configured' };
  }

  const transcriptHtml = params.transcriptTurns.length
    ? params.transcriptTurns
        .map((turn) => {
          const speaker = turn.role === 'agent' ? 'Coach' : 'Member';
          return `<p style="margin:0 0 0.75rem;"><strong>${speaker}:</strong> ${escapeHtml(turn.text)}</p>`;
        })
        .join('')
    : '<p style="margin:0;">No transcript turns were captured.</p>';

  const highlightsHtml = params.highlights?.length
    ? `<p><strong>Highlights</strong></p><ul>${params.highlights
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join('')}</ul>`
    : '';

  const bodyHtml = `
    <p>A voice coach transcript was saved and emailed automatically.</p>
    <ul>
      <li><strong>Coach:</strong> ${escapeHtml(params.coachLabel)}</li>
      <li><strong>Member:</strong> ${escapeHtml(params.memberName)}</li>
      ${params.memberEmail ? `<li><strong>Member email:</strong> ${escapeHtml(params.memberEmail)}</li>` : ''}
      ${params.sessionId ? `<li><strong>Session ID:</strong> ${escapeHtml(params.sessionId)}</li>` : ''}
    </ul>
    ${highlightsHtml}
    <p><strong>Transcript</strong></p>
    <div style="padding:16px;border-radius:12px;background:#f8f5f3;border:1px solid #eadfdb;">${transcriptHtml}</div>
  `;

  const html = brandedEmailLayout({
    title: `${params.coachLabel} transcript`,
    bodyHtml,
    ctaText: 'Open admin',
    ctaUrl: `${SITE_URL}/admin`,
  });

  try {
    await resend.emails.send({
      from: getFrom(),
      to: recipients,
      subject: sanitizeEmailSubjectLine(`${params.coachLabel} transcript — ${params.memberName}`),
      html,
    });
    return { ok: true };
  } catch (err) {
    console.error('sendVoiceCoachTranscriptEmail failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}

export async function sendVoiceCoachArtifactEmail(params: {
  to: string[];
  memberName: string;
  memberEmail?: string | null;
  coachLabel: string;
  artifactTitle: string;
  artifactBody: string;
  highlights?: string[];
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn('sendVoiceCoachArtifactEmail: RESEND_API_KEY not set');
    return { ok: false, error: 'Email not configured' };
  }

  const recipients = Array.from(
    new Set(
      params.to
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    )
  );
  if (recipients.length === 0) {
    return { ok: false, error: 'No recipients configured' };
  }

  const highlightsHtml = params.highlights?.length
    ? `<p><strong>Highlights</strong></p><ul>${params.highlights
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join('')}</ul>`
    : '';

  const bodyHtml = `
    <p>A voice coach artifact was saved and emailed automatically.</p>
    <ul>
      <li><strong>Coach:</strong> ${escapeHtml(params.coachLabel)}</li>
      <li><strong>Member:</strong> ${escapeHtml(params.memberName)}</li>
      ${params.memberEmail ? `<li><strong>Member email:</strong> ${escapeHtml(params.memberEmail)}</li>` : ''}
    </ul>
    ${highlightsHtml}
    <p><strong>${escapeHtml(params.artifactTitle)}</strong></p>
    <div style="padding:16px;border-radius:12px;background:#f8f5f3;border:1px solid #eadfdb;white-space:pre-wrap;">${escapeHtml(params.artifactBody)}</div>
  `;

  const html = brandedEmailLayout({
    title: `${params.coachLabel} artifact`,
    bodyHtml,
    ctaText: 'Open admin',
    ctaUrl: `${SITE_URL}/admin`,
  });

  try {
    await resend.emails.send({
      from: getFrom(),
      to: recipients,
      subject: sanitizeEmailSubjectLine(`${params.coachLabel} artifact — ${params.memberName}`),
      html,
    });
    return { ok: true };
  } catch (err) {
    console.error('sendVoiceCoachArtifactEmail failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}

export async function sendVoiceInterviewTranscriptEmail(params: {
  to: string[];
  memberName: string;
  memberEmail?: string | null;
  role: string;
  interviewType: string;
  transcriptTurns: { role: 'agent' | 'user'; text: string }[];
  feedback?: string;
  sessionId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn('sendVoiceInterviewTranscriptEmail: RESEND_API_KEY not set');
    return { ok: false, error: 'Email not configured' };
  }

  const recipients = Array.from(
    new Set(
      params.to
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    )
  );
  if (recipients.length === 0) {
    return { ok: false, error: 'No recipients configured' };
  }

  const transcriptHtml = params.transcriptTurns.length
    ? params.transcriptTurns
        .map((turn) => {
          const speaker = turn.role === 'agent' ? 'Interviewer' : 'Candidate';
          return `<p style="margin:0 0 0.75rem;"><strong>${speaker}:</strong> ${escapeHtml(turn.text)}</p>`;
        })
        .join('')
    : '<p style="margin:0;">No transcript turns were captured.</p>';

  const bodyHtml = `
    <p>A voice interview transcript was saved and emailed automatically.</p>
    <ul>
      <li><strong>Member:</strong> ${escapeHtml(params.memberName)}</li>
      ${params.memberEmail ? `<li><strong>Member email:</strong> ${escapeHtml(params.memberEmail)}</li>` : ''}
      <li><strong>Target role:</strong> ${escapeHtml(params.role)}</li>
      <li><strong>Interview type:</strong> ${escapeHtml(params.interviewType)}</li>
      <li><strong>Session ID:</strong> ${escapeHtml(params.sessionId)}</li>
    </ul>
    ${params.feedback ? `<p><strong>Coaching feedback</strong></p><p style="white-space:pre-wrap;">${escapeHtml(params.feedback)}</p>` : ''}
    <p><strong>Transcript</strong></p>
    <div style="padding:16px;border-radius:12px;background:#f8f5f3;border:1px solid #eadfdb;">${transcriptHtml}</div>
  `;

  const html = brandedEmailLayout({
    title: 'Voice interview transcript',
    bodyHtml,
    ctaText: 'Open admin',
    ctaUrl: `${SITE_URL}/admin`,
  });

  try {
    await resend.emails.send({
      from: getFrom(),
      to: recipients,
      subject: sanitizeEmailSubjectLine(`Voice interview transcript — ${params.memberName} — ${params.role}`),
      html,
    });
    return { ok: true };
  } catch (err) {
    console.error('sendVoiceInterviewTranscriptEmail failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}

export async function sendElevatorSpeechEmail(params: {
  to: string;
  memberName: string;
  targetRole: string;
  strengths?: string | null;
  certifications?: string | null;
  industry?: string | null;
  pitch: string;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn('sendElevatorSpeechEmail: RESEND_API_KEY not set');
    return { ok: false, error: 'Email not configured' };
  }

  const to = params.to.trim().toLowerCase();
  if (!to) return { ok: false, error: 'No recipient configured' };

  const bodyHtml = `
    <p>Your AI elevator speech is ready.</p>
    <ul>
      <li><strong>Member:</strong> ${escapeHtml(params.memberName)}</li>
      <li><strong>Target role:</strong> ${escapeHtml(params.targetRole)}</li>
      ${params.industry?.trim() ? `<li><strong>Industry:</strong> ${escapeHtml(params.industry.trim())}</li>` : ''}
      ${params.certifications?.trim() ? `<li><strong>Certifications:</strong> ${escapeHtml(params.certifications.trim())}</li>` : ''}
      ${params.strengths?.trim() ? `<li><strong>Strengths:</strong> ${escapeHtml(params.strengths.trim())}</li>` : ''}
    </ul>
    <p><strong>Your elevator speech</strong></p>
    <div style="padding:16px;border-radius:12px;background:#f8f5f3;border:1px solid #eadfdb;">
      <p style="margin:0;font-size:1rem;line-height:1.7;color:#231f20;">${escapeHtml(params.pitch)}</p>
    </div>
    <p style="margin-top:1rem;">Open the AI Toolkit to rehearse it, copy it, or record yourself delivering it.</p>
  `;

  const html = brandedEmailLayout({
    title: 'Your AI elevator speech is ready',
    bodyHtml,
    ctaText: 'Open AI Toolkit',
    ctaUrl: `${SITE_URL}/dashboard/ai-tools/elevator-pitch`,
  });

  try {
    await resend.emails.send({
      from: getFrom(),
      to,
      subject: sanitizeEmailSubjectLine(`Your AI elevator speech — ${params.targetRole}`),
      html,
    });
    return { ok: true };
  } catch (err) {
    console.error('sendElevatorSpeechEmail failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}

/** Notify member when a counselor is assigned (member portal Messages) */
export async function sendCounselorAssignedEmail(params: {
  to: string;
  memberFullName: string;
  counselorFullName: string;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn('sendCounselorAssignedEmail: RESEND_API_KEY not set');
    return { ok: false, error: 'Email not configured' };
  }
  const first = params.memberFullName.trim().split(/\s+/)[0] || 'there';
  const messagesUrl = `${SITE_URL}/dashboard/messages`;
  const html = brandedEmailLayout({
    title: 'Your WorkforceAP counselor is assigned',
    bodyHtml: counselorAssignedHtml({
      firstName: first,
      counselorName: params.counselorFullName,
      messagesUrl,
    }),
    ctaText: 'Message your counselor',
    ctaUrl: messagesUrl,
  });
  try {
    await resend.emails.send({
      from: getFrom(),
      to: params.to,
      subject: sanitizeEmailSubjectLine(`WorkforceAP — ${params.counselorFullName} is your counselor`),
      html,
    });
    return { ok: true };
  } catch (err) {
    console.error('sendCounselorAssignedEmail failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}

/** Send enrollment confirmation when admin approves an application */
export async function sendEnrollmentConfirmationEmail(params: {
  to: string;
  fullName: string;
  programName: string;
  counselorContact?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn('sendEnrollmentConfirmationEmail: RESEND_API_KEY not set');
    return { ok: false, error: 'Email not configured' };
  }
  const first = params.fullName.trim().split(/\s+/)[0] || 'there';
  const counselorContact = params.counselorContact?.trim() || 'info@workforceap.org';
  const html = brandedEmailLayout({
    title: 'You are approved — next steps inside your member portal',
    bodyHtml: enrollmentConfirmationHtml({
      firstName: first,
      programName: params.programName,
      counselorContact,
    }),
    ctaText: 'Open member portal',
    ctaUrl: `${SITE_URL}/dashboard`,
  });
  try {
    await resend.emails.send({
      from: getFrom(),
      to: params.to,
      subject: 'WorkforceAP — you are approved (next steps)',
      html,
    });
    return { ok: true };
  } catch (err) {
    console.error('sendEnrollmentConfirmationEmail failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
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
export async function sendPreScreeningReadyEmail(params: {
  memberName?: string;
  memberEmail: string;
  goal: string;
  weeklyHours: string;
  barrierSummary: string;
  memberId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn('sendPreScreeningReadyEmail: RESEND_API_KEY not set');
    return { ok: false, error: 'Email not configured' };
  }
  const name = params.memberName?.trim() || 'Member';
  const bodyHtml = `
    <p><strong>${escapeHtml(name)}</strong> completed pre-screening and is <strong>interview eligible</strong>.</p>
    <ul>
      <li><strong>Email:</strong> ${escapeHtml(params.memberEmail)}</li>
      <li><strong>Primary goal:</strong> ${escapeHtml(params.goal)}</li>
      <li><strong>Weekly time:</strong> ${escapeHtml(params.weeklyHours)}</li>
      <li><strong>Barrier (preview):</strong> ${escapeHtml(params.barrierSummary)}</li>
    </ul>
  `;
  const html = brandedEmailLayout({
    title: 'Member ready for interview (pre-screening)',
    bodyHtml,
    ctaText: 'Open member in admin',
    ctaUrl: `${SITE_URL}/admin/members/${encodeURIComponent(params.memberId)}`,
  });
  try {
    await resend.emails.send({
      from: getFrom(),
      to: ADMIN_EMAIL,
      subject: sanitizeEmailSubjectLine(`Interview ready: ${name}`),
      html,
    });
    return { ok: true };
  } catch (err) {
    console.error('sendPreScreeningReadyEmail failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}

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
    ctaUrl: `${SITE_URL}/admin/members?highlight=${encodeURIComponent(params.applicationId)}`,
  });
  try {
    await resend.emails.send({
      from: getFrom(),
      to: ADMIN_EMAIL,
      subject: sanitizeEmailSubjectLine(`New Application: ${params.applicantName}`),
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
      subject: sanitizeEmailSubjectLine(`You're Enrolled: ${params.programName}`),
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
      subject: sanitizeEmailSubjectLine(`Congratulations! You Completed ${params.courseName}`),
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
      subject: sanitizeEmailSubjectLine(`${params.inviterName} invited you to join WorkforceAP`),
      html,
    });
    return { ok: true };
  } catch (err) {
    console.error('sendInvitationEmail failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}

export async function sendPartnerReferralInviteEmail(params: {
  to: string;
  inviterName: string;
  partnerName: string;
  personalMessage?: string | null;
  inviteUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn('sendPartnerReferralInviteEmail: RESEND_API_KEY not set');
    return { ok: false, error: 'Email not configured' };
  }

  const html = brandedEmailLayout({
    title: `${params.inviterName} invited you to connect with WorkforceAP`,
    bodyHtml: partnerReferralInviteHtml({
      inviterName: params.inviterName,
      partnerName: params.partnerName,
      personalMessage: params.personalMessage,
    }),
    ctaText: 'Start Application',
    ctaUrl: params.inviteUrl,
  });

  try {
    await resend.emails.send({
      from: getFrom(),
      to: params.to,
      subject: sanitizeEmailSubjectLine(`${params.inviterName} invited you to WorkforceAP`),
      html,
    });
    return { ok: true };
  } catch (err) {
    console.error('sendPartnerReferralInviteEmail failed:', err);
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
      subject: sanitizeEmailSubjectLine(`${params.accepterName} accepted your WorkforceAP invitation`),
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

/** Send job submitted admin alert */
export async function sendJobSubmittedEmail(params: {
  jobTitle: string;
  companyName: string;
  employerEmail: string;
  jobId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn('sendJobSubmittedEmail: RESEND_API_KEY not set');
    return { ok: false, error: 'Email not configured' };
  }
  const html = brandedEmailLayout({
    title: `New Job Submitted: ${params.jobTitle}`,
    bodyHtml: jobSubmittedHtml(params),
    ctaText: 'Review Job',
    ctaUrl: `${SITE_URL}/admin/jobs/${params.jobId}`,
  });
  try {
    await resend.emails.send({
      from: getFrom(),
      to: ADMIN_EMAIL,
      subject: sanitizeEmailSubjectLine(`New Job Submitted: ${params.jobTitle} - ${params.companyName}`),
      html,
    });
    return { ok: true };
  } catch (err) {
    console.error('sendJobSubmittedEmail failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}

/** Send job approved to employer */
export async function sendJobApprovedEmail(params: {
  to: string;
  jobTitle: string;
  companyName: string;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn('sendJobApprovedEmail: RESEND_API_KEY not set');
    return { ok: false, error: 'Email not configured' };
  }
  const html = brandedEmailLayout({
    title: 'Your Job Posting is Live',
    bodyHtml: jobApprovedHtml(params),
    ctaText: 'View Employer Portal',
    ctaUrl: `${SITE_URL}/employer/jobs`,
  });
  try {
    await resend.emails.send({
      from: getFrom(),
      to: params.to,
      subject: sanitizeEmailSubjectLine(`Your job "${params.jobTitle}" is now live on WorkforceAP`),
      html,
    });
    return { ok: true };
  } catch (err) {
    console.error('sendJobApprovedEmail failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}

/** Send job rejected to employer */
export async function sendJobRejectedEmail(params: {
  to: string;
  jobTitle: string;
  companyName: string;
  reason: string;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn('sendJobRejectedEmail: RESEND_API_KEY not set');
    return { ok: false, error: 'Email not configured' };
  }
  const html = brandedEmailLayout({
    title: 'Job Posting Update',
    bodyHtml: jobRejectedHtml(params),
    ctaText: 'Edit Job',
    ctaUrl: `${SITE_URL}/employer/jobs`,
  });
  try {
    await resend.emails.send({
      from: getFrom(),
      to: params.to,
      subject: sanitizeEmailSubjectLine(`Job posting "${params.jobTitle}" - Update`),
      html,
    });
    return { ok: true };
  } catch (err) {
    console.error('sendJobRejectedEmail failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}

/** Send new job application to employer */
export async function sendNewJobApplicationEmail(params: {
  to: string;
  jobTitle: string;
  applicantName: string;
  applicantEmail: string;
  applicationId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn('sendNewJobApplicationEmail: RESEND_API_KEY not set');
    return { ok: false, error: 'Email not configured' };
  }
  const html = brandedEmailLayout({
    title: `New Applicant: ${params.applicantName}`,
    bodyHtml: newJobApplicationHtml(params),
    ctaText: 'View Applications',
    ctaUrl: `${SITE_URL}/employer/applications`,
  });
  try {
    await resend.emails.send({
      from: getFrom(),
      to: params.to,
      subject: sanitizeEmailSubjectLine(`New applicant for "${params.jobTitle}"`),
      html,
    });
    return { ok: true };
  } catch (err) {
    console.error('sendNewJobApplicationEmail failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}

/** Send AI match suggestion to employer */
export async function sendAIMatchSuggestionEmail(params: {
  to: string;
  jobTitle: string;
  companyName: string;
  matches: { name: string; program: string; score: number }[];
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn('sendAIMatchSuggestionEmail: RESEND_API_KEY not set');
    return { ok: false, error: 'Email not configured' };
  }
  const html = brandedEmailLayout({
    title: `Top Matches for "${params.jobTitle}"`,
    bodyHtml: aiMatchSuggestionHtml(params),
    ctaText: 'View Matches',
    ctaUrl: `${SITE_URL}/employer/jobs`,
  });
  try {
    await resend.emails.send({
      from: getFrom(),
      to: params.to,
      subject: sanitizeEmailSubjectLine(`Top candidate matches for "${params.jobTitle}"`),
      html,
    });
    return { ok: true };
  } catch (err) {
    console.error('sendAIMatchSuggestionEmail failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}

/**
 * Same as {@link sendAIMatchSuggestionEmail} — employer AI match notification with HTML-escaped fields.
 */
export async function sendMatchActionEmail(
  params: Parameters<typeof sendAIMatchSuggestionEmail>[0]
): Promise<{ ok: boolean; error?: string }> {
  return sendAIMatchSuggestionEmail(params);
}

/** Send application confirmation to applicant after form submit */
export async function sendApplicationConfirmationEmail(params: {
  to: string;
  fullName: string;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn('sendApplicationConfirmationEmail: RESEND_API_KEY not set');
    return { ok: false, error: 'Email not configured' };
  }
  const first = params.fullName.trim().split(/\s+/)[0] || 'there';
  const html = brandedEmailLayout({
    title: 'Application Received — WorkforceAP',
    bodyHtml: applicationConfirmationHtml({ firstName: first }),
    ctaText: 'Bookmark Your Portal',
    ctaUrl: `${SITE_URL}/login`,
  });
  try {
    await resend.emails.send({
      from: getFrom(),
      to: params.to,
      subject: 'Application Received — Workforce Advancement Project',
      html,
    });
    return { ok: true };
  } catch (err) {
    console.error('sendApplicationConfirmationEmail failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}

/** Send Day 3 follow-up email to applicant */
export async function sendApplicantFollowupEmail(params: {
  to: string;
  fullName: string;
  expectedDate: string;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn('sendApplicantFollowupEmail: RESEND_API_KEY not set');
    return { ok: false, error: 'Email not configured' };
  }
  const first = params.fullName.trim().split(/\s+/)[0] || 'there';
  const html = brandedEmailLayout({
    title: 'Your Application is Being Reviewed',
    bodyHtml: applicantFollowupHtml({ firstName: first, expectedDate: params.expectedDate }),
    ctaText: 'Explore Our Programs',
    ctaUrl: `${SITE_URL}/programs`,
  });
  try {
    await resend.emails.send({
      from: getFrom(),
      to: params.to,
      subject: 'Your WorkforceAP Application is Being Reviewed',
      html,
    });
    return { ok: true };
  } catch (err) {
    console.error('sendApplicantFollowupEmail failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}

/** Send admin alert about pending applications */
export async function sendAdminPendingApplicantsEmail(params: {
  pendingCount: number;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn('sendAdminPendingApplicantsEmail: RESEND_API_KEY not set');
    return { ok: false, error: 'Email not configured' };
  }
  const html = brandedEmailLayout({
    title: `${params.pendingCount} Pending Applications Need Review`,
    bodyHtml: adminPendingApplicantsHtml({ pendingCount: params.pendingCount }),
    ctaText: 'Review Applications',
    ctaUrl: `${SITE_URL}/admin/members`,
  });
  try {
    await resend.emails.send({
      from: getFrom(),
      to: ADMIN_EMAIL,
      subject: sanitizeEmailSubjectLine(`Action Needed: ${params.pendingCount} pending applications over 3 days old`),
      html,
    });
    return { ok: true };
  } catch (err) {
    console.error('sendAdminPendingApplicantsEmail failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}

/** Send weekly admin recap summary */
export async function sendAdminWeeklyRecapEmail(params: {
  newApplicants: number;
  placements: number;
  atRiskStudents: number;
  pendingApplications: number;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn('sendAdminWeeklyRecapEmail: RESEND_API_KEY not set');
    return { ok: false, error: 'Email not configured' };
  }
  const html = brandedEmailLayout({
    title: 'Weekly Admin Recap — WorkforceAP',
    bodyHtml: adminWeeklyRecapHtml(params),
    ctaText: 'View Admin Dashboard',
    ctaUrl: `${SITE_URL}/admin`,
  });
  try {
    await resend.emails.send({
      from: getFrom(),
      to: ADMIN_EMAIL,
      subject: sanitizeEmailSubjectLine(
        `Weekly Recap: ${params.newApplicants} new applicants, ${params.placements} placements`
      ),
      html,
    });
    return { ok: true };
  } catch (err) {
    console.error('sendAdminWeeklyRecapEmail failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}

/** Weekly referral outcomes digest for a partner org */
export async function sendPartnerWeeklyDigestEmail(params: {
  to: string;
  partnerName: string;
  weekLabel: string;
  stageLines: string[];
  successLines: string[];
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn('sendPartnerWeeklyDigestEmail: RESEND_API_KEY not set');
    return { ok: false, error: 'Email not configured' };
  }
  const html = brandedEmailLayout({
    title: `Weekly referral snapshot — ${params.partnerName}`,
    bodyHtml: partnerWeeklyDigestHtml({
      partnerName: params.partnerName,
      weekLabel: params.weekLabel,
      stageLines: params.stageLines,
      successLines: params.successLines,
    }),
    ctaText: 'Open partner portal',
    ctaUrl: `${SITE_URL}/partner`,
  });
  try {
    await resend.emails.send({
      from: getFrom(),
      to: params.to,
      subject: sanitizeEmailSubjectLine(`WorkforceAP weekly referral update — ${params.partnerName}`),
      html,
    });
    return { ok: true };
  } catch (err) {
    console.error('sendPartnerWeeklyDigestEmail failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}

/** Notify staff when a member resets their skills assessment to retake */
export async function sendAssessmentResetNotificationEmail(params: {
  memberName: string;
  memberEmail: string;
  previousScore: number;
  programInterest: string;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) return { ok: false, error: 'Email not configured' };
  const html = brandedEmailLayout({
    title: 'Skills Assessment Reset',
    bodyHtml: `
      <p>A member has requested to retake their skills assessment.</p>
      <table style="font-size:0.9rem;border-collapse:collapse;width:100%">
        <tr><td style="padding:6px 12px 6px 0;font-weight:600;color:#584144">Member</td><td>${escapeHtml(params.memberName)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;font-weight:600;color:#584144">Email</td><td>${escapeHtml(params.memberEmail)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;font-weight:600;color:#584144">Previous Score</td><td>${params.previousScore}%</td></tr>
        <tr><td style="padding:6px 12px 6px 0;font-weight:600;color:#584144">Program</td><td>${escapeHtml(params.programInterest)}</td></tr>
      </table>
      <p style="margin-top:1rem">The previous score has been archived in the system. The member can now retake from their dashboard.</p>
    `,
  });
  try {
    await resend.emails.send({
      from: getFrom(),
      to: ['info@workforceap.org', ADMIN_EMAIL],
      subject: `Assessment Reset — ${params.memberName}`,
      html,
    });
    return { ok: true };
  } catch (err) {
    console.error('sendAssessmentResetNotificationEmail failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}
