import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import MobileBottomNav from '@/components/MobileBottomNav';
import PortalPageFrame from '@/components/portal/PortalPageFrame';

const WORKFLOW_LINKS = [
  { href: '/counselor/students', icon: 'groups', label: 'My students', desc: 'Roster and detail views' },
  { href: '/counselor/messages', icon: 'forum', label: 'Messages', desc: 'Portal threads with members' },
  { href: '/counselor/guide', icon: 'menu_book', label: 'Portal guide', desc: 'How the counselor workspace fits together' },
];

const REFERENCE_LINKS = [
  { href: '/programs', icon: 'school', label: 'Programs catalog', desc: 'Certificates and pathways we offer' },
  { href: '/how-it-works', icon: 'info', label: 'How it works', desc: 'Timeline from application to job search' },
  { href: '/faq', icon: 'help', label: 'FAQ', desc: 'Common questions for participants and partners' },
  { href: '/contact', icon: 'mail', label: 'Contact', desc: 'Reach the WorkforceAP team' },
];

function ResourceCard({ href, icon, label, desc }: { href: string; icon: string; label: string; desc: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="portal-card portal-card--flat portal-card--padded-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'background-color 0.15s' }}>
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '1.25rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1", flexShrink: 0 }}
        >
          {icon}
        </span>
        <div>
          <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>{label}</p>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{desc}</p>
        </div>
      </div>
    </Link>
  );
}

export default async function CounselorResourcesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/counselor/resources');

  if (!(await isCounselor(user.id)) && !(await isAdmin(user.id))) redirect('/dashboard');

  const admin = await isAdmin(user.id);

  return (
    <PortalPageFrame>
      {/* Mobile View */}
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        <PageHeader
          title="Resources"
          subtitle="Program context, member-facing pages, and tools you use most often in sessions."
        />

        <section style={{ marginBottom: '1.75rem' }}>
          <h2 className="portal-section-title" style={{ marginBottom: '0.75rem' }}>
            Counseling workflow
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {WORKFLOW_LINKS.map((link) => (
              <ResourceCard key={link.href} {...link} />
            ))}
          </div>
        </section>

        <section style={{ marginBottom: '1.75rem' }}>
          <h2 className="portal-section-title" style={{ marginBottom: '0.75rem' }}>
            Member-facing reference
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {REFERENCE_LINKS.map((link) => (
              <ResourceCard key={link.href} {...link} />
            ))}
          </div>
        </section>

        {admin ? (
          <section style={{ marginBottom: '1.75rem' }}>
            <h2 className="portal-section-title" style={{ marginBottom: '0.75rem' }}>
              Admin
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <ResourceCard href="/admin/members" icon="manage_accounts" label="Members" desc="Admin member management" />
              <ResourceCard href="/admin/messages" icon="mark_email_unread" label="Portal messages" desc="All portal message threads" />
            </div>
          </section>
        ) : null}

        <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem', maxWidth: '40rem', lineHeight: 1.6, padding: '0 1rem' }}>
          <Link href="/dashboard/help">Help &amp; support</Link> for account and access issues.
        </p>
        <MobileBottomNav variant="counselor" />
      </div>

      {/* Desktop View */}
      <div className="wa-hidden wa-md:wa-block">
        <PageHeader
          title="Resources"
          subtitle="Program context, member-facing pages, and tools you use most often in sessions."
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
          <section>
            <h2 className="portal-section-title" style={{ marginBottom: '0.75rem' }}>
              Counseling workflow
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {WORKFLOW_LINKS.map((link) => (
                <ResourceCard key={link.href} {...link} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="portal-section-title" style={{ marginBottom: '0.75rem' }}>
              Member-facing reference
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {REFERENCE_LINKS.map((link) => (
                <ResourceCard key={link.href} {...link} />
              ))}
            </div>
          </section>
        </div>

        {admin ? (
          <section style={{ marginBottom: '1.75rem', marginTop: '1.5rem' }}>
            <h2 className="portal-section-title" style={{ marginBottom: '0.75rem' }}>
              Admin
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '400px' }}>
              <ResourceCard href="/admin/members" icon="manage_accounts" label="Members" desc="Admin member management" />
              <ResourceCard href="/admin/messages" icon="mark_email_unread" label="Portal messages" desc="All portal message threads" />
            </div>
          </section>
        ) : null}

        <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem', maxWidth: '40rem', lineHeight: 1.6, marginTop: '1.5rem' }}>
          <Link href="/dashboard/help">Help &amp; support</Link> for account and access issues.
        </p>
      </div>
    </PortalPageFrame>
  );
}
