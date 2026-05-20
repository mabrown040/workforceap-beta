/**
 * Redesigned certification celebration email (Sprint R3 — PLAN-2026-Q3.md).
 *
 * Goal: lift cert email opens 35% to 55% by leading with cert + date in the
 * subject, surfacing a concrete "what's next" CTA (interview practice), and
 * dropping in a peer testimonial for social proof. Points award (+25 bump)
 * is handled by the caller via `awardPoints`.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';

export type CertCelebrationTestimonial = {
  quote: string;
  name: string;
  role?: string;
};

export function certCelebrationV2Html(params: {
  firstName: string;
  certName: string;
  earnedDateLabel: string;
  pointsAwarded: number;
  testimonial?: CertCelebrationTestimonial | null;
}): string {
  const { firstName, certName, earnedDateLabel, pointsAwarded, testimonial } = params;

  const testimonialBlock = testimonial
    ? `
    <blockquote style="margin:24px 0;padding:16px 20px;border-left:4px solid #2563eb;background:#f8fafc;font-style:italic;color:#1f2937;">
      "${escapeHtml(testimonial.quote)}"
      <div style="margin-top:8px;font-style:normal;font-size:14px;color:#475569;">
        — ${escapeHtml(testimonial.name)}${testimonial.role ? `, ${escapeHtml(testimonial.role)}` : ''}
      </div>
    </blockquote>
  `
    : '';

  return `
    <p>Congratulations, ${escapeHtml(firstName)} — you earned <strong>${escapeHtml(certName)}</strong> on ${escapeHtml(earnedDateLabel)}.</p>
    <p>You just added <strong>+${pointsAwarded} points</strong> to your profile. Check the dashboard to see your new level.</p>
    <p><strong>What's next:</strong> interviews are where this cert pays off. Spend 15 minutes today running a mock interview with our AI coach — it's tuned to the role this cert opens up, and members who practice within a week of certifying place 2x faster.</p>
    ${testimonialBlock}
  `.trim();
}
