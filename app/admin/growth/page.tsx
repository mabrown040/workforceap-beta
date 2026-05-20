import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import PageHeader from '@/components/portal/PageHeader';
import DataTable from '@/components/portal/ui/DataTable';
import GrowthSparkline from '@/components/admin/GrowthSparkline';
import {
  CPA_TARGET_USD,
  getGrowthDashboardData,
  type GrowthCampaignRow,
  type GrowthSourceSection,
} from '@/lib/admin/growthMetrics';
import { saveSourceDailySpendAction } from './adSpendAction';

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin – Growth (paid traffic)',
  description: 'CPA and ROAS monitoring for paid apply campaigns.',
  path: '/admin/growth',
});

/** ISR: refresh dashboard metrics every 5 minutes. */
export const revalidate = 300;

function formatUsd(value: number | null): string {
  if (value == null) return '—';
  return `$${value.toFixed(2)}`;
}

function formatRoas(value: number | null): string {
  if (value == null) return '—';
  return `${value.toFixed(2)}×`;
}

function formatCentsAsUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function filterCampaigns(campaigns: GrowthCampaignRow[], under15Only: boolean): GrowthCampaignRow[] {
  if (!under15Only) return campaigns;
  return campaigns.filter((c) => c.under15Cpa7d);
}

type PageProps = {
  searchParams: Promise<{ under15?: string; saved?: string; source?: string; error?: string }>;
};

export default async function AdminGrowthPage({ searchParams }: PageProps) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/growth');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const params = await searchParams;
  const under15Only = params.under15 === '1';
  const orgId = await getActorOrganizationId(user.id);
  const data = await getGrowthDashboardData(orgId);

  const refreshedLabel = new Date(data.refreshedAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div>
      <PageHeader
        title="Growth"
        subtitle="Paid-traffic CPA / ROAS from apply signups and placements"
      />

      {params.saved === '1' && params.source ? (
        <p
          role="status"
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: 8,
            background: 'color-mix(in srgb, var(--color-success, #16a34a) 12%, transparent)',
            fontSize: '0.875rem',
          }}
        >
          Saved today&apos;s estimated spend for <strong>{params.source}</strong>.
        </p>
      ) : null}

      {params.error ? (
        <p role="alert" style={{ marginBottom: '1rem', color: 'var(--color-error, #b91c1c)', fontSize: '0.875rem' }}>
          Could not save spend. Check the amount and try again.
        </p>
      ) : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem', alignItems: 'center' }}>
        <Link
          href={under15Only ? '/admin/growth' : '/admin/growth?under15=1'}
          className={under15Only ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
          style={{ borderRadius: 999 }}
        >
          {under15Only ? 'Showing' : 'Show'} campaigns under ${CPA_TARGET_USD} CPA (7d)
          <span style={{ marginLeft: '0.35rem', opacity: 0.85, fontWeight: 600 }}>
            ({data.under15CampaignCount})
          </span>
        </Link>
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
          Last refreshed {refreshedLabel} · auto-refresh every 5 min
        </span>
      </div>

      <div className="portal-metric-strip" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: "Today's CPA (paid)", value: formatUsd(data.kpis.todayCpaUsd), icon: 'today', accent: 'accent' as const },
          { label: '7-day CPA (paid)', value: formatUsd(data.kpis.last7CpaUsd), icon: 'date_range', accent: 'blue' as const },
          { label: '30-day CPA (paid)', value: formatUsd(data.kpis.last30CpaUsd), icon: 'calendar_month', accent: 'gold' as const },
          { label: 'Blended CPA (30d paid)', value: formatUsd(data.kpis.blendedPaidCpaUsd), icon: 'payments', accent: 'green' as const },
          {
            label: 'Organic signups (30d)',
            value: String(data.kpis.organicCompletions30d),
            icon: 'eco',
            accent: 'blue' as const,
          },
        ].map((m) => (
          <div key={m.label} className="portal-metric-card">
            <div className={`portal-metric-card__icon-wrap portal-metric-card__icon-wrap--${m.accent}`}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                {m.icon}
              </span>
            </div>
            <p className="portal-metric-card__value">{m.value}</p>
            <p className="portal-metric-card__label">{m.label}</p>
          </div>
        ))}
      </div>

      {data.sources.map((section) => (
        <SourceBlock key={section.source} section={section} under15Only={under15Only} />
      ))}

      <p style={{ marginTop: '1.5rem', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
        ROAS uses first-touch UTM on <code>apply_signup_completed</code> joined to{' '}
        <code>placement_records.salary_offered</code> (annual wage × 100 as cents). Enter today&apos;s
        est. spend per source to unlock CPA.
      </p>
    </div>
  );
}

function SourceBlock({ section, under15Only }: { section: GrowthSourceSection; under15Only: boolean }) {
  const campaigns = filterCampaigns(section.campaigns, under15Only);
  if (under15Only && campaigns.length === 0) return null;

  const todayDollars = (section.todaySpendCents / 100).toFixed(2);

  return (
    <section
      style={{
        marginBottom: '2rem',
        padding: '1rem 1.25rem',
        borderRadius: 12,
        border: '1px solid var(--outline-variant, #e5e7eb)',
        background: 'var(--color-surface)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '1rem',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>{section.source}</h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
            {section.totalCompletions} completions (30d) · {formatCentsAsUsd(section.totalSpendCents)} recorded spend
          </p>
        </div>
        <div style={{ minWidth: 140, maxWidth: 200 }}>
          <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            30-day signups
          </p>
          <GrowthSparkline data={section.sparkline} />
        </div>
        <form action={saveSourceDailySpendAction} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <input type="hidden" name="source" value={section.source} />
          {under15Only ? <input type="hidden" name="under15" value="1" /> : null}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem' }}>
            Today&apos;s est. spend (USD)
            <input
              type="number"
              name="dollars"
              min={0}
              step={0.01}
              defaultValue={todayDollars}
              className="input"
              style={{ width: '7.5rem' }}
            />
          </label>
          <button type="submit" className="btn btn-outline btn-sm">
            Save
          </button>
        </form>
      </div>

      <DataTable
        variant="admin"
        tableClassName="admin-table"
        columns={[
          { key: 'campaign', header: 'Campaign', cell: (row) => row.campaign },
          {
            key: 'completions',
            header: 'Completions (30d)',
            cell: (row) => row.completions,
            align: 'right',
          },
          {
            key: 'placements',
            header: 'Placements',
            cell: (row) => row.placements,
            align: 'right',
          },
          {
            key: 'spend',
            header: 'Spend (30d)',
            cell: (row) => formatCentsAsUsd(row.spendCents),
            align: 'right',
          },
          {
            key: 'cpa',
            header: 'CPA (30d)',
            cell: (row) => (
              <span style={row.under15Cpa7d ? { color: 'var(--color-success, #16a34a)', fontWeight: 600 } : undefined}>
                {formatUsd(row.cpaUsd)}
              </span>
            ),
            align: 'right',
          },
          {
            key: 'roas',
            header: 'ROAS',
            cell: (row) => formatRoas(row.roas),
            align: 'right',
          },
        ]}
        rows={campaigns}
        rowKey={(row) => row.campaign}
        emptyState={
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
            {under15Only ? 'No campaigns under target CPA in the last 7 days.' : 'No campaign data yet.'}
          </p>
        }
      />
    </section>
  );
}
