import { getTranslations } from 'next-intl/server';
import PageHero from '@/components/PageHero';
import { buildPageMetadataAsync } from '@/app/seo';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('marketing.about');
  return buildPageMetadataAsync({
    title: t('title'),
    description: t('description'),
    path: '/about',
  });
}

export default async function AboutPage() {
  const t = await getTranslations('marketing.about');

  return (
    <div className="inner-page">
      <PageHero
        title={t('heading')}
        subtitle={t('subheading')}
      />
      <section className="content-section">
        <div className="container" style={{ maxWidth: '860px' }}>
            <p>
                WorkforceAP is dedicated to advancing careers and connecting skilled individuals with meaningful employment opportunities. Our mission is to bridge the gap between education and industry, ensuring that every participant is ready for the demands of the modern workforce.
            </p>
        </div>
      </section>
    </div>
  );
}
