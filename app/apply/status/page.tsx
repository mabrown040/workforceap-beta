import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import LocalizedLink from '@/components/LocalizedLink';
import Footer from '@/components/Footer';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import ApplyStatusClient from './ApplyStatusClient';
import { getTranslations } from 'next-intl/server';
import '../apply-funnel-depth.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('apply');
  return buildPageMetadataAsync({
    title: t('statusMetaTitle'),
    description: t('statusMetaDescription'),
    path: '/apply/status',
  });
}

export default async function ApplyStatusPage() {
  const user = await getUser();
  if (user) redirect('/dashboard');

  const t = await getTranslations('apply');

  return (
    <div className="inner-page mdx afd-page">
      <section className="page-hero afd-hero-wrap">
        <div className="page-hero-content mdx-stage">
          <span className="mdx-pill">{t('heroLabel')}</span>
          <h1><span className="mdx-grad-accent">{t('statusHeroTitle')}</span></h1>
          <p>{t('statusHeroSubtitle')}</p>
        </div>
      </section>

      <section className="content-section afd-band">
        <div className="container" style={{ maxWidth: '560px' }}>
          <div className="mdx-card afd-surface">
            <ApplyStatusClient />
          </div>
          <p className="afd-footnote">
            <LocalizedLink href="/apply">{t('statusFooterApply')}</LocalizedLink>
            {' · '}
            <LocalizedLink href="/contact">{t('statusFooterContact')}</LocalizedLink>
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
