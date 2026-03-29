import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getActivePrograms } from '@/lib/platform/programCatalog';
import JobForm from '@/components/employer/JobForm';
import PageHeader from '@/components/portal/PageHeader';
import MobileBottomNav from '@/components/MobileBottomNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'Post New Job',
  description: 'Create a new job posting.',
  path: '/employer/jobs/new',
});

export default async function NewJobPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/employer/jobs/new');

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) redirect('/employers');

  const employer = await prisma.employer.findUnique({
    where: { id: ctx.employerId },
    select: { companyName: true },
  });

  const active = await getActivePrograms();
  const programSlugs = active.map((p) => p.slug);

  return (
    <>
      {/* ── Mobile-only (< md) ── */}
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        {/* Header */}
        <div
          style={{
            padding: '1rem 1rem 1.25rem',
            borderBottom: '1px solid var(--surface-container-high)',
            background: 'var(--surface-container-low)',
          }}
        >
          <Link
            href="/employer/jobs"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.85rem',
              color: 'var(--color-accent)',
              textDecoration: 'none',
              marginBottom: '0.75rem',
              fontWeight: 500,
            }}
          >
            ← My Jobs
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-dark, #8b1a3a))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.2rem', color: '#fff' }}>add_circle</span>
            </div>
            <div>
              <h1 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>
                Post New Job
              </h1>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-on-surface-variant)', margin: '0.1rem 0 0' }}>
                Save as draft or submit for admin review.
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable form */}
        <div style={{ padding: '1rem', overflowY: 'auto' }}>
          <div className="stitch-card" style={{ padding: '1rem', borderRadius: 12 }}>
            <JobForm
              companyName={employer?.companyName ?? ''}
              programSlugs={programSlugs}
            />
          </div>
        </div>

        <MobileBottomNav variant="employer" />
      </div>

      {/* ── Desktop (≥ md) ── */}
      <div className="wa-hidden wa-md:wa-block">
        <div style={{ marginBottom: '1.5rem' }}>
          <Link href="/employer/jobs" style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>
            ← Back to My Jobs
          </Link>
        </div>
        <PageHeader
          title="Post New Job"
          subtitle="Create a job posting. Save as draft or submit for admin review."
        />
        <JobForm
          companyName={employer?.companyName ?? ''}
          programSlugs={programSlugs}
        />
      </div>
    </>
  );
}
