import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { PROGRAMS } from '@/lib/content/programs';
import { PIPELINE_STAGE_LABELS } from '@/lib/pipeline/stage';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import PageHeader from '@/components/portal/PageHeader';
import AdminExportForm from './AdminExportForm';

export const metadata: Metadata = buildPageMetadata({
  title: 'Export Data',
  description: 'Export member training data for state reporting and compliance.',
  path: '/admin/exports',
});

export default async function AdminExportsPage() {
  const user = await getUser();
  if (!user) redirect('/login');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const programs = PROGRAMS.map((p) => ({ slug: p.slug, title: p.title }));
  const stages = Object.entries(PIPELINE_STAGE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <PortalPageFrame>
      <div className="wa-hidden md:wa-block" style={{ marginBottom: '2rem' }}>
        <PageHeader
          title="Export Data"
          subtitle="Download member training data as CSV. Filter by state, program, pipeline stage, and more."
        />
      </div>

      <div className="md:wa-hidden" style={{ padding: '1.5rem 1.5rem 1rem' }}>
        <p className="wa-text-[11px] wa-uppercase wa-tracking-[0.15em] wa-font-bold" style={{ color: 'var(--color-on-surface-variant)', marginBottom: '0.25rem' }}>Admin</p>
        <h1 className="wa-text-2xl wa-font-extrabold wa-tracking-tight" style={{ color: 'var(--color-on-surface)' }}>
          Export Data
        </h1>
      </div>

      <div style={{ padding: '0 1.5rem' }}>
        {/* Member Training Export */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div className="portal-card portal-card--flat" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ padding: '0.5rem', background: 'rgba(173,44,77,0.1)', borderRadius: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '1.25rem' }} aria-hidden="true">download</span>
              </div>
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-on-surface)', margin: 0 }}>
                  Member Training Report
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', margin: '0.125rem 0 0' }}>
                  Demographics, enrollment, course progress, Coursera access, certifications, and placements.
                </p>
              </div>
            </div>

            <AdminExportForm programs={programs} stages={stages} />
          </div>
        </section>

        {/* Program Catalog Export (existing TWC) */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div className="portal-card portal-card--flat" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ padding: '0.5rem', background: 'rgba(59,130,246,0.1)', borderRadius: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ color: '#3b82f6', fontSize: '1.25rem' }} aria-hidden="true">school</span>
              </div>
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-on-surface)', margin: 0 }}>
                  Program Catalog
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', margin: '0.125rem 0 0' }}>
                  All active programs with costs, duration, and certifications. Used for state agency submissions.
                </p>
              </div>
            </div>
            <a
              href="/api/admin/programs/export-twc"
              download
              className="btn btn-outline"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden="true">download</span>
              Download Program Catalog CSV
            </a>
          </div>
        </section>

        {/* What's included explainer */}
        <section style={{ marginBottom: '6rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-on-surface)', marginBottom: '1rem' }}>
            What&rsquo;s in the Member Training Report?
          </h3>
          <div className="portal-grid-3col" style={{ gap: '1rem' }}>
            {[
              { icon: 'person', title: 'Demographics', items: 'Name, email, phone, state, city, zip, DOB, education, employment, veteran status, ethnicity' },
              { icon: 'school', title: 'Training Progress', items: 'Program enrolled, enrollment date, courses completed, completion %, individual course names, funding source' },
              { icon: 'workspace_premium', title: 'Outcomes & Compliance', items: 'Coursera access status, assessment score, WIOA signal & review status, certifications earned, placement details (employer, role, salary)' },
            ].map((col) => (
              <div key={col.title} style={{ padding: '1rem', background: 'var(--surface-container)', borderRadius: '0.75rem' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '1.25rem', marginBottom: '0.5rem', display: 'block' }} aria-hidden="true">{col.icon}</span>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface)', marginBottom: '0.375rem' }}>{col.title}</h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5, margin: 0 }}>{col.items}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PortalPageFrame>
  );
}
