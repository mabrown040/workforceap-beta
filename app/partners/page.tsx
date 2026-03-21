import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import { Handshake, Users, Award, ArrowRight, HelpCircle } from 'lucide-react';
import PageHero from '@/components/PageHero';
import PhotoHighlight from '@/components/PhotoHighlight';
import Footer from '@/components/Footer';

export const metadata: Metadata = buildPageMetadata({
  title: 'Partners',
  description:
    'Partner with WorkforceAP to refer talent, support Austin-area career training, and connect with certified graduates ready for hire.',
  path: '/partners',
});

export default function PartnersPage() {
  return (
    <div className="inner-page">
      <PageHero
        title="Partner With Us"
        subtitle="Refer talent, support career training, and connect with certified graduates ready for hire."
      />

      <PhotoHighlight
        imageUrl="https://images.unsplash.com/photo-1552664730-d307ca884978?w=1400&q=80"
        label="Partnership"
        title="Building a Skilled Workforce Together"
        description="WorkforceAP partners with employers, community organizations, and service providers to deliver free career training and certifications to Austin-area residents."
      />

      <section className="content-section">
        <div className="container">
          <h2 className="section-title animate-on-scroll">Partner Benefits</h2>
          <div className="values-grid" style={{ marginBottom: '3rem' }}>
            {[
              { Icon: Users, name: 'Access to Talent', desc: 'Connect with job-ready graduates who hold industry certifications from Google, IBM, AWS, Microsoft, and CompTIA.' },
              { Icon: Award, name: 'Quality Assurance', desc: 'Every graduate completes workforce readiness training, resume support, and interview prep before entering the job market.' },
              { Icon: Handshake, name: 'Community Impact', desc: 'Strengthen the Austin workforce and support economic mobility for underserved residents and adult learners.' },
            ].map(({ Icon, name, desc }) => (
              <div key={name} className="value-card animate-on-scroll">
                <div className="value-icon"><Icon size={28} className="text-current" /></div>
                <h3>{name}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>

          <h2 className="section-title animate-on-scroll">How Referrals Work</h2>
          <div className="two-col" style={{ marginBottom: '3rem' }}>
            <div>
              <p>Partners can refer individuals who may benefit from our free career training programs. Our team reviews each referral and reaches out to the candidate within 24–48 hours.</p>
              <ul style={{ marginTop: '1rem', paddingLeft: '1.25rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>Submit a referral through our partner portal or contact form</li>
                <li style={{ marginBottom: '0.5rem' }}>We contact the candidate and walk them through the application process</li>
                <li style={{ marginBottom: '0.5rem' }}>Accepted members receive full support: training, certifications, and job placement assistance</li>
                <li>Partners receive updates on referred candidates who complete programs</li>
              </ul>
            </div>
            <div>
              <p>Referrals work best when the candidate is motivated to complete training and is interested in careers in technology, healthcare, manufacturing, or skilled trades.</p>
              <Link href="/contact" className="link-arrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                Contact us to discuss referrals <ArrowRight size={18} />
              </Link>
            </div>
          </div>

          <h2 className="section-title animate-on-scroll">Become a Partner</h2>
          <div className="cta-section animate-on-scroll" style={{ background: 'var(--color-light)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-gray-200)' }}>
            <p style={{ marginBottom: '1.5rem' }}>We welcome partnerships with employers, workforce boards, community organizations, and service providers. Whether you want to refer candidates, hire graduates, or support our mission, we&apos;d love to connect.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              <Link href="/contact?topic=partnership" className="btn btn-primary">Get in Touch</Link>
              <Link href="/programs" className="btn btn-outline">View Our Programs</Link>
            </div>
          </div>

          <h2 className="section-title animate-on-scroll" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '3rem' }}>
            <HelpCircle size={24} className="text-current" />
            Partner FAQ
          </h2>
          <div className="faq-list" style={{ maxWidth: '720px' }}>
            <details className="faq-item">
              <summary>Who can become a partner?</summary>
              <p>Employers, workforce development boards, community organizations, social service agencies, and educational institutions can partner with WorkforceAP to refer candidates or hire graduates.</p>
            </details>
            <details className="faq-item">
              <summary>Is there a cost to refer candidates?</summary>
              <p>No. Referrals are free. We welcome partners who want to connect individuals in their network with our free career training programs.</p>
            </details>
            <details className="faq-item">
              <summary>How do I refer someone?</summary>
              <p>Contact us at info@workforceap.org or (512) 777-1808 with the candidate&apos;s name and contact information. You can also use our contact form and select &quot;Partnership&quot; as the topic.</p>
            </details>
            <details className="faq-item">
              <summary>Can I hire WorkforceAP graduates?</summary>
              <p>Yes. We actively connect employers with job-ready graduates. Reach out to discuss your hiring needs and we can share candidate profiles and schedule introductions.</p>
            </details>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
