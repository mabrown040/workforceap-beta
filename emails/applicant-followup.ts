/**
 * Day 3 applicant follow-up email body HTML.
 *
 * No response-date promise: until 2026-09-19 this email said "We expect to
 * have an update for you by <five business days out>" while the pending
 * queue sat at a 40-day median. The copy now says what we can actually
 * do — email the applicant once a counselor has reviewed the application.
 * See docs/PRODUCT_STAKES.md ("Apply follow-up promises").
 */

import { escapeHtml } from '@/lib/email/escapeHtml';

export function applicantFollowupHtml(params: { firstName: string }): string {
  const { firstName } = params;
  return `
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>We wanted to let you know that your application to the Workforce Advancement Project is being reviewed by our team.</p>
    <p>We'll email you as soon as a counselor has reviewed your application. If we need anything else from you, we'll reach out directly.</p>
    <p>In the meantime, here are some resources to explore:</p>
    <ul>
      <li><a href="https://www.workforceap.org/programs">Browse our 19 career programs</a></li>
      <li><a href="https://www.workforceap.org/faq">Frequently asked questions</a></li>
      <li><a href="https://www.workforceap.org/how-it-works">How it works</a></li>
    </ul>
    <p>If you have questions, call <a href="tel:+15127771808">(512) 777-1808</a> or email <a href="mailto:info@workforceap.org">info@workforceap.org</a>.</p>
  `.trim();
}
