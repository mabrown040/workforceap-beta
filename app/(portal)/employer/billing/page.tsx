import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { unlinkedEmployerHref } from '@/lib/auth/portalGuards';
import { buildPageMetadataAsync } from '@/app/seo';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import { EMPLOYER_TIERS } from '@/lib/stripe/client';
import Link from 'next/link';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Billing',
    description: 'Manage your subscription and billing.',
    path: '/employer/billing',
  });
}

export default async function EmployerBillingPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/employer/billing');

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) redirect(await unlinkedEmployerHref(user.id));

  const employer = await prisma.employer.findUnique({
    where: { id: ctx.employerId },
    select: {
      tier: true,
      stripeSubscriptionStatus: true,
      stripeCustomerId: true,
      _count: { select: { jobs: true } },
    },
  });
  if (!employer) redirect(await unlinkedEmployerHref(user.id));

  const currentTierKey = employer.tier as keyof typeof EMPLOYER_TIERS;
  const currentTier = EMPLOYER_TIERS[currentTierKey] ?? EMPLOYER_TIERS.basic;
  const jobCount = employer._count.jobs;
  const jobLimit = currentTier.jobLimit;
  const isSubscribed = employer.stripeSubscriptionStatus === 'active';

  const tiers = Object.entries(EMPLOYER_TIERS).map(([key, config]) => ({
    key,
    ...config,
    isCurrent: key === currentTierKey,
    priceLabel: `$${(config.amount / 100).toLocaleString()}/mo`,
  }));

  return (
    <PortalPageFrame>
      <PageHeader
        title="Billing"
        subtitle="Manage your subscription, usage, and upgrades."
      />

      <div className="portal-card portal-card--flat portal-card--padded" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)', marginBottom: '0.25rem' }}>
              Current plan
            </p>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-on-surface)', margin: 0 }}>
              {currentTier.name}
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', margin: '0.25rem 0 0' }}>
              {isSubscribed ? 'Active subscription' : employer.stripeCustomerId ? 'Subscription not active' : 'No subscription'}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)', marginBottom: '0.25rem' }}>
              Job usage
            </p>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-on-surface)', margin: 0 }}>
              {jobCount} / {jobLimit === Infinity ? 'Unlimited' : jobLimit}
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))',
          gap: '1rem',
        }}
      >
        {tiers.map((tier) => (
          <div
            key={tier.key}
            className="portal-card portal-card--flat portal-card--padded"
            style={{
              borderLeft: tier.isCurrent ? '4px solid var(--color-accent)' : '4px solid transparent',
              opacity: tier.isCurrent ? 1 : 0.95,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <p style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-on-surface)', margin: 0 }}>
                {tier.name}
              </p>
              {tier.isCurrent && (
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '9999px',
                    background: 'var(--color-accent)',
                    color: '#fff',
                  }}
                >
                  Current
                </span>
              )}
            </div>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-on-surface)', margin: '0 0 0.5rem' }}>
              {tier.priceLabel}
            </p>
            <ul style={{ margin: '0 0 1rem', padding: 0, listStyle: 'none' }}>
              <li style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.25rem' }}>
                {tier.jobLimit === Infinity ? 'Unlimited active jobs' : `Up to ${tier.jobLimit} active job${tier.jobLimit !== 1 ? 's' : ''}`}
              </li>
              {tier.features.map((feature) => (
                <li key={feature} style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.25rem' }}>
                  {feature}
                </li>
              ))}
            </ul>
            {!tier.isCurrent && (
              <form
                action="/api/employer/checkout"
                method="POST"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await fetch('/api/employer/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tier: tier.key }),
                  });
                  const data = await res.json();
                  if (data.url) window.location.href = data.url;
                  else alert(data.error || 'Something went wrong');
                }}
              >
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  {currentTierKey === 'basic' ? 'Upgrade' : tier.key === 'basic' ? 'Downgrade' : 'Switch'}
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
    </PortalPageFrame>
  );
}
