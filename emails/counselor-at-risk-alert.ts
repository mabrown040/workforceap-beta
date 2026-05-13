/**
 * Individual counselor at-risk alert email.
 * Sent when a newly flagged at-risk member is assigned to this counselor.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';

function n(v: number): string {
  return escapeHtml(String(Math.max(0, Math.floor(Number(v) || 0))));
}

export function counselorAtRiskAlertHtml(params: {
  memberName: string;
  memberEmail: string;
  score: number;
  level: string;
  factors: string[];
  recommendedAction: string;
  messageUrl: string;
  profileUrl: string;
  dashboardUrl: string;
}): string {
  const { memberName, memberEmail, score, level, factors, recommendedAction, messageUrl, profileUrl, dashboardUrl } = params;

  const levelColor =
    level === 'CRITICAL' ? '#dc2626' : level === 'HIGH' ? '#d97706' : level === 'MEDIUM' ? '#2b7bb9' : '#4a9b4f';

  const factorsList = factors.length
    ? `<ul style="margin:0.25rem 0 0;padding-left:1.25rem;font-size:0.85rem;color:#584144;">${factors
        .map((f) => `<li>${escapeHtml(f)}</li>`)
        .join('')}</ul>`
    : '<p style="margin:0.25rem 0 0;font-size:0.85rem;color:#584144;">No specific factors flagged.</p>';

  return `
    <p><strong>${escapeHtml(memberName)}</strong> has been flagged as <strong style="color:${levelColor};">${escapeHtml(level)} risk</strong> (score ${n(score)}).</p>
    <table style="width:100%;border-collapse:collapse;margin:1rem 0;">
      <tr>
        <td style="padding:0.75rem;border:1px solid #e5e5e5;font-weight:600;">Member</td>
        <td style="padding:0.75rem;border:1px solid #e5e5e5;">${escapeHtml(memberName)}</td>
      </tr>
      <tr>
        <td style="padding:0.75rem;border:1px solid #e5e5e5;font-weight:600;">Email</td>
        <td style="padding:0.75rem;border:1px solid #e5e5e5;">${escapeHtml(memberEmail)}</td>
      </tr>
      <tr>
        <td style="padding:0.75rem;border:1px solid #e5e5e5;font-weight:600;">Risk level</td>
        <td style="padding:0.75rem;border:1px solid #e5e5e5;font-weight:700;color:${levelColor};">${escapeHtml(level)} — ${n(score)}</td>
      </tr>
      <tr>
        <td style="padding:0.75rem;border:1px solid #e5e5e5;font-weight:600;">Recommended action</td>
        <td style="padding:0.75rem;border:1px solid #e5e5e5;">${escapeHtml(recommendedAction)}</td>
      </tr>
    </table>
    <p style="margin:0 0 0.5rem;font-weight:600;">Risk factors:</p>
    ${factorsList}
    <p style="margin-top:1.5rem;display:flex;gap:0.75rem;flex-wrap:wrap;">
      <a href="${escapeHtml(messageUrl)}" style="display:inline-block;padding:0.6rem 1rem;background:#231f20;color:#fff;text-decoration:none;border-radius:6px;font-size:0.9rem;font-weight:600;">Message member</a>
      <a href="${escapeHtml(profileUrl)}" style="display:inline-block;padding:0.6rem 1rem;background:#f8f5f3;color:#231f20;text-decoration:none;border-radius:6px;font-size:0.9rem;font-weight:600;border:1px solid #e5e5e5;">View profile</a>
      <a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;padding:0.6rem 1rem;background:#f8f5f3;color:#231f20;text-decoration:none;border-radius:6px;font-size:0.9rem;font-weight:600;border:1px solid #e5e5e5;">Open at-risk dashboard</a>
    </p>
    <p style="margin-top:1rem;font-size:0.8rem;color:#8a7d7f;">Please acknowledge this alert in the counselor portal within 48 hours. If not acknowledged, it will be escalated to the admin team.</p>
  `.trim();
}
