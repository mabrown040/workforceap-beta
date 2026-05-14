/**
 * WIOA monthly report email HTML body.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';

function n(v: number | null): string {
  if (v === null || v === undefined) return '—';
  return escapeHtml(String(Math.max(0, Math.floor(Number(v) || 0))));
}

function currency(v: number | null): string {
  if (v === null || v === undefined) return '—';
  return escapeHtml(
    `$${Math.max(0, Math.floor(Number(v) || 0)).toLocaleString('en-US')}`,
  );
}

export function wioaReportHtml(params: {
  periodLabel: string;
  totalActiveMembers: number;
  totalCompleters: number;
  totalPlacements: number;
  overallAvgWage: number | null;
  programs: Array<{
    programSlug: string;
    activeMembers: number;
    completers: number;
    placements: number;
    avgWage: number | null;
  }>;
}): string {
  const {
    periodLabel,
    totalActiveMembers,
    totalCompleters,
    totalPlacements,
    overallAvgWage,
    programs,
  } = params;

  const programRows = programs
    .map(
      (p) => `
      <tr>
        <td style="padding: 0.75rem; border: 1px solid #e5e5e5;">${escapeHtml(p.programSlug)}</td>
        <td style="padding: 0.75rem; border: 1px solid #e5e5e5; text-align: center;">${n(p.activeMembers)}</td>
        <td style="padding: 0.75rem; border: 1px solid #e5e5e5; text-align: center;">${n(p.completers)}</td>
        <td style="padding: 0.75rem; border: 1px solid #e5e5e5; text-align: center;">${n(p.placements)}</td>
        <td style="padding: 0.75rem; border: 1px solid #e5e5e5; text-align: center;">${currency(p.avgWage)}</td>
      </tr>
    `,
    )
    .join('');

  return `
    <p>Here is your WIOA monthly report for <strong>${escapeHtml(periodLabel)}</strong>:</p>

    <h2 style="font-size: 1.125rem; margin: 1.5rem 0 0.75rem;">Overview</h2>
    <table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">
      <tr>
        <td style="padding: 0.75rem; border: 1px solid #e5e5e5; font-weight: 600;">Active Members</td>
        <td style="padding: 0.75rem; border: 1px solid #e5e5e5; font-size: 1.25rem; font-weight: 700; text-align: center;">${n(totalActiveMembers)}</td>
      </tr>
      <tr>
        <td style="padding: 0.75rem; border: 1px solid #e5e5e5; font-weight: 600;">Training Completers</td>
        <td style="padding: 0.75rem; border: 1px solid #e5e5e5; font-size: 1.25rem; font-weight: 700; text-align: center; color: #3b82f6;">${n(totalCompleters)}</td>
      </tr>
      <tr>
        <td style="padding: 0.75rem; border: 1px solid #e5e5e5; font-weight: 600;">Placements</td>
        <td style="padding: 0.75rem; border: 1px solid #e5e5e5; font-size: 1.25rem; font-weight: 700; text-align: center; color: #16a34a;">${n(totalPlacements)}</td>
      </tr>
      <tr>
        <td style="padding: 0.75rem; border: 1px solid #e5e5e5; font-weight: 600;">Average Wage at Placement</td>
        <td style="padding: 0.75rem; border: 1px solid #e5e5e5; font-size: 1.25rem; font-weight: 700; text-align: center; color: #16a34a;">${currency(overallAvgWage)}</td>
      </tr>
    </table>

    <h2 style="font-size: 1.125rem; margin: 1.5rem 0 0.75rem;">By Program</h2>
    <table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">
      <thead>
        <tr style="background: #f9fafb;">
          <th style="padding: 0.75rem; border: 1px solid #e5e5e5; text-align: left; font-weight: 600;">Program</th>
          <th style="padding: 0.75rem; border: 1px solid #e5e5e5; text-align: center; font-weight: 600;">Active</th>
          <th style="padding: 0.75rem; border: 1px solid #e5e5e5; text-align: center; font-weight: 600;">Completers</th>
          <th style="padding: 0.75rem; border: 1px solid #e5e5e5; text-align: center; font-weight: 600;">Placements</th>
          <th style="padding: 0.75rem; border: 1px solid #e5e5e5; text-align: center; font-weight: 600;">Avg Wage</th>
        </tr>
      </thead>
      <tbody>
        ${programRows || '<tr><td colspan="5" style="padding: 0.75rem; border: 1px solid #e5e5e5; text-align: center; color: #888;">No program data for this period.</td></tr>'}
      </tbody>
    </table>

    <p style="font-size: 0.875rem; color: #666;">The full JSON report is attached to this email.</p>
  `.trim();
}
