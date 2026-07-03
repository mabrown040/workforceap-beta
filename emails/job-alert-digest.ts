/**
 * Weekly job alert digest email body HTML — sent to members who are
 * actively job searching (saved job, application, or AI match on file)
 * when new live postings match their enrolled program.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';

export function jobAlertDigestHtml(params: {
  firstName: string;
  jobs: { title: string; company: string; location: string | null }[];
}): string {
  const { firstName, jobs } = params;
  const listItems = jobs
    .map((j) => {
      const meta = [j.company, j.location].filter(Boolean).map((s) => escapeHtml(s as string)).join(' · ');
      return `<li><strong>${escapeHtml(j.title)}</strong>${meta ? ` — ${meta}` : ''}</li>`;
    })
    .join('');

  return `
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>${jobs.length} new job${jobs.length === 1 ? '' : 's'} matching your program went live this week:</p>
    <ul>
      ${listItems}
    </ul>
    <p>Log in to view details and apply before they fill up.</p>
  `.trim();
}
