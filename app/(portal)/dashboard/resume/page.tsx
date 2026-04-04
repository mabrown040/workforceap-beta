import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import ResumeClient from './ResumeClient';
import MobileBottomNav from '@/components/MobileBottomNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'My Resume',
  description: 'Upload, view, and AI-generate your professional resume.',
  path: '/dashboard/resume',
});

export default async function DashboardResumePage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/resume');

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: {
      resumeOriginalPath: true,
      resumeEnhancedPath: true,
      user: {
        select: {
          fullName: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  const fields = {
    name: profile?.user?.fullName ?? '',
    email: profile?.user?.email ?? '',
    phone: profile?.user?.phone ?? '',
  };
  const completeness = Object.values(fields).filter(Boolean).length * 20;

  return (
    <>
      {/* ── Mobile ── */}
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        <div
          style={{
            padding: '1rem 1rem 1.25rem',
            borderBottom: '1px solid var(--surface-container-high)',
            background: 'var(--surface-container-low)',
          }}
        >
          <Link
            href="/dashboard/ai-tools"
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
            ← AI Tools
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'var(--surface-container-highest)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.2rem', color: 'var(--color-accent)' }}>description</span>
            </div>
            <div>
              <h1 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>
                My Resume
              </h1>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-on-surface-variant)', margin: '0.1rem 0 0' }}>
                Upload, view, and generate your professional resume.
              </p>
            </div>
          </div>
        </div>

        <div style={{ padding: '1rem' }}>
          <ResumeClient
            completeness={completeness}
            witData={{ name: fields.name, email: fields.email, phone: fields.phone, recentEmployer: '', targetJob: '', skills: '' }}
            hasOriginal={!!profile?.resumeOriginalPath}
            hasEnhanced={!!profile?.resumeEnhancedPath}
          />
        </div>
        <MobileBottomNav variant="portal" />
      </div>

      {/* ── Desktop ── */}
      <div className="wa-hidden wa-md:wa-block" style={{ background: 'var(--color-surface)', minHeight: '100vh' }}>
        <div
          style={{
            padding: '1.25rem 2rem 1.5rem',
            borderBottom: '1px solid var(--surface-container-high)',
            background: 'var(--surface-container-low)',
          }}
        >
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.8rem',
              color: 'var(--color-on-surface-variant)',
              marginBottom: '1rem',
            }}
          >
            <Link href="/dashboard/ai-tools" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 500 }}>
              Career Suite
            </Link>
            <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>chevron_right</span>
            <span style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>My Resume</span>
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-dark, #8b1a3a))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.35rem', color: '#fff' }}>description</span>
            </div>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>
                My Resume
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', margin: '0.15rem 0 0' }}>
                Upload your resume, view it inline, or generate one from your profile.
              </p>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem' }}>
          <ResumeClient
            completeness={completeness}
            witData={{ name: fields.name, email: fields.email, phone: fields.phone, recentEmployer: '', targetJob: '', skills: '' }}
            hasOriginal={!!profile?.resumeOriginalPath}
            hasEnhanced={!!profile?.resumeEnhancedPath}
          />
        </div>
      </div>
    </>
  );
}
