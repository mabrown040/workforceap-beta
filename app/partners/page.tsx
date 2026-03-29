import type { Metadata } from 'next';
import Link from 'next/link';
import { Users, Briefcase, Landmark, Heart } from 'lucide-react';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import StitchHero from '@/components/marketing/StitchHero';
import StitchPage from '@/components/marketing/StitchPage';

export const metadata: Metadata = buildPageMetadata({
  title: 'Community & Employer Partners | Austin Workforce Development',
  description:
    'Partner with WorkforceAP: employers hire talent, referral orgs send candidates, workforce boards align, funders support scale.',
  path: '/partners',
});

const partnerTypes = [
  {
    icon: Briefcase,
    type: 'Employers',
    why: 'Access pre-screened, certified talent and share open roles without placement fees.',
    href: '/for-employers',
    label: 'Visit employer page',
  },
  {
    icon: Users,
    type: 'Referral organizations',
    why: 'Refer clients who need career training and get timely follow-up on outcomes.',
    href: '/contact?topic=partnership',
    label: 'Contact to refer',
  },
  {
    icon: Landmark,
    type: 'Workforce boards and agencies',
    why: 'Align participants to employer-recognized pathways while strengthening your local outcomes.',
    href: '/contact?topic=partnership',
    label: 'Discuss alignment',
  },
  {
    icon: Heart,
    type: 'Funders and supporters',
    why: 'Back an employer-aligned training model with measurable placement momentum and no participant debt.',
    href: '/contact?topic=partnership',
    label: 'Learn how to support',
  },
];

export default function PartnersPage() {
  return (
    <StitchPage>
      <StitchHero
        badge="Partnerships"
        title={
          <>
            Different partners,
            <br />
            <span className="stitch-title-highlight">clearer next steps</span>
          </>
        }
        description="This route now uses the same shell and surface system as the rest of the site so it feels like part of one product instead of an isolated marketing page."
      />

      <section className="stitch-section">
        <div className="stitch-grid-2">
          {partnerTypes.map(({ icon: Icon, type, why, href, label }) => (
            <article key={type} className="stitch-card">
              <Icon className="wa-text-[#ffb2bc]" size={26} />
              <h3 className="wa-text-2xl wa-font-bold wa-mt-4">{type}</h3>
              <p className="wa-mt-3">{why}</p>
              <div className="wa-mt-5">
                <Link href={href} className="btn btn-outline">{label}</Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <Footer />
    </StitchPage>
  );
}
