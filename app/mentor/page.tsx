import LocalizedLink from '@/components/LocalizedLink';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ClipboardList, FileText, Handshake, Globe } from 'lucide-react';
import { buildPageMetadataAsync } from '@/app/seo';
import { CTABand, SectionHeader, ValueCard } from '@/components/marketing/ui';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('marketing.mentor');
  return buildPageMetadataAsync({
    title: t('title'),
    description: t('description'),
    path: '/mentor',
  });
}

export default async function BecomeMentorPage() {
  const t = await getTranslations('marketing.mentor');
  return (
    <main style={{ background: 'var(--color-surface)', minHeight: '100vh' }}>
      {/* ── Mentor invitation banner ── */}
      <section
        aria-label="Mentor waitlist"
        style={{
          background: 'color-mix(in srgb, var(--color-accent) 6%, white)',
          borderBottom: '1px solid color-mix(in srgb, var(--color-accent) 18%, var(--outline-variant))',
          padding: '1.5rem clamp(1rem, 4vw, 2rem)',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-accent-dark)' }}>
              {t('waitlistEyebrow')}
            </p>
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.95rem', color: 'var(--color-on-surface)', lineHeight: 1.5 }}>
              {t('waitlistCopy')}
            </p>
          </div>
          <LocalizedLink href="/mentor/apply" className="btn btn-primary btn-small" style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
            {t('waitlistCta')}
          </LocalizedLink>
        </div>
      </section>

      {/* Hero */}
      <CTABand
        variant="dark"
        headline={t('heroHeadline')}
        subheadline={t('heroSubheadline')}
        primaryAction={
          <LocalizedLink
            href="/mentor/apply"
            className="btn"
            style={{ background: "#fff", color: "var(--color-accent)", fontWeight: 700 }}
          >
            {t('heroCta')}
          </LocalizedLink>
        }
      />

      {/* Benefits */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '3rem 2rem' }}>
        <SectionHeader
          eyebrow={t('benefitsEyebrow')}
          title={t('benefitsTitle')}
          align="center"
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
          {[
            { icon: <ClipboardList size={30} aria-hidden />, title: t('benefit1Title'), desc: t('benefit1Desc') },
            { icon: <FileText size={30} aria-hidden />, title: t('benefit2Title'), desc: t('benefit2Desc') },
            { icon: <Handshake size={30} aria-hidden />, title: t('benefit3Title'), desc: t('benefit3Desc') },
            { icon: <Globe size={30} aria-hidden />, title: t('benefit4Title'), desc: t('benefit4Desc') },
          ].map((b) => (
            <ValueCard key={b.title} icon={b.icon} title={b.title} description={b.desc} />
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <LocalizedLink href="/mentor/apply" className="btn btn-primary">
            {t('applyCta')}
          </LocalizedLink>
        </div>
      </section>
    </main>
  );
}
