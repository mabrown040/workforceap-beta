/**
 * Post-placement survey invite email body HTML templates.
 *
 * Sent at 30/60/90 days after placement by the placement-survey cron.
 * The CTA in brandedEmailLayout deep-links to /survey/placement/:token
 * where a signed token unlocks the form.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';
import type { PlacementSurveyWave } from '@prisma/client';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org';

export function placementSurveyHtml(params: {
  firstName: string;
  programName: string | null;
  wave: PlacementSurveyWave;
}): string {
  const { firstName, programName, wave } = params;

  switch (wave) {
    case 'sixty_day':
      return placementSurvey60Html({ firstName, programName });
    case 'ninety_day':
      return placementSurvey90Html({ firstName, programName });
    case 'hundred_eighty_day':
      return placementSurvey180Html({ firstName, programName });
    case 'thirty_day':
    default:
      return placementSurvey30Html({ firstName, programName });
  }
}

function placementSurvey30Html(params: { firstName: string; programName: string | null }): string {
  const { firstName, programName } = params;
  const programLine = programName
    ? `<p>You finished <strong>${escapeHtml(programName)}</strong> with us, and we'd love to hear how things are going on the job.</p>`
    : `<p>We'd love to hear how things are going on the job since you finished your program with us.</p>`;

  return `
    <p>Hi ${escapeHtml(firstName)},</p>
    ${programLine}
    <p>The survey takes about 3 minutes. Your answers help us understand what's working, refine the program for the next cohort, and share real outcomes with the funders who make Workforce Funded Training possible.</p>
    <p style="margin-top:1rem;font-size:0.9rem;color:#584144;">If you'd rather not respond, you can ignore this email — we won't follow up again.</p>
  `.trim();
}

function placementSurvey60Html(params: { firstName: string; programName: string | null }): string {
  const { firstName, programName } = params;
  const programLine = programName
    ? `<p>It's been about two months since you started your role after completing <strong>${escapeHtml(programName)}</strong>.</p>`
    : `<p>It's been about two months since you started your new role.</p>`;

  return `
    <p>Hi ${escapeHtml(firstName)},</p>
    ${programLine}
    <p><strong>Quick check-in:</strong> Are you still employed? Have you run into any challenges we could help with?</p>
    <p>This 2-minute survey helps us catch problems early and report retention outcomes to our funders.</p>
    <p style="margin-top:1rem;font-size:0.9rem;color:#584144;">If you'd rather not respond, you can ignore this email.</p>
  `.trim();
}

function placementSurvey90Html(params: { firstName: string; programName: string | null }): string {
  const { firstName, programName } = params;
  const programLine = programName
    ? `<p>You completed <strong>${escapeHtml(programName)}</strong> and have been in your role for about three months now.</p>`
    : `<p>You've been in your new role for about three months now.</p>`;

  return `
    <p>Hi ${escapeHtml(firstName)},</p>
    ${programLine}
    <p><strong>90-day check-in:</strong> We need to confirm your current salary and job satisfaction for our grant reporting. It takes about 2 minutes.</p>
    <p>Your answers directly help us secure funding so more people get the same shot you did.</p>
  `.trim();
}

function placementSurvey180Html(params: { firstName: string; programName: string | null }): string {
  const { firstName, programName } = params;
  const programLine = programName
    ? `<p>You completed <strong>${escapeHtml(programName)}</strong> and have been in your role for about six months now.</p>`
    : `<p>You've been in your new role for about six months now.</p>`;

  return `
    <p>Hi ${escapeHtml(firstName)},</p>
    ${programLine}
    <p><strong>Final check-in:</strong> We need to confirm your current salary and job satisfaction one last time for our grant reporting. This is the last scheduled survey — it takes about 2 minutes.</p>
    <p>Your answers directly help us secure funding so more people get the same shot you did.</p>
  `.trim();
}

/** Human-readable day-count label for a survey wave, e.g. "30-day". */
function waveLabel(wave: PlacementSurveyWave): string {
  switch (wave) {
    case 'sixty_day':
      return '60-day';
    case 'ninety_day':
      return '90-day';
    case 'hundred_eighty_day':
      return '180-day';
    case 'thirty_day':
    default:
      return '30-day';
  }
}

/**
 * Escalation email to counselor when a member hasn't responded to a
 * placement survey (any wave) after 7 days.
 */
export function placementSurveyEscalationHtml(params: {
  counselorName: string;
  memberName: string;
  memberEmail: string;
  employerName: string;
  jobTitle: string;
  daysSincePlacement: number | null;
  surveyUrl: string;
  wave?: PlacementSurveyWave;
}): string {
  const { counselorName, memberName, memberEmail, employerName, jobTitle, daysSincePlacement, surveyUrl, wave } = params;
  const daysText = daysSincePlacement !== null ? ` (${daysSincePlacement} days since start)` : '';
  const surveyLabel = `${waveLabel(wave ?? 'thirty_day')} placement survey`;

  return `
    <p>Hi ${escapeHtml(counselorName)},</p>
    <p><strong>${escapeHtml(memberName)}</strong> was placed at <strong>${escapeHtml(employerName)}</strong> as <strong>${escapeHtml(jobTitle)}</strong>${escapeHtml(daysText)} but has not completed their ${escapeHtml(surveyLabel)} after 7 days.</p>
    <p style="margin:1rem 0;">Consider reaching out directly to check in:</p>
    <ul style="margin:0.25rem 0 0;padding-left:1.25rem;font-size:0.9rem;color:#584144;">
      <li>Member email: <a href="mailto:${escapeHtml(memberEmail)}">${escapeHtml(memberEmail)}</a></li>
      <li>They may have missed the email or changed jobs</li>
      <li>A quick call often gets the best response</li>
    </ul>
    <p style="margin-top:1.5rem;">
      <a href="${escapeHtml(surveyUrl)}" style="display:inline-block;padding:0.6rem 1rem;background:#231f20;color:#fff;text-decoration:none;border-radius:6px;font-size:0.9rem;font-weight:600;">View survey link</a>
      <a href="${escapeHtml(`${SITE_URL}/admin/members?search=${encodeURIComponent(memberEmail)}`)}" style="display:inline-block;padding:0.6rem 1rem;background:#f8f5f3;color:#231f20;text-decoration:none;border-radius:6px;font-size:0.9rem;font-weight:600;border:1px solid #e5e5e5;margin-left:0.5rem;">Open member profile</a>
    </p>
    <p style="margin-top:1rem;font-size:0.8rem;color:#8a7d7f;">This member will appear on the At-Risk dashboard under "Placement survey non-responders" until the survey is completed.</p>
  `.trim();
}
