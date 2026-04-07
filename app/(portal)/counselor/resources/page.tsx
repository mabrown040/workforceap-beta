import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import MobileBottomNav from '@/components/MobileBottomNav';
import PortalPageFrame from '@/components/portal/PortalPageFrame';

export default async function CounselorResourcesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/counselor/resources');

  if (!(await isCounselor(user.id)) && !(await isAdmin(user.id))) redirect('/dashboard');

  const admin = await isAdmin(user.id);

  return (
    <PortalPageFrame>
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        <PageHeader
          title="Resources"
          subtitle="Program context, member-facing pages, and tools you use most often in sessions."
        />

      <section style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}>
          Counseling workflow
        </h2>
        <ul style={{ lineHeight: 1.85, paddingLeft: '1.25rem', margin: 0 }}>
          <li>
            <Link href="/counselor/students">My students</Link> — roster and detail
          </li>
          <li>
            <Link href="/counselor/messages">Messages</Link> — portal threads with members
          </li>
          <li>
            <Link href="/counselor/guide">Portal guide</Link> — how the counselor workspace fits together
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}>
          Member-facing reference
        </h2>
        <ul style={{ lineHeight: 1.85, paddingLeft: '1.25rem', margin: 0 }}>
          <li>
            <Link href="/programs">Programs catalog</Link>
          </li>
          <li>
            <Link href="/how-it-works">How it works</Link>
          </li>
          <li>
            <Link href="/faq">FAQ</Link>
          </li>
          <li>
            <Link href="/contact">Contact WorkforceAP</Link>
          </li>
        </ul>
      </section>

      {admin ? (
        <section style={{ marginBottom: '1.75rem' }}>
          <h2 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}>
            Admin
          </h2>
          <ul style={{ lineHeight: 1.85, paddingLeft: '1.25rem', margin: 0 }}>
            <li>
              <Link href="/admin/members">Members</Link>
            </li>
            <li>
              <Link href="/admin/messages">Portal messages</Link>
            </li>
          </ul>
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
        <section style={{ marginBottom: '1.75rem' }}>
          <h2 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}>
            Counseling workflow
          </h2>
          <ul style={{ lineHeight: 1.85, paddingLeft: '1.25rem', margin: 0 }}>
            <li>
              <Link href="/counselor/students">My students</Link> — roster and detail
            </li>
            <li>
              <Link href="/counselor/messages">Messages</Link> — portal threads with members
            </li>
            <li>
              <Link href="/counselor/guide">Portal guide</Link> — how the counselor workspace fits together
            </li>
          </ul>
        </section>

        <section style={{ marginBottom: '1.75rem' }}>
          <h2 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}>
            Member-facing reference
          </h2>
          <ul style={{ lineHeight: 1.85, paddingLeft: '1.25rem', margin: 0 }}>
            <li>
              <Link href="/programs">Programs catalog</Link>
            </li>
            <li>
              <Link href="/how-it-works">How it works</Link>
            </li>
            <li>
              <Link href="/faq">FAQ</Link>
            </li>
            <li>
              <Link href="/contact">Contact WorkforceAP</Link>
            </li>
          </ul>
        </section>
      </div>

      {admin ? (
        <section style={{ marginBottom: '1.75rem', marginTop: '1.5rem' }}>
          <h2 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}>
            Admin
          </h2>
          <ul style={{ lineHeight: 1.85, paddingLeft: '1.25rem', margin: 0 }}>
            <li>
              <Link href="/admin/members">Members</Link>
            </li>
            <li>
              <Link href="/admin/messages">Portal messages</Link>
            </li>
          </ul>
        </section>
      ) : null}

      <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem', maxWidth: '40rem', lineHeight: 1.6, marginTop: '1.5rem' }}>
        <Link href="/dashboard/help">Help &amp; support</Link> for account and access issues.
      </p>
    </div>
    </PortalPageFrame>
  );
}
