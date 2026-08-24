import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { resolveAdminPageTenant, withAdminPageScope, inheritUserOrg, inheritMemberOrg, inheritLeaderOrg, inheritInvitedByOrg } from '@/lib/tenant/adminPageScope';
import { prisma } from '@/lib/db/prisma';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import {
  getBoardSnapshot,
  SMALL_SAMPLE_THRESHOLD,
  type BoardOutcomesPeriod,
} from '@/lib/admin/boardOutcomes';

/**
 * GET /admin/outcomes/board.pdf
 *
 * Returns a printable HTML page (NOT a PDF — Playwright is overkill). The page
 * is the same outcomes board content as `/admin/outcomes`, stripped of nav,
 * with `@page { size: letter }` print CSS and generous font sizes. Users hit
 * Cmd+P / Ctrl+P → "Save as PDF" to produce a real PDF.
 *
 * Reuses `getBoardSnapshot()` — the single source of truth — so the printable
 * board carries the same numbers as the on-screen board and the per-member
 * snapshot card.
 *
 * Admin-only, same gate as `/admin/outcomes`.
 */
export const dynamic = 'force-dynamic';

const VALID_PERIODS: BoardOutcomesPeriod[] = ['all-time', 'ytd', 'q-current', 'q-prev'];

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString('en-US');
}

function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return `$${n.toLocaleString('en-US')}`;
}

function fmtRate(numerator: number, denominator: number): string {
  if (denominator < SMALL_SAMPLE_THRESHOLD) {
    return `N=${denominator} · sample too small for a reliable rate`;
  }
  const pct = Math.round((numerator / denominator) * 100);
  return `${pct}% (${numerator} / ${denominator})`;
}

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const scope = await resolveAdminPageTenant(user.id);
  if (!scope.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const periodParam = req.nextUrl.searchParams.get('period');
  const period: BoardOutcomesPeriod =
    periodParam && (VALID_PERIODS as string[]).includes(periodParam)
      ? (periodParam as BoardOutcomesPeriod)
      : 'all-time';

  // Resolve the actor's organization so the printable board shows the
  // admin's tenant and the title carries the org name. If the user has no
  // org row or resolution fails, we return 403 — never default to unscoped
  // data, which would leak cross-tenant outcomes.
  let organizationId: string;
  let organizationName = 'WorkforceAP';
  try {
    organizationId = await getActorOrganizationId(user.id);
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });
    if (org?.name) organizationName = org.name;
  } catch (err) {
    console.error('[outcomes/board.pdf] org lookup failed', err);
    return NextResponse.json(
      { error: 'Organization scope required' },
      { status: 403 }
    );
  }

  let snapshot;
  try {
    snapshot = await getBoardSnapshot(period, organizationId);
  } catch (err) {
    console.error('[outcomes/board.pdf] snapshot generation failed', err);
    return NextResponse.json({ error: 'Snapshot generation failed' }, { status: 500 });
  }

  const t = snapshot.outcomes.totals;
  const generatedAt = snapshot.generatedAt;
  const monthYear = generatedAt.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const generatedAtLabel = generatedAt.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const title = `${organizationName} — Outcomes board — ${monthYear}`;

  const programRows = snapshot.outcomes.programs
    .map((p) => {
      const rate =
        p.enrolled < SMALL_SAMPLE_THRESHOLD ? `N=${p.enrolled}` : `${p.placementRate}%`;
      return `<tr>
        <td>${escapeHtml(p.programSlug)}</td>
        <td class="num">${p.enrolled}</td>
        <td class="num">${p.certified}</td>
        <td class="num">${p.placed}</td>
        <td class="num">${escapeHtml(rate)}</td>
      </tr>`;
    })
    .join('');

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="robots" content="noindex" />
  <style>
    @page { size: letter; margin: 0.6in; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #111;
      background: #fff;
      font-size: 13pt;
      line-height: 1.45;
    }
    body { padding: 1.5rem; max-width: 7.5in; margin: 0 auto; }
    @media print {
      body { padding: 0; max-width: none; }
    }
    h1 { font-size: 22pt; margin: 0 0 0.25rem; }
    h2 { font-size: 15pt; margin: 1.5rem 0 0.5rem; border-bottom: 1px solid #ccc; padding-bottom: 0.25rem; }
    p { margin: 0.4rem 0; }
    .meta { color: #555; font-size: 11pt; }
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      margin: 0.75rem 0;
    }
    .stat {
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 0.6rem 0.75rem;
      page-break-inside: avoid;
    }
    .stat-label {
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #555;
      margin: 0 0 0.2rem;
    }
    .stat-value { font-size: 18pt; font-weight: 700; margin: 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; font-size: 11pt; }
    th, td { padding: 0.4rem 0.5rem; text-align: left; border-bottom: 1px solid #e5e5e5; }
    th { background: #f5f5f5; font-weight: 700; }
    td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
    ul { padding-left: 1.25rem; margin: 0.4rem 0; }
    .footer {
      margin-top: 2rem;
      padding-top: 0.75rem;
      border-top: 1px solid #ccc;
      font-size: 10pt;
      color: #555;
    }
    section { page-break-inside: avoid; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(title)}</h1>
    <p class="meta">
      Period: ${escapeHtml(snapshot.outcomes.period.label)} · Generated ${escapeHtml(generatedAtLabel)}<br />
      Source: <code>getBoardSnapshot()</code> · Rate suppression threshold: N&lt;${SMALL_SAMPLE_THRESHOLD}
    </p>
  </header>

  <section>
    <h2>1. Application funnel</h2>
    <div class="stat-grid">
      <div class="stat"><p class="stat-label">Total applications</p><p class="stat-value">${fmtNumber(snapshot.applicationFunnel.total)}</p></div>
      <div class="stat"><p class="stat-label">Pending</p><p class="stat-value">${fmtNumber(snapshot.applicationFunnel.pending)}</p></div>
      <div class="stat"><p class="stat-label">Approved</p><p class="stat-value">${fmtNumber(snapshot.applicationFunnel.approved)}</p></div>
      <div class="stat"><p class="stat-label">Needs info</p><p class="stat-value">${fmtNumber(snapshot.applicationFunnel.needsInfo)}</p></div>
      <div class="stat"><p class="stat-label">Denied</p><p class="stat-value">${fmtNumber(snapshot.applicationFunnel.denied)}</p></div>
    </div>
  </section>

  <section>
    <h2>2. Member outcomes funnel</h2>
    <div class="stat-grid">
      <div class="stat"><p class="stat-label">Enrolled</p><p class="stat-value">${fmtNumber(t.membersEnrolled)}</p></div>
      <div class="stat"><p class="stat-label">In training</p><p class="stat-value">${fmtNumber(t.membersInTraining)}</p></div>
      <div class="stat"><p class="stat-label">Certified</p><p class="stat-value">${fmtNumber(t.membersCertified)}</p></div>
      <div class="stat"><p class="stat-label">Placed</p><p class="stat-value">${fmtNumber(t.membersPlaced)}</p></div>
      <div class="stat"><p class="stat-label">Median salary</p><p class="stat-value">${escapeHtml(fmtMoney(t.medianAnnualSalary))}</p></div>
      <div class="stat"><p class="stat-label">Avg weeks to placement</p><p class="stat-value">${t.averageWeeksToPlacement === null ? '—' : t.averageWeeksToPlacement}</p></div>
    </div>
    <p><strong>Placement rate:</strong> ${escapeHtml(fmtRate(t.membersPlaced, t.membersEnrolled))}</p>
  </section>

  <section>
    <h2>3. Member activity</h2>
    <div class="stat-grid">
      <div class="stat"><p class="stat-label">Total members</p><p class="stat-value">${fmtNumber(snapshot.activity.totalMembers)}</p></div>
      <div class="stat"><p class="stat-label">Active 7d</p><p class="stat-value">${fmtNumber(snapshot.activity.active7d)}</p></div>
      <div class="stat"><p class="stat-label">Active 14d</p><p class="stat-value">${fmtNumber(snapshot.activity.active14d)}</p></div>
      <div class="stat"><p class="stat-label">Active 30d</p><p class="stat-value">${fmtNumber(snapshot.activity.active30d)}</p></div>
      <div class="stat"><p class="stat-label">Inactive 14+ days</p><p class="stat-value">${fmtNumber(snapshot.activity.inactive14d)}</p></div>
    </div>
  </section>

  <section>
    <h2>4. Certifications earned</h2>
    <div class="stat-grid">
      <div class="stat"><p class="stat-label">Total earned</p><p class="stat-value">${fmtNumber(snapshot.certifications.totalEarned)}</p></div>
      <div class="stat"><p class="stat-label">Last 30 days</p><p class="stat-value">${fmtNumber(snapshot.certifications.earnedLast30d)}</p></div>
      <div class="stat"><p class="stat-label">Unique members</p><p class="stat-value">${fmtNumber(snapshot.certifications.uniqueMembers)}</p></div>
    </div>
  </section>

  <section>
    <h2>5. Programs</h2>
    ${
      snapshot.outcomes.programs.length === 0
        ? '<p>No enrolled members yet.</p>'
        : `<table>
            <thead>
              <tr>
                <th>Program</th>
                <th class="num">Enrolled</th>
                <th class="num">Certified</th>
                <th class="num">Placed</th>
                <th class="num">Placement rate</th>
              </tr>
            </thead>
            <tbody>${programRows}</tbody>
          </table>`
    }
  </section>

  <section>
    <h2>6. Data quality flags</h2>
    <ul>
      <li>Placements missing program slug: <strong>${fmtNumber(snapshot.dataQuality.placementsMissingProgram)}</strong></li>
      <li>Placements missing funding source: <strong>${fmtNumber(snapshot.dataQuality.placementsMissingFunding)}</strong></li>
      <li>Placements missing retention status / decision: <strong>${fmtNumber(snapshot.dataQuality.placementsMissingRetention)}</strong></li>
      <li>Placements missing salary at placement: <strong>${fmtNumber(snapshot.dataQuality.placementsMissingSalary)}</strong></li>
      <li>Enrolled members missing <code>enrolled_at</code>: <strong>${fmtNumber(snapshot.dataQuality.enrolledWithoutEnrolledAt)}</strong></li>
    </ul>
  </section>

  <p class="footer">
    ${escapeHtml(organizationName)} · Outcomes truth-set generated ${escapeHtml(generatedAtLabel)}.
    Methodology: docs/OUTCOMES-METHODOLOGY.md.
  </p>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
