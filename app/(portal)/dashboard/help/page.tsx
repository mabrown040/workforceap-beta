import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import PortalBreadcrumb from '@/components/portal/PortalBreadcrumb';
import MobileBottomNav from '@/components/MobileBottomNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'Help & Support',
  description: 'Get support and request access to member benefits.',
  path: '/dashboard/help',
});

const HELP_ITEMS = [
  {
    icon: 'school',
    title: 'Coursera Access',
    body: 'Request access to professional certificate courses included through your WorkforceAP membership.',
  },
  {
    icon: 'support_agent',
    title: 'Talk to your counselor',
    body: 'Your counselor is your main point of contact. Message them directly from the Messages page for any support.',
    href: '/dashboard/messages',
    cta: 'Open messages',
  },
  {
    icon: 'auto_awesome',
    title: 'AI Tools',
    body: 'Use our suite of AI-powered tools to build your resume, prep for interviews, and match to jobs.',
    href: '/dashboard/ai-tools',
    cta: 'Open AI tools',
  },
];

export default async function DashboardHelpPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/help');

  return (
    <>
      <div style={{ maxWidth: '52rem', margin: '0 auto', padding: '0 1rem 4rem' }}>
        {/* Compact header */}
        <nav style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
          <PortalBreadcrumb
            items={[
              { href: '/dashboard', label: 'Dashboard' },
              { label: 'Help & Support' },
            ]}
          />
        </nav>

        <header style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-accent)', marginBottom: '0.5rem' }}>
            Support
          </p>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2rem)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--color-on-surface)', marginBottom: '0.5rem', lineHeight: 1.2 }}>
            Help & Support
          </h1>
          <p style={{ fontSize: '0.9375rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
            Questions or need access to a benefit? Here&rsquo;s how to get help.
          </p>
        </header>

        {/* Request benefit access */}
        <section style={{ marginBottom: '2rem' }}>
          <div
            className="portal-card portal-card--flat"
            style={{ padding: '1.5rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.625rem',
                  background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '1.25rem' }} aria-hidden="true">redeem</span>
              </div>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '0.5rem' }}>
                  Request Benefit Access
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6, marginBottom: '0.75rem' }}>
                  To request access to Coursera or other member benefits, contact your WorkforceAP counselor or email{' '}
                  <a href="mailto:info@workforceap.org" style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none' }}>
                    info@workforceap.org
                  </a>{' '}
                  with your name and the benefit you&rsquo;d like to request.
                </p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5, margin: 0 }}>
                  We&rsquo;ll process your request and follow up within 2–3 business days.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Quick links */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>
            Quick links
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {HELP_ITEMS.map((item) => (
              <div key={item.title} className="portal-card portal-card--flat" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <div
                    style={{
                      width: '2.25rem',
                      height: '2.25rem',
                      borderRadius: '0.5rem',
                      background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '1.125rem' }} aria-hidden="true">{item.icon}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '0.25rem' }}>{item.title}</h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.55, marginBottom: item.href ? '0.75rem' : 0 }}>{item.body}</p>
                    {item.href && (
                      <Link
                        href={item.href}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-accent)', textDecoration: 'none' }}
                      >
                        {item.cta}
                        <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }} aria-hidden="true">arrow_forward</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <div
          style={{
            padding: '1.5rem',
            background: 'color-mix(in srgb, var(--color-accent) 6%, transparent)',
            borderRadius: '0.875rem',
            border: '1px solid color-mix(in srgb, var(--color-accent) 15%, transparent)',
          }}
        >
          <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-on-surface)', marginBottom: '0.25rem' }}>
            Still need help?
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6, margin: 0 }}>
            Message your counselor — they&rsquo;re your fastest path to answers.{' '}
            <Link href="/dashboard/messages" style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none' }}>
              Send a message →
            </Link>
          </p>
        </div>
      </div>

      <MobileBottomNav variant="portal" />
    </>
  );
}
