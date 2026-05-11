/**
 * At-risk member digest email body HTML.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';

function n(v: number): string {
  return escapeHtml(String(Math.max(0, Math.floor(Number(v) || 0))));
}

export function atRiskDigestHtml(params: {
  dateLabel: string;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  members: {
    fullName: string | null;
    email: string;
    score: number;
    level: string;
    factors: string[];
    recommendedAction: string;
    adminUrl: string;
  }[];
}): string {
  const { dateLabel, criticalCount, highCount, mediumCount, members } = params;

  const summaryRows = [
    { label: 'Critical (≥70)', count: criticalCount, color: '#dc2626' },
    { label: 'High (50–69)', count: highCount, color: '#d97706' },
    { label: 'Medium (30–49)', count: mediumCount, color: '#2b7bb9' },
  ];

  const summaryTable = `
    <table style="width:100%;border-collapse:collapse;margin:1rem 0;">
      ${summaryRows.map(
        (r) => `
        <tr>
          <td style="padding:0.75rem;border:1px solid #e5e5e5;font-weight:600;">${escapeHtml(r.label)}</td>
          <td style="padding:0.75rem;border:1px solid #e5e5e5;font-size:1.25rem;font-weight:700;text-align:center;color:${r.color};">${n(r.count)}</td>
        </tr>
      `
      ).join('')}
    </table>
  `;

  const memberRows = members
    .map((m) => {
      const factorsList = m.factors.length
        ? `<ul style="margin:0.25rem 0 0;padding-left:1.25rem;font-size:0.85rem;color:#584144;">${m.factors
            .map((f) => `<li>${escapeHtml(f)}</li>`)
            .join('')}</ul>`
        : '<p style="margin:0.25rem 0 0;font-size:0.85rem;color:#584144;">No specific factors flagged.</p>';

      return `
        <div style="margin-bottom:1.5rem;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;">
          <div style="padding:0.75rem 1rem;background:#f8f5f3;border-bottom:1px solid #e5e5e5;display:flex;justify-content:space-between;align-items:center;">
            <strong>${escapeHtml(m.fullName || 'Unknown')}</strong>
            <span style="font-size:0.85rem;font-weight:700;color:${m.level === 'CRITICAL' ? '#dc2626' : m.level === 'HIGH' ? '#d97706' : '#2b7bb9'};">
              ${escapeHtml(m.level)} — ${n(m.score)}
            </span>
          </div>
          <div style="padding:0.75rem 1rem;">
            <p style="margin:0 0 0.25rem;font-size:0.85rem;color:#584144;"><strong>Email:</strong> ${escapeHtml(m.email)}</p>
            <p style="margin:0 0 0.25rem;font-size:0.85rem;color:#584144;"><strong>Recommended action:</strong> ${escapeHtml(m.recommendedAction)}</p>
            <p style="margin:0 0 0.25rem;font-size:0.85rem;color:#584144;"><strong>Factors:</strong></p>
            ${factorsList}
            <p style="margin:0.5rem 0 0;">
              <a href="${escapeHtml(m.adminUrl)}" style="display:inline-block;padding:0.5rem 0.75rem;background:#231f20;color:#fff;text-decoration:none;border-radius:6px;font-size:0.85rem;">Open in admin</a>
            </p>
          </div>
        </div>
      `;
    })
    .join('');

  return `
    <p>Here is the at-risk member summary for <strong>${escapeHtml(dateLabel)}</strong>:</p>
    ${summaryTable}
    <p>Members requiring attention:</p>
    ${memberRows || '<p>No members matched the threshold for this digest.</p>'}
    <p style="margin-top:1rem;">Click below to view the full at-risk dashboard.</p>
  `.trim();
}
