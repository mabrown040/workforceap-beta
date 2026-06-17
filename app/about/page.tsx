import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import PageHero from '@/components/PageHero';
import { getTranslations } from 'next-intl/server';

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
    <>
      <PageHero title={t('heading')} subtitle={t('subheading')} />
      <section className="content-section">
        <div className="container" style={{ maxWidth: '860px' }}>
          <p>
            WorkforceAP is dedicated to advancing careers and connecting skilled individuals with
            meaningful employment opportunities. Our mission is to bridge the gap between education
            and industry, ensuring that every participant is ready for the demands of the modern
            workforce.
          </p>
          <p>
            With over 25 years of workforce development leadership, we provide employer-aligned
            training, comprehensive career support, and funded pathways for qualifying members. Our
            programs are built around real industry needs—so graduates are job-ready from day one.
          </p>
        </div>
      </section>
      <Footer />
      <MobileBottomNav variant="marketing" />
    </>
  );
}
