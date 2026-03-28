import type { Metadata } from 'next';
import { Suspense } from 'react';
import Footer from '@/components/Footer';
import MainNav from '@/components/MainNav';
import ApplyEligibilityClient from './ApplyEligibilityClient';
import ApplyPageSkeleton from './ApplyPageSkeleton';
import ApplyProgramIntro from '@/components/apply/ApplyProgramIntro';
import ApplyRefCapture from '@/components/apply/ApplyRefCapture';
import { buildApplyPageMetadata, getProgramBySlug, resolveApplyProgramSlug } from '@/lib/apply/applyProgramPage';

type PageProps = { searchParams?: Promise<{ program?: string }> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = searchParams ? await searchParams : {};
  return buildApplyPageMetadata(sp.program);
}

export default async function ApplyPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const programSlug = resolveApplyProgramSlug(sp.program);
  const program = programSlug ? getProgramBySlug(programSlug) : undefined;

  return (
    <div style={{ backgroundColor: '#141313', minHeight: '100vh', color: '#e6e1e1' }}>
      <MainNav />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px 80px' }}>
        {/* Page header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.75rem)', fontWeight: 800, color: '#fff', marginBottom: '0.75rem' }}>
            Start Your Application
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#a8a3a3', maxWidth: '560px', margin: '0 auto' }}>
            No experience required. Free for members.
          </p>

          {/* Step progress indicator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '32px' }}>
            {['Basic Info', 'Background', 'Program Interest'].map((label, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: i === 0 ? '#ad2c4d' : 'rgba(255,255,255,0.08)',
                    border: `2px solid ${i === 0 ? '#ad2c4d' : 'rgba(255,255,255,0.15)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.85rem', color: i === 0 ? '#fff' : '#a8a3a3'
                  }}>{i + 1}</div>
                  <span style={{ fontSize: '0.75rem', color: i === 0 ? '#e6e1e1' : '#6b6868', whiteSpace: 'nowrap' }}>{label}</span>
                </div>
                {i < 2 && (
                  <div style={{ width: '60px', height: '2px', background: 'rgba(255,255,255,0.08)', marginBottom: '20px' }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}
          className="apply-two-col">
          <style>{`
            @media (min-width: 900px) {
              .apply-two-col { grid-template-columns: 3fr 2fr !important; }
            }
          `}</style>

          {/* LEFT: Form */}
          <div>
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '40px'
            }}>
              {program ? <ApplyProgramIntro programSlug={program.slug} /> : null}
              <Suspense fallback={<div style={{ padding: '1rem', color: '#a8a3a3' }}>Loading...</div>}>
                <ApplyRefCapture />
              </Suspense>
              <Suspense fallback={<ApplyPageSkeleton />}>
                <ApplyEligibilityClient />
              </Suspense>
            </div>
          </div>

          {/* RIGHT: Benefits card */}
          <div>
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '40px',
              position: 'sticky',
              top: '24px'
            }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: 'rgba(173,44,77,0.15)', border: '1px solid rgba(173,44,77,0.3)',
                borderRadius: '100px', padding: '6px 16px', marginBottom: '20px'
              }}>
                <span style={{ color: '#ad2c4d', fontWeight: 700, fontSize: '0.85rem' }}>✓ FREE FOR MEMBERS</span>
              </div>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: '12px', lineHeight: 1.3 }}>
                No-cost training and career support
              </h2>
              <p style={{ color: '#a8a3a3', fontSize: '0.95rem', marginBottom: '28px', lineHeight: 1.6 }}>
                WorkforceAP connects qualifying members with funded programs — no tuition, no hidden fees.
              </p>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  'Industry-recognized certifications',
                  'Dedicated career counselor',
                  'AI-powered resume & job tools',
                  'Job placement support',
                  'Flexible online or in-person options',
                  'No prior experience required'
                ].map((item) => (
                  <li key={item} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '0.95rem', color: '#c8c3c3' }}>
                    <span style={{ color: '#ad2c4d', fontWeight: 700, marginTop: '1px', flexShrink: 0 }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>

              {/* Stat callout */}
              <div style={{
                background: 'rgba(173,44,77,0.08)',
                border: '1px solid rgba(173,44,77,0.2)',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ad2c4d', lineHeight: 1 }}>84%</div>
                <div style={{ fontSize: '0.9rem', color: '#a8a3a3', marginTop: '6px', lineHeight: 1.4 }}>
                  of members land jobs<br />within 90 days
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
