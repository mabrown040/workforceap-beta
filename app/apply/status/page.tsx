import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import LocalizedLink from '@/components/LocalizedLink';
import Footer from '@/components/Footer';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import ApplyStatusClient from './ApplyStatusClient';
import { getTranslations } from 'next-intl/server';

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
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <h1>{t('statusHeroTitle')}</h1>
          <p>{t('statusHeroSubtitle')}</p>
        </div>
      </section>

      <section className="content-section">
        <div className="container" style={{ maxWidth: '560px' }}>
          <ApplyStatusClient />
          <p style={{ marginTop: '1.5rem', fontSize: '0.95rem' }}>
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
