/**
 * AI match suggestion - employer notification email body HTML.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';

export function aiMatchSuggestionHtml(params: {
  jobTitle: string;
  companyName: string;
  matches: { name: string; program: string; score: number }[];
}): string {
  const { jobTitle, companyName, matches } = params;
  const listItems = matches
    .map((m) => {
      const score = Number.isFinite(m.score) ? Math.round(m.score) : 0;
      return `<li><strong>${escapeHtml(m.name)}</strong> — ${escapeHtml(m.program)} (match: ${score}%)</li>`;
    })
    .join('');
  return `
    <p>We've identified top matching students for your job posting.</p>
    <p><strong>Job:</strong> ${escapeHtml(jobTitle)}</p>
    <p><strong>Company:</strong> ${escapeHtml(companyName)}</p>
    <p><strong>Top matches:</strong></p>
    <ul>
      ${listItems}
    </ul>
    <p>Log in to your employer portal to view full profiles and contact these candidates.</p>
  `.trim();
}
